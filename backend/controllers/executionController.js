import orchestrator from '../orchestrator/orchestrator.js'
import prisma from '../lib/prisma.js'
import { accessDeniedMessage, getAgentAccessState, hasPersistentAgentAccess } from '../services/accessService.js'
import config from '../config/config.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { v4 as uuidv4 } from 'uuid'
import { validateRuntimePayload } from '../utils/validateRuntimePayloadAgainstExecutionConfig.js'

import { buildExecutionRequest } from '../utils/buildExecutionRequest.js'
import { assertSafeUrl } from '../utils/ssrfGuard.js'
import { executeSchema, composeSchema } from '../schemas/executionSchema.js'

function buildAgentLookup(id) {
  const value = String(id || '').trim()
  const isObjectId = /^[a-f\d]{24}$/i.test(value)
  const isContractAgentId = /^\d+$/.test(value)

  if (isObjectId) return { id: value }
  if (isContractAgentId) return { OR: [{ agentId: value }, { contractAgentId: Number(value) }] }
  return { agentId: value }
}
 
const executeAgent = asyncHandler(async (req, res) => {
  // Normalize body — multer puts text fields in req.body, files in req.files
  const rawBody = req.body || {}

  // Parse runtimePayload if sent as JSON string in multipart form
  let parsedRuntimePayload = rawBody.runtimePayload

  if (typeof parsedRuntimePayload === 'string') {
    try {
      parsedRuntimePayload = JSON.parse(parsedRuntimePayload)
    } catch {
      parsedRuntimePayload = undefined
    }
  }

  const { task, runtimePayload } = executeSchema.parse({
    task: rawBody.task,
    runtimePayload: parsedRuntimePayload,
  })

  const { id } = req.params
  const callerWallet = req.walletAddress

  const agent = await prisma.agent.findFirst({
    where: buildAgentLookup(id),
  })

  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
    })
  }

  const accessState = await getAgentAccessState(agent, callerWallet)
  if (!accessState.hasAccess) {
    return res.status(403).json({
      error: accessDeniedMessage(accessState),
      freeRuns: accessState.freeRuns || null,
    })
  }

  // Attach uploaded files to runtimePayload.files — keyed by field name
  const uploadedFiles = {}

  if (req.files && req.files.length > 0) {
    const { validateUploads } = await import(
      '../utils/uploadValidation.js'
    )

    const filesMap = {}

    for (const file of req.files) {
      filesMap[file.fieldname] = file
    }

    validateUploads(filesMap)

    // Validate uploads against executionConfig schema
    if (agent.executionConfig) {
      validateRuntimePayload(
        agent.executionConfig,
        runtimePayload,
        filesMap
      )
    }

    Object.assign(uploadedFiles, filesMap)
  }

  const enrichedPayload = runtimePayload
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

  const executionTraceId = uuidv4()

  // Wait for full execution response (can take 1-3+ minutes for Hugging Face models)
  // Only log to console, don't display acceptance message to user
  console.log('[EXECUTION] Starting agent execution:', { agentId: agent.agentId, executionTraceId, task: task.substring(0, 100) })

  try {
    const result = await orchestrator.executeAgent(agent.agentId, task, callerWallet, {
      runtimePayload: enrichedPayload,
      executionTraceId,
    })

    console.log('[EXECUTION] Execution completed:', { executionTraceId, interactionId: result?.interactionId, resultKeys: Object.keys(result || {}) })

    // Return the actual response from the agent
    return res.status(200).json(result)
  } catch (err) {
    console.error('[EXECUTION] Execution failed:', { executionTraceId, error: err.message, status: err.status })
    throw err // Let the error handler catch it
  }
})

/**
 * POST /agents/compose
 */
const composeAgents = asyncHandler(async (req, res) => {
  const { agents, sequential = false } = composeSchema.parse(req.body)
  const callerWallet = req.walletAddress
  const callChainId = uuidv4()

  let results

  if (sequential) {
    results = []
    let context = ''

    for (const [i, agentInput] of agents.entries()) {
      const agent = await prisma.agent.findFirst({
        where: buildAgentLookup(agentInput.agentId),
      })

      if (!agent) continue

      // Check access
      const hasAccess = await _checkAgentAccess(agent, callerWallet)
      if (!hasAccess) continue

      const task = context
        ? `${agentInput.task}\n\nContext:\n${context}`
        : agentInput.task

      const result = await orchestrator.executeAgent(agent.agentId, task, callerWallet, {
        callChainId,
        callDepth: i,
      })

      results.push(result)

      context =
        typeof result.response === 'string'
          ? result.response
          : JSON.stringify(result.response)
    }
  } else {
    results = await Promise.all(
      agents.map(async (agentInput, i) => {
        const agent = await prisma.agent.findFirst({
          where: buildAgentLookup(agentInput.agentId),
        })

        if (!agent) return null

        const hasAccess = await _checkAgentAccess(agent, callerWallet)
        if (!hasAccess) return null

        return orchestrator.executeAgent(agent.agentId, agentInput.task, callerWallet, {
          callChainId,
          callDepth: i,
        })
      })
    )
  }

  res.json({
    mode: sequential ? 'sequential' : 'parallel',
    agentCount: agents.length,
    callChainId,
    results,
  })
})

// Internal helper
async function _checkAgentAccess(agent, callerWallet) {
  return hasPersistentAgentAccess(agent, callerWallet)
}

/**
 * GET /agents/:id/interactions
 */
const getInteractions = asyncHandler(async (req, res) => {
  const { id } = req.params
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)

  // FIXED: Passed `limit` inside an options object so Orchestrator can destructure it properly
  const history = await orchestrator.getInteractionHistory(id, { limit })
  res.json(history)
})

export {
  executeAgent,
  composeAgents,
  getInteractions,
}