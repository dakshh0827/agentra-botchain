import prisma from '../lib/prisma.js'
import contractManager from '../lib/contractManager.js'

function normalizeWallet(walletAddress) {
  return String(walletAddress || '').trim().toLowerCase()
}

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

  return { hasAccess: false, reason: null }
}

export async function hasPersistentAgentAccess(agent, walletAddress) {
  const state = await getAgentAccessState(agent, walletAddress)
  return state.hasAccess
}
