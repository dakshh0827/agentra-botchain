import prisma from '../lib/prisma.js'
import orchestrator from '../orchestrator/orchestrator.js'
import { accessDeniedMessage, getAgentAccessState } from '../services/accessService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import agentService from '../services/agentService.js'
import { validateRuntimePayload } from '../utils/validateRuntimePayloadAgainstExecutionConfig.js'
import {
  callAgentSchema,
  discoverSchema,
  commsTargetSchema,
} from '../schemas/agentCommsSchema.js'

function _isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value)
}

async function _resolveAgent(idOrAgentId) {
  const normalized = String(idOrAgentId || '').trim()
  const contractAgentId = /^\d+$/.test(normalized) ? Number(normalized) : null

  return prisma.agent.findFirst({
    where: _isObjectId(normalized)
      ? { OR: [{ id: normalized }, { agentId: normalized }] }
      : {
          OR: [
            { agentId: normalized },
            ...(contractAgentId !== null ? [{ contractAgentId }] : []),
            { name: { equals: normalized, mode: 'insensitive' } },
          ],
        },
  })
}

async function _resolveTargetAgent(targetAgentName, targetAgentId) {
  if (targetAgentName) {
    const byName = await prisma.agent.findFirst({
      where: { name: { equals: targetAgentName, mode: 'insensitive' } },
    })

    if (byName) return byName
  }

  if (targetAgentId) {
    return _resolveAgent(targetAgentId)
  }

  return null
}

async function _discoverTargetAgent(task, excludeAgentId) {
  const words = Array.from(new Set(task.toLowerCase().split(/[^a-z0-9]+/g).filter(w => w.length >= 3))).slice(0, 8)

  const keywordOr = words.length
    ? words.flatMap((word) => [
        { name: { contains: word, mode: 'insensitive' } },
        { description: { contains: word, mode: 'insensitive' } },
        { tags: { has: word } },
      ])
    : []

  const candidates = await prisma.agent.findMany({
    where: {
      status: 'active',
      commsEnabled: true,
      commsPricePerCall: { not: '0' },
      ...(excludeAgentId ? { agentId: { not: excludeAgentId } } : {}),
      ...(keywordOr.length ? { OR: keywordOr } : {}),
    },
    orderBy: [
      { score: 'desc' },
      { successRate: 'desc' },
      { calls: 'desc' },
    ],
    take: 10,
  })

  if (candidates.length > 0) return candidates[0]
 
  return prisma.agent.findFirst({
    where: {
      status: 'active', 
      commsEnabled: true,
      commsPricePerCall: { not: '0' },
      ...(excludeAgentId ? { agentId: { not: excludeAgentId } } : {}),
    },
    orderBy: [{ score: 'desc' }, { calls: 'desc' }],
  })
}

const discoverAgents = asyncHandler(async (req, res) => {
  const { task, excludeId } = discoverSchema.parse(req.query)

  const excludeAgent = excludeId ? await _resolveAgent(excludeId) : null

  const words = Array.from(new Set(task.toLowerCase().split(/[^a-z0-9]+/g).filter(w => w.length >= 3))).slice(0, 8)
  const keywordOr = words.length
    ? words.flatMap((word) => [
        { name: { contains: word, mode: 'insensitive' } },
        { description: { contains: word, mode: 'insensitive' } },
        { tags: { has: word } },
      ])
    : []

  const agents = await prisma.agent.findMany({
    where: {
      status: 'active',
      commsEnabled: true,
      commsPricePerCall: { not: '0' },
      ...(excludeAgent ? { agentId: { not: excludeAgent.agentId } } : {}),
      ...(keywordOr.length ? { OR: keywordOr } : {}),
    },
    orderBy: [{ score: 'desc' }, { successRate: 'desc' }, { calls: 'desc' }],
    take: 12,
    select: {
      agentId: true,
      name: true,
      category: true,
      tags: true,
      description: true,
      successRate: true,
      score: true,
      calls: true,
      commsPricePerCall: true,
      pricing: true,
      ownerWallet: true,
    },
  })

  res.json({
    task,
    count: agents.length,
    agents,
  })
})

const getCommsTarget = asyncHandler(async (req, res) => {
  const { targetAgentName, targetAgentId } = commsTargetSchema.parse(req.query)

  const targetAgent = await _resolveTargetAgent(targetAgentName, targetAgentId)
  if (!targetAgent) {
    return res.status(404).json({ error: 'Target agent not found' })
  }

  res.json({
    agentId: targetAgent.agentId,
    contractAgentId: targetAgent.contractAgentId,
    name: targetAgent.name,
    ownerWallet: targetAgent.ownerWallet,
    commsEnabled: !!targetAgent.commsEnabled,
    commsPricePerCall: targetAgent.commsPricePerCall || '0',
    status: targetAgent.status,
    executionConfig: targetAgent.executionConfig || null,
    mcpSchema: targetAgent.mcpSchema || null,
    category: targetAgent.category,
    description: targetAgent.description,
    tags: targetAgent.tags,
    endpoint: targetAgent.endpoint,
  })
})

const callAgent = asyncHandler(async (req, res) => {
  const { fromId } = req.params
  const callerWallet = req.walletAddress
  const rawBody = req.body || {}

  let parsedRuntimePayload = rawBody.runtimePayload
  if (typeof parsedRuntimePayload === 'string') {
    try {
      parsedRuntimePayload = JSON.parse(parsedRuntimePayload)
    } catch {
      parsedRuntimePayload = undefined
    }
  }

  const { task, targetAgentName, targetAgentId, autoDiscover, txHash, runtimePayload } = callAgentSchema.parse({
    task: rawBody.task,
    targetAgentName: rawBody.targetAgentName,
    targetAgentId: rawBody.targetAgentId,
    autoDiscover: rawBody.autoDiscover === true || rawBody.autoDiscover === 'true',
    txHash: rawBody.txHash,
    runtimePayload: parsedRuntimePayload,
  })

  const sourceAgent = await _resolveAgent(fromId)
  if (!sourceAgent) return res.status(404).json({ error: 'Source agent not found' })

  const sourceAccess = await getAgentAccessState(sourceAgent, callerWallet)
  if (!sourceAccess.hasAccess) {
    return res.status(403).json({
      error: `${accessDeniedMessage(sourceAccess)} (source agent ${sourceAgent.agentId})`,
      freeRuns: sourceAccess.freeRuns || null,
    })
  }

  let targetAgent = null
  if (targetAgentName || targetAgentId) {
    targetAgent = await _resolveTargetAgent(targetAgentName, targetAgentId)
  } else if (autoDiscover) {
    targetAgent = await _discoverTargetAgent(task, sourceAgent.agentId)
  }

  if (!targetAgent) {
    return res.status(404).json({ error: 'Target agent not found for delegation' })
  }

  const uploadedFiles = {}
  if (req.files && req.files.length > 0) {
    const { validateUploads } = await import('../utils/uploadValidation.js')

    const filesMap = {}
    for (const file of req.files) {
      filesMap[file.fieldname] = file
    }

    validateUploads(filesMap)

    if (targetAgent.executionConfig) {
      validateRuntimePayload(targetAgent.executionConfig, runtimePayload, filesMap)
    }

    Object.assign(uploadedFiles, filesMap)
  }

  const enrichedRuntimePayload = runtimePayload
    ? {
        ...runtimePayload,
        files: uploadedFiles,
      }
    : Object.keys(uploadedFiles).length > 0
    ? {
        headers: {},
        body: {},
        files: uploadedFiles,
      }
    : null

  if (sourceAgent.agentId === targetAgent.agentId) {
    return res.status(400).json({ error: 'Source and target agents must be different' })
  }

  if (targetAgent.status !== 'active') {
    return res.status(409).json({ error: `Target agent is ${targetAgent.status}` })
  }

  if (!targetAgent.commsEnabled) {
    return res.status(400).json({ error: 'Target agent has disabled agent-to-agent communication' })
  }

  const basePriceWei = BigInt(targetAgent.commsPricePerCall || '0')
  if (basePriceWei <= 0n) {
    return res.status(400).json({ error: 'Target agent comms price is not configured' })
  }

  const priceWei = basePriceWei
  const platformFeeWei = (priceWei * 20n) / 100n
  const creatorAmountWei = priceWei - platformFeeWei

  if (priceWei > 0n && !txHash) {
    return res.status(400).json({ error: 'txHash required: comms call payment must be processed by wallet first' })
  }

  const sourceInteraction = await prisma.interaction.create({
    data: {
      agentId: sourceAgent.agentId,
      callerWallet,
      task,
      callDepth: 0,
      status: 'success',
    },
  })

  const commsMessage = await prisma.agentCommsMessage.create({
    data: {
      fromAgentId: sourceAgent.agentId,
      toAgentId: targetAgent.agentId,
      callerWallet,
      task,
      priceWei: priceWei.toString(),
      platformFeeWei: platformFeeWei.toString(),
      creatorAmountWei: creatorAmountWei.toString(),
      transactionHash: txHash || null,
    },
  })

  try {
    const delegatedResult = await orchestrator.executeAgent(targetAgent.agentId, task, callerWallet, {
      callDepth: 1,
      parentInteractionId: sourceInteraction.id,
      runtimePayload: enrichedRuntimePayload,
      skipCallRevenueBooking: true,
    })

    if (priceWei > 0n) {
      await prisma.transaction.create({
        data: {
          txHash,
          type: 'agent_to_agent',
          status: 'confirmed',
          agentId: targetAgent.agentId,
          callerWallet,
          ownerWallet: targetAgent.ownerWallet,
          totalAmount: priceWei.toString(),
          platformFee: platformFeeWei.toString(),
          creatorAmount: creatorAmountWei.toString(),
        },
      })

      await prisma.agent.update({
        where: { id: targetAgent.id },
        data: {
          revenue: (BigInt(targetAgent.revenue || '0') + creatorAmountWei).toString(),
        },
      })
    }

    await prisma.agentCommsMessage.update({
      where: { id: commsMessage.id },
      data: {
        response: typeof delegatedResult.response === 'string'
          ? delegatedResult.response
          : JSON.stringify(delegatedResult.response),
        status: 'success',
        latency: delegatedResult.latency,
        transactionHash: priceWei > 0n ? txHash : null,
      },
    })

    await prisma.interaction.update({
      where: { id: sourceInteraction.id },
      data: {
        latency: delegatedResult.latency,
        response: JSON.stringify({
          mode: 'agent-communication',
          fromAgentId: sourceAgent.agentId,
          toAgentId: targetAgent.agentId,
          delegatedInteractionId: delegatedResult.interactionId,
          chargedWei: priceWei.toString(),
          success: true,
        }),
      },
    })

    await agentService.recordExecution(targetAgent.agentId, {
      success: true,
      latency: delegatedResult.latency,
    })

    res.json({
      mode: 'agent-communication',
      sourceAgent: {
        agentId: sourceAgent.agentId,
        name: sourceAgent.name,
      },
      targetAgent: {
        agentId: targetAgent.agentId,
        name: targetAgent.name,
        commsPricePerCall: targetAgent.commsPricePerCall,
      },
      billing: {
        chargedWei: priceWei.toString(),
        platformFeeWei: platformFeeWei.toString(),
        creatorAmountWei: creatorAmountWei.toString(),
        transactionHash: priceWei > 0n ? txHash : null,
      },
      result: delegatedResult,
    })
  } catch (error) {
    await prisma.agentCommsMessage.update({
      where: { id: commsMessage.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
      },
    }).catch(() => {})

    await prisma.interaction.update({
      where: { id: sourceInteraction.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
      },
    }).catch(() => {})

    await agentService.recordExecution(targetAgent.agentId, {
      success: false,
      latency: 0,
    }).catch(() => {})

    throw error
  }
})

const getMessages = asyncHandler(async (req, res) => {
  const { agentId } = req.params

  const agent = await _resolveAgent(agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  const [sent, received] = await Promise.all([
    prisma.agentCommsMessage.findMany({
      where: { fromAgentId: agent.agentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        toAgent: { select: { agentId: true, name: true } },
      },
    }),
    prisma.agentCommsMessage.findMany({
      where: { toAgentId: agent.agentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromAgent: { select: { agentId: true, name: true } },
      },
    }),
  ])

  res.json({
    agentId: agent.agentId,
    sent,
    received,
  })
})

export {
  callAgent,
  discoverAgents,
  getCommsTarget,
  getMessages,
}
