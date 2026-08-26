import prisma from '../lib/prisma.js'
import contractManager from '../lib/contractManager.js'
import config from '../config/config.js'


export const UNPAID_ACCESS_REASONS = new Set(['open-access', 'free-tier'])

function normalizeWallet(walletAddress) {
  return String(walletAddress || '').trim().toLowerCase()
}

// FREE TIER DISABLED — helper commented out with the free-run block in getAgentAccessState.
// async function usedFreeRuns(agentId, wallet) {
//   return prisma.interaction.count({
//     where: { agentId, callerWallet: wallet, status: 'success' },
//   })
// }

export async function recordAgentPurchase({ agent, walletAddress, txHash, isLifetime = false, expiresAt = null }) {
  if (!agent || !walletAddress) return null

  const normalizedWallet = normalizeWallet(walletAddress)
  const finalExpiresAt = expiresAt || null

  const purchase = await prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.agentPurchase.findUnique({
      where: {
        agentId_userWallet: {
          agentId: agent.agentId,
          userWallet: normalizedWallet,
        },
      },
    })

    if (existingPurchase) {
      return tx.agentPurchase.update({
        where: {
          agentId_userWallet: {
            agentId: agent.agentId,
            userWallet: normalizedWallet,
          },
        },
        data: {
          txHash: txHash || null,
          isLifetime: !!isLifetime,
          expiresAt: finalExpiresAt,
        },
      })
    }

    await tx.agent.update({
      where: { id: agent.id },
      data: {
        purchaseCount: { increment: 1 },
      },
    })

    return tx.agentPurchase.create({
      data: {
        agentId: agent.agentId,
        userWallet: normalizedWallet,
        txHash: txHash || null,
        isLifetime: !!isLifetime,
        expiresAt: finalExpiresAt,
      },
    })
  })

  return purchase
}

export async function getAgentAccessState(agent, walletAddress) {
  if (!agent || !walletAddress) {
    return { hasAccess: false, reason: null }
  }

  const normalizedWallet = normalizeWallet(walletAddress)

 
  // FREE TIER DISABLED — every wallet must purchase the agent.
  // Re-enable by uncommenting this block (and the free-run allowance block below).
  // if (config.freeTier.openAccess) {
  //   return { hasAccess: true, reason: 'open-access' }
  // }

  if (normalizeWallet(agent.ownerWallet) === normalizedWallet) {
    return { hasAccess: true, reason: 'owner' }
  }

  const purchase = await prisma.agentPurchase.findUnique({
    where: {
      agentId_userWallet: {
        agentId: agent.agentId,
        userWallet: normalizedWallet,
      },
    },
  })

  if (purchase) {
    return { hasAccess: true, reason: 'purchased', purchase }
  }

  const activeAccess = await prisma.agentAccess.findUnique({
    where: {
      agentId_userWallet: {
        agentId: agent.agentId,
        userWallet: normalizedWallet,
      },
    },
  })

  if (activeAccess && (activeAccess.isLifetime || activeAccess.expiresAt > new Date())) {
    return { hasAccess: true, reason: 'purchased', access: activeAccess }
  }

  if (agent.contractAgentId) {
    const onChainAccess = await contractManager.hasAccess(agent.contractAgentId, normalizedWallet)
    if (onChainAccess) {
      return { hasAccess: true, reason: 'on-chain' }
    }
  }

  // FREE TIER DISABLED — no free runs per wallet; purchase is always required.
  // Re-enable by uncommenting this block (and the open-access block above).
  // const allowance = config.freeTier.runsPerAgent
  // if (allowance > 0) {
  //   const used = await usedFreeRuns(agent.agentId, normalizedWallet)
  //   if (used < allowance) {
  //     return {
  //       hasAccess: true,
  //       reason: 'free-tier',
  //       freeRuns: { used, allowance, remaining: allowance - used },
  //     }
  //   }
  //   return {
  //     hasAccess: false,
  //     reason: 'free-tier-exhausted',
  //     freeRuns: { used, allowance, remaining: 0 },
  //   }
  // }

  return { hasAccess: false, reason: null }
}

export async function hasPersistentAgentAccess(agent, walletAddress) {
  const state = await getAgentAccessState(agent, walletAddress)
  return state.hasAccess
}


export function accessDeniedMessage(state) {
  if (state?.reason === 'free-tier-exhausted') {
    const { used, allowance } = state.freeRuns || {}
    const spent = Math.min(used ?? 0, allowance ?? 0)
    return `Free trial used up (${spent}/${allowance} runs) — purchase this agent to keep going`
  }
  return 'Access not purchased for this agent'
}


export async function requireAgentAccess(agent, walletAddress) {
  const state = await getAgentAccessState(agent, walletAddress)
  if (!state.hasAccess) {
    const err = new Error(accessDeniedMessage(state))
    err.status = 403
    err.accessState = state
    throw err
  }
  return state
}
