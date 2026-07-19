import prisma from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

export const getPendingTransactions = asyncHandler(async (req, res) => {
  const wallet = req.walletAddress

  const txs = await prisma.transaction.findMany({
    where: {
      callerWallet: wallet,
      status: 'pending',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      txHash: true,
      type: true,
      status: true,
      agentId: true,
      totalAmount: true,
      createdAt: true,
    },
  })

  const now = Date.now()
  const TIMEOUT_MS = 24 * 60 * 60 * 1000

  const enriched = txs.map(tx => {
    const ageMs = now - new Date(tx.createdAt).getTime()
    const canClaimRefund = ageMs >= TIMEOUT_MS
    const msUntilRefund = Math.max(0, TIMEOUT_MS - ageMs)
    return { ...tx, canClaimRefund, msUntilRefund, hoursUntilRefund: (msUntilRefund / 3600000).toFixed(1) }
  })

  res.json({ pending: enriched, count: enriched.length })
})