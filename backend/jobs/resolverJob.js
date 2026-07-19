import cron from 'node-cron'
import axios from 'axios'
import prisma from '../lib/prisma.js'
import contractManager from '../lib/contractManager.js'
import config from '../config/config.js'
import { recordAgentPurchase } from '../services/accessService.js'

let isRunning = false

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function getAgentEndpoint(agentId) {
  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { contractAgentId: Number(agentId) },
        { agentId: String(agentId) },
      ],
    },
    select: { endpoint: true, agentId: true, id: true },
  })
  return agent
}

async function pingAgentEndpoint(endpoint) {
  if (!endpoint) return false
  try {
    const res = await axios.get(`${endpoint}/health`, {
      timeout: 8000,
      validateStatus: (s) => s < 500,
    })
    return res.status < 400
  } catch {
    try {
      const res = await axios.get(endpoint, {
        timeout: 8000,
        validateStatus: (s) => s < 500,
      })
      return res.status < 400
    } catch {
      return false
    }
  }
}

async function updateDbTransactionStatus(txId, status, platformFee, creatorAmount) {
  try {
    // Find transaction by on-chain txId reference in metadata or by pending status + agentId
    // The pendingTx from contract has weiAmount, user, agentId — map to DB via agentId + user wallet
    const pTx = await contractManager.getPendingTransaction(txId)
    if (!pTx) return

    const agentContractId = Number(pTx.agentId)
    const userWallet = pTx.user?.toLowerCase()

    const dbTx = await prisma.transaction.findFirst({
      where: {
        callerWallet: userWallet,
        status: 'pending',
        agent: {
          contractAgentId: agentContractId,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!dbTx) {
      console.warn(`[RESOLVER] No DB transaction found for txId=${txId}, agentId=${agentContractId}, user=${userWallet}`)
      return
    }

    await prisma.transaction.update({
      where: { id: dbTx.id },
      data: {
        status,
        platformFee: platformFee ? platformFee.toString() : dbTx.platformFee,
        creatorAmount: creatorAmount ? creatorAmount.toString() : dbTx.creatorAmount,
      },
    })

    console.log(`[RESOLVER] DB tx ${dbTx.txHash} → ${status}`)
  } catch (err) {
    console.error('[RESOLVER] DB update error:', err.message)
  }
}

async function grantAgentAccess(txId) {
  try {
    const pTx = await contractManager.getPendingTransaction(txId)
    if (!pTx) return

    const agentContractId = Number(pTx.agentId)
    const userWallet = pTx.user?.toLowerCase()
    const period = Number(pTx.period) // 0=Monthly, 1=Yearly

    const agent = await prisma.agent.findFirst({
      where: { contractAgentId: agentContractId },
      select: { agentId: true, id: true },
    })

    if (!agent) {
      console.warn(`[RESOLVER] Agent not found for contractAgentId=${agentContractId}`)
      return
    }

    const durationMs = period === 1
      ? 365 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000

    const expiresAt = new Date(Date.now() + durationMs)

    await prisma.agentAccess.upsert({
      where: {
        agentId_userWallet: {
          agentId: agent.agentId,
          userWallet,
        },
      },
      update: {
        expiresAt,
        isLifetime: false,
      },
      create: {
        agentId: agent.agentId,
        userWallet,
        expiresAt,
        isLifetime: false,
      },
    })

    await recordAgentPurchase({
      agent,
      walletAddress: userWallet,
      txHash: `${txId.toString()}`,
      isLifetime: false,
      expiresAt,
    })

    console.log(`[RESOLVER] ✅ Access granted: agent=${agent.agentId}, user=${userWallet}, expires=${expiresAt.toISOString()}`)
  } catch (err) {
    console.error('[RESOLVER] grantAgentAccess error:', err.message)
  }
}

// ─────────────────────────────────────────────
// RESOLVE: Access Transaction
// ─────────────────────────────────────────────

async function resolveAccessTx(txId, pTx) {
  const agentRecord = await getAgentEndpoint(Number(pTx.agentId))

  if (!agentRecord?.endpoint) {
    console.warn(`[RESOLVER] No endpoint for agentId=${pTx.agentId} — refunding txId=${txId}`)
    await contractManager.refundTransaction(txId)
    await updateDbTransactionStatus(txId, 'failed', null, null)
    return
  }

  const alive = await pingAgentEndpoint(agentRecord.endpoint)

  if (alive) {
    console.log(`[RESOLVER] Agent alive, resolving access txId=${txId}`)
    try {
      await contractManager.resolveTransaction(txId)
    } catch (err) {
      console.error(`[RESOLVER] Error resolving on-chain txId=${txId}:`, err.message)
      // attempt to mark DB as failed so it doesn't remain stuck
      await updateDbTransactionStatus(txId, 'failed', null, null)
      return
    }

    // Calculate 80/20 split from weiAmount
    const weiAmount = BigInt(pTx.weiAmount || 0)
    const platformFee = (weiAmount * 20n) / 100n
    const creatorAmount = weiAmount - platformFee

    await grantAgentAccess(txId)
    await updateDbTransactionStatus(txId, 'confirmed', platformFee, creatorAmount)
    } else {
    console.warn(`[RESOLVER] Agent unreachable, refunding access txId=${txId}`)
    try {
      await contractManager.refundTransaction(txId)
    } catch (err) {
      console.error(`[RESOLVER] Error refunding on-chain txId=${txId}:`, err.message)
      await updateDbTransactionStatus(txId, 'failed', null, null)
      return
    }
    await updateDbTransactionStatus(txId, 'failed', null, null)

    // Revoke pre-granted access if any
    try {
      const userWallet = pTx.user?.toLowerCase()
      const agentContractId = Number(pTx.agentId)
      const agent = await prisma.agent.findFirst({
        where: { contractAgentId: agentContractId },
        select: { agentId: true },
      })
      if (agent) {
        await prisma.agentAccess.deleteMany({
          where: { agentId: agent.agentId, userWallet },
        })
        console.log(`[RESOLVER] Revoked pre-granted access for user=${userWallet}`)
      }
    } catch (err) {
      console.error('[RESOLVER] Access revoke error:', err.message)
    }
  }
}

// ─────────────────────────────────────────────
// RESOLVE: Comms Transaction
// ─────────────────────────────────────────────

async function resolveCommsTx(txId, pTx) {
  // For comms: the frontend/backend has already executed the agent task
  // before calling callAgent API. The escrow just needs to be resolved.
  // If the task was initiated from the API, we resolve. If not found/stale, refund.
  try {
    // Check if there's a confirmed comms message for this txId
    const commsMsg = await prisma.agentCommsMessage.findFirst({
      where: {
        callerWallet: pTx.user?.toLowerCase(),
        toAgentId: {
          in: await prisma.agent.findMany({
            where: { contractAgentId: Number(pTx.agentId) },
            select: { agentId: true },
          }).then(agents => agents.map(a => a.agentId)),
        },
        status: 'success',
        response: { not: null },
        createdAt: { gte: new Date(Number(pTx.timestamp) * 1000 - 5 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (commsMsg) {
      console.log(`[RESOLVER] Comms task confirmed, resolving txId=${txId}`)
      try {
        await contractManager.resolveTransaction(txId)
      } catch (err) {
        console.error(`[RESOLVER] Error resolving comms on-chain txId=${txId}:`, err.message)
        await updateDbTransactionStatus(txId, 'failed', null, null)
        return
      }

      const weiAmount = BigInt(pTx.weiAmount || 0)
      const platformFee = (weiAmount * 20n) / 100n
      const creatorAmount = weiAmount - platformFee

      await updateDbTransactionStatus(txId, 'confirmed', platformFee, creatorAmount)
    } else {
      // No matching comms record yet — skip for now and let a later resolver cycle
      // pick it up once the comms message has been written by the backend.
      console.warn(`[RESOLVER] No comms record found yet, skipping comms txId=${txId} for now`)
    }
  } catch (err) {
    console.error(`[RESOLVER] resolveCommsTx error txId=${txId}:`, err.message)
  }
}

// ─────────────────────────────────────────────
// TIMEOUT MONITOR
// ─────────────────────────────────────────────

async function notifyStaleTransactions() {
  // Find DB pending transactions older than 20 hours (warn before 24h timeout)
  const threshold = new Date(Date.now() - 20 * 60 * 60 * 1000)
  const staleTxs = await prisma.transaction.findMany({
    where: {
      status: 'pending',
      createdAt: { lte: threshold },
    },
    select: { txHash: true, callerWallet: true, agentId: true, createdAt: true },
    take: 50,
  })

  if (staleTxs.length > 0) {
    console.warn(`[RESOLVER] ⚠️ ${staleTxs.length} stale pending transactions (>20h). Users should call claimTimeoutRefund().`)
    for (const tx of staleTxs) {
      console.warn(`[RESOLVER]   → txHash=${tx.txHash}, agent=${tx.agentId}, caller=${tx.callerWallet}, created=${tx.createdAt.toISOString()}`)
    }
  }
}

// ─────────────────────────────────────────────
// MAIN RESOLVER LOOP
// ─────────────────────────────────────────────

async function runResolverCycle() {
  if (isRunning) {
    console.log('[RESOLVER] Already running, skipping...')
    return
  }

  isRunning = true

  try {
    await contractManager.init()

    if (contractManager.isMock) {
      console.log('[RESOLVER] ⚠️ Mock mode active — skipping resolver cycle (blockchain not connected)')
      return
    }

    console.log('[RESOLVER] ✅ Live mode — proceeding with resolver cycle')
    const txCounter = await contractManager.getTxCounter()
    if (!txCounter || txCounter === 0n) {
      console.log('[RESOLVER] No transactions on-chain yet')
      return
    }

    console.log(`[RESOLVER] Scanning ${txCounter} on-chain transactions...`)

    let resolved = 0
    let refunded = 0
    let skipped = 0

    for (let txId = 1n; txId <= txCounter; txId++) {
      try {
        const pTx = await contractManager.getPendingTransaction(txId)

        if (!pTx || Number(pTx.status) !== 0) {
          // 0=Pending, 1=Resolved, 2=Refunded — skip non-pending
          skipped++
          continue
        }

        const txType = Number(pTx.txType) // 0=Access, 1=Comms

        if (txType === 0) {
          // Access transaction
          await resolveAccessTx(txId, pTx)
          resolved++
        } else if (txType === 1) {
          // Comms transaction
          await resolveCommsTx(txId, pTx)
          resolved++
        } else {
          console.warn(`[RESOLVER] Unknown txType=${txType} for txId=${txId}`)
          skipped++
        }

        // Small delay between transactions to avoid RPC rate limits
        await new Promise(r => setTimeout(r, 300))

      } catch (err) {
        console.error(`[RESOLVER] Error processing txId=${txId}:`, err.message)
        skipped++
      }
    }

    console.log(`[RESOLVER] Cycle done — resolved: ${resolved}, skipped: ${skipped}`)

    // Check for stale transactions approaching 24h timeout
    await notifyStaleTransactions()

  } catch (err) {
    console.error('[RESOLVER] ❌ Resolver cycle failed:', err.message)
  } finally {
    isRunning = false
  }
}

// ─────────────────────────────────────────────
// EVENT LISTENER (real-time, complements polling)
// ─────────────────────────────────────────────

// function startTxPendingListener() {
//   if (contractManager.isMock) return

//   try {
//     contractManager.agentra.on('TxPending', async (txId, user, agentId, txType, weiAmount, event) => {
//       const id = BigInt(txId)
//       console.log(`[RESOLVER] 🔔 TxPending event: txId=${id}, type=${Number(txType)}, agent=${agentId}, user=${user}`)

//       // Small delay to let the transaction settle
//       await new Promise(r => setTimeout(r, 3000))

//       try {
//         const pTx = await contractManager.getPendingTransaction(id)
//         if (!pTx || Number(pTx.status) !== 0) return

//         if (Number(txType) === 0) {
//           await resolveAccessTx(id, pTx)
//         } else if (Number(txType) === 1) {
//           await resolveCommsTx(id, pTx)
//         }
//       } catch (err) {
//         console.error(`[RESOLVER] Event handler error for txId=${id}:`, err.message)
//       }
//     })

//     console.log('[RESOLVER] ✅ TxPending event listener active')
//   } catch (err) {
//     console.warn('[RESOLVER] Could not start event listener:', err.message)
//   }
// }

function startTxPendingListener() {
  // 0G RPC does not support eth_getFilterChanges (event filters).
  // Cron polling in runResolverCycle() handles all missed/pending transactions.
  console.log('[RESOLVER] ⚠️ Event listener skipped — 0G RPC lacks filter support. Cron polling active.')
}

// ─────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────

function startResolverJob() {
  const schedule = config.resolver?.cronSchedule || '*/2 * * * *' // Every 2 minutes
  console.log(`[RESOLVER JOB] Starting — schedule: ${schedule}`)

  cron.schedule(schedule, runResolverCycle)

  // Start real-time event listener
  startTxPendingListener()

  // Run once shortly after startup to catch any missed events
  setTimeout(runResolverCycle, 8000)
}

export { startResolverJob, runResolverCycle }