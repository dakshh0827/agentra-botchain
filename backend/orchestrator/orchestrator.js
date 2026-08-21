import axios from 'axios'
import prisma from '../lib/prisma.js'
import agentService from '../services/agentService.js'
import config from '../config/config.js'
import { v4 as uuidv4 } from 'uuid'
import { executeWithRetry } from '../utils/executeWithRetry.js'
import { logExecutionStart, logExecutionComplete, logExecutionError, categorizeError } from '../utils/executionLogger.js'
import { validateRuntimePayload } from '../utils/validateRuntimePayloadAgainstExecutionConfig.js'

class Orchestrator {
  constructor() {
    this.activeChains = new Map()
  }

async executeAgent(agentId, task, callerWallet, options = {}) {
  const {
    callDepth = 0,
    parentInteractionId = null,
    callChainId = uuidv4(),
    runtimePayload = null,
    executionTraceId = uuidv4(),
    skipCallRevenueBooking = false,
  } = options

  console.log('[ORCHESTRATOR] ▶️  Starting agent execution:', {
    executionTraceId,
    agentId,
    callDepth,
    taskLength: task?.length || 0,
  })

  if (callDepth > config.platform.maxCallDepth) {
    throw Object.assign(
      new Error(`Max call depth (${config.platform.maxCallDepth}) exceeded`),
      { status: 429 }
    )
  }

  if (!this.activeChains.has(callChainId)) {
    this.activeChains.set(callChainId, new Set())
  }

  const chain = this.activeChains.get(callChainId)

  if (chain.has(agentId)) {
    throw Object.assign(
      new Error(`Circular agent call detected: ${agentId}`),
      { status: 400 }
    )
  }

  chain.add(agentId)

  const agent = await agentService.getById(agentId)

  // Runtime payload validation against executionConfig schema
  if (agent.executionConfig && runtimePayload) {
    const uploadedFiles = runtimePayload.files || {}

    validateRuntimePayload(
      agent.executionConfig,
      runtimePayload,
      uploadedFiles
    )
  }

  // Observability: log execution start
  const uploadCount = runtimePayload
    ? Object.keys(runtimePayload.files || {}).length
    : 0

  const payloadSize = runtimePayload
    ? Buffer.byteLength(
        JSON.stringify({
          headers: runtimePayload.headers,
          body: runtimePayload.body,
        }),
        'utf8'
      )
    : 0

  logExecutionStart({
    executionTraceId,
    agentId: agent.agentId,
    contentType: agent.executionConfig?.contentType || 'legacy',
    uploadCount,
    payloadSize,
  })

  if (agent.status === 'offline' || agent.status === 'inactive') {
    chain.delete(agentId)

    if (chain.size === 0) {
      this.activeChains.delete(callChainId)
    }

    throw Object.assign(
      new Error(`Agent "${agent.name}" is ${agent.status}`),
      { status: 503 }
    )
  }

  if (!agent.endpoint) {
    chain.delete(agentId)

    if (chain.size === 0) {
      this.activeChains.delete(callChainId)
    }

    throw Object.assign(
      new Error(`Agent "${agent.name}" has no endpoint configured`),
      { status: 400 }
    )
  }

  const interactionId = uuidv4()
  const startTime = Date.now()

  let interactionRecord

  try {
    interactionRecord = await prisma.interaction.create({
      data: {
        agentId: agent.agentId,
        callerWallet: callerWallet?.toLowerCase() || null,
        task,
        callDepth,
        parentInteractionId,
        status: 'success',
      },
    })
  } catch (err) {
    console.error(
      '[ORCHESTRATOR] Interaction create failed:',
      err.message
    )
  }

  let response
  let success = false
  let retryCount = 0

  try {
    let result

    const { result: axiosResult, retryCount: rc } =
      await executeWithRetry(
        () =>
          this._callAgentEndpoint(
            agent.endpoint,
            task,
            {
              callDepth,
              callChainId,
              interactionId: interactionRecord?.id,
              callerWallet,
              agentId: agent.agentId,
              contractAgentId: agent.contractAgentId ?? null,
            },
            agent.executionConfig,
            runtimePayload
          ),
        {
          maxRetries: 2,
          baseDelayMs: 500,
          maxDelayMs: 5000,
          onRetry: (attempt, err) => {
            console.warn(
              `[ORCHESTRATOR] Retry ${attempt} for agent ${agent.agentId}: ${err.message}`
            )
          },
        }
      )

    result = axiosResult
    retryCount = rc

    // Normalize headers and content
    const resHeaders = result.headers || {}
    const contentType = (resHeaders['content-type'] || '').toLowerCase()
    let extracted

    // If the response is binary (ArrayBuffer / Buffer), convert to base64
    try {
      const raw = result.data

      // Detect Buffer/ArrayBuffer
      const isArrayBuffer = raw && (raw instanceof ArrayBuffer || raw.buffer instanceof ArrayBuffer)
      const isBuffer = Buffer.isBuffer(raw)

      if (isArrayBuffer || isBuffer) {
        const buffer = Buffer.from(raw)

        if (contentType.includes('application/json') || contentType.startsWith('text/')) {
          // Decode as text
          const text = buffer.toString('utf8')
          try {
            extracted = JSON.parse(text)
          } catch {
            extracted = text
          }
        } else {
          // Binary payload — return base64 with metadata
          const cd = resHeaders['content-disposition'] || ''
          const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^;\"]+)"?/) || []
          const filename = (match[1] || match[2] || '').replace(/"/g, '') || 'output.bin'
          extracted = {
            isBinary: true,
            filename,
            mimeType: contentType || 'application/octet-stream',
            base64: buffer.toString('base64'),
            size: buffer.length,
          }
        }
      } else {
        // Non-binary: try to parse JSON, otherwise use as-is
        if (typeof raw === 'string') {
          try {
            extracted = JSON.parse(raw)
          } catch {
            extracted = raw
          }
        } else {
          extracted = raw
        }
      }
    } catch (procErr) {
      console.warn('[ORCHESTRATOR] Response processing failed:', procErr.message)
      extracted = result.data ?? {}
    }

    console.log('[ORCHESTRATOR] Raw response received:', {
      status: result.status,
      hasData: !!result.data,
      dataType: ArrayBuffer.isView(result.data) ? 'arraybuffer' : typeof result.data,
    })

    response = extracted
    success = true

    console.log('[ORCHESTRATOR] Response extracted for return:', {
      responseType: typeof response,
      responsePreview: typeof response === 'string' ? response.substring(0, 100) : (response && response.isBinary ? `${response.filename} (${response.size} bytes)` : JSON.stringify(response).slice(0, 100)),
    })
  } catch (err) {
    if (interactionRecord) {
      await prisma.interaction.update({
        where: { id: interactionRecord.id },
        data: {
          status: 'failed',
          errorMessage: err.message,
          latency: Date.now() - startTime,
        },
      })
    }

    chain.delete(agentId)

    if (chain.size === 0) {
      this.activeChains.delete(callChainId)
    }

    // Observability: log error
    logExecutionError({
      executionTraceId,
      agentId: agent.agentId,
      errorCategory: categorizeError(err),
      errorMessage: err.message,
      retryCount,
    })

    throw Object.assign(
      new Error(`Agent execution failed: ${err.message}`),
      { status: 502 }
    )
  }

  const latency = Date.now() - startTime

  if (interactionRecord) {
    await prisma.interaction.update({
      where: { id: interactionRecord.id },
      data: {
        response:
          typeof response === 'string'
            ? response
            : JSON.stringify(response),
        latency,
        status: 'success',
      },
    })
    console.log('[ORCHESTRATOR] ✅ Interaction recorded:', {
      interactionId: interactionRecord.id,
      latency,
      responsePreview: typeof response === 'string' ? response.substring(0, 100) : JSON.stringify(response).substring(0, 100),
    })
  }

  await agentService.recordExecution(agent.agentId, {
    success,
    latency,
  })

  // Record paid direct-call revenue in DB so dashboard/leaderboard reflect live call monetization.
  // Delegated agent-to-agent flows already persist billing separately, so they can opt out.
  if (
    !skipCallRevenueBooking &&
    success &&
    interactionRecord?.id &&
    callerWallet &&
    agent.ownerWallet?.toLowerCase() !== callerWallet?.toLowerCase() &&
    BigInt(agent.commsPricePerCall || '0') > 0n
  ) {
    try {
      const totalAmountWei = BigInt(agent.commsPricePerCall || '0')
      const platformFeeWei = (totalAmountWei * 20n) / 100n
      const creatorAmountWei = totalAmountWei - platformFeeWei
      const callTxHash = `call_${interactionRecord.id}`

      await prisma.transaction.upsert({
        where: { txHash: callTxHash },
        update: {
          status: 'confirmed',
          type: 'call',
          agentId: agent.agentId,
          callerWallet: callerWallet.toLowerCase(),
          ownerWallet: agent.ownerWallet,
          totalAmount: totalAmountWei.toString(),
          platformFee: platformFeeWei.toString(),
          creatorAmount: creatorAmountWei.toString(),
        },
        create: {
          txHash: callTxHash,
          status: 'confirmed',
          type: 'call',
          agentId: agent.agentId,
          callerWallet: callerWallet.toLowerCase(),
          ownerWallet: agent.ownerWallet,
          totalAmount: totalAmountWei.toString(),
          platformFee: platformFeeWei.toString(),
          creatorAmount: creatorAmountWei.toString(),
        },
      })

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          revenue: (BigInt(agent.revenue || '0') + creatorAmountWei).toString(),
        },
      })
    } catch (billingErr) {
      console.error('[ORCHESTRATOR] Call revenue booking failed:', billingErr?.message || billingErr)
    }
  }

  // Observability: log completion
  logExecutionComplete({
    executionTraceId,
    agentId: agent.agentId,
    contentType: agent.executionConfig?.contentType || 'legacy',
    executionDuration: latency,
    retryCount,
    uploadCount,
    payloadSize,
    status: 'success',
  })

  // Persist execution metric (non-blocking)
  import('../lib/prisma.js')
    .then(({ default: prisma }) => {
      prisma.executionMetric
        .create({
          data: {
            executionTraceId,
            agentId: agent.agentId,
            contentType:
              agent.executionConfig?.contentType || 'legacy',
            executionDuration: latency,
            status: 'success',
            retryCount,
            uploadCount,
            payloadSize,
          },
        })
        .catch((e) =>
          console.error(
            '[ORCHESTRATOR] ExecutionMetric save failed:',
            e.message
          )
        )
    })

  chain.delete(agentId)

  if (chain.size === 0) {
    this.activeChains.delete(callChainId)
  }

  const returnObj = {
    interactionId: interactionRecord?.id,
    agentId: agent.agentId,
    agentName: agent.name,
    task,
    response,
    latency,
    success: true,
    callDepth,
    timestamp: new Date().toISOString(),
  }

  console.log('[ORCHESTRATOR] ✅ Returning execution result:', {
    executionTraceId,
    interactionId: returnObj.interactionId,
    latency: returnObj.latency,
    hasResponse: !!returnObj.response,
    responseType: typeof returnObj.response,
  })

  return returnObj
}

  async agentToAgentCall(fromAgentId, toAgentId, task, parentOptions = {}) {
    return this.executeAgent(toAgentId, task, null, {
      ...parentOptions,
      callDepth: (parentOptions.callDepth || 0) + 1,
    })
  }

async _callAgentEndpoint(endpoint, task, meta = {}, executionConfig = null, runtimePayload = null) {
  const timeout = config.platform.callTimeoutMs

  const baseEndpoint = String(endpoint || '').trim().replace(/\/+$/, '')
  if (!baseEndpoint) {
    throw new Error('Agent endpoint is empty')
  }

  // SSRF protection
  const { assertSafeUrl } = await import('../utils/ssrfGuard.js')
  await assertSafeUrl(baseEndpoint)

  // Targeted MCP transport for the Sect8 agent only.
  if (runtimePayload !== null) {
    const { isSect8McpEndpoint, callSect8McpAgent } = await import('../utils/sect8McpClient.js')

    if (isSect8McpEndpoint(baseEndpoint)) {
      return callSect8McpAgent(baseEndpoint, task, runtimePayload, timeout)
    }
  }

  // Schema-driven execution when executionConfig exists
  if (executionConfig && runtimePayload !== null) {
    const { buildExecutionRequest } = await import('../utils/buildExecutionRequest.js')
    const { redactHeaders } = await import('../utils/redactSecrets.js')

    const { decryptLlmKey: decryptSecretValue } = await import('../utils/cryptoKey.js')
    const decryptField = (f) => (f.secret && !f.userProvided && f.value) ? { ...f, value: decryptSecretValue(f.value) } : f
    const decryptedExecutionConfig = {
      ...executionConfig,
      headers: (executionConfig.headers || []).map(decryptField),
      bodyFields: (executionConfig.bodyFields || []).map(decryptField),
    }
    const reqConfig = buildExecutionRequest(baseEndpoint, decryptedExecutionConfig, runtimePayload, task)
    const candidateUrls = reqConfig.candidateUrls?.length > 0 ? reqConfig.candidateUrls : [reqConfig.url]

    console.log(`[ORCHESTRATOR] Schema-driven execution: ${candidateUrls[0]}`)
    console.log(`[ORCHESTRATOR] Content-Type: ${executionConfig.contentType}`)
    const previewConfig = reqConfig.buildRequestConfig(candidateUrls[0])
    console.log(`[ORCHESTRATOR] Headers (redacted):`, redactHeaders(previewConfig.headers))

    let lastErr = null

    for (const url of candidateUrls) {
      console.log(`[ORCHESTRATOR] Schema-driven attempt: ${url}`)
      try {
        const attemptConfig = reqConfig.buildRequestConfig(url)
        return await axios({
          method: attemptConfig.method,
          url: attemptConfig.url,
          headers: attemptConfig.headers,
          data: attemptConfig.data,
          timeout,
          responseType: 'arraybuffer',
          maxRedirects: 0,
          maxContentLength: 50 * 1024 * 1024,
          maxBodyLength: 50 * 1024 * 1024,
        })
      } catch (err) {
        lastErr = err
        console.log(`[ORCHESTRATOR] Schema-driven attempt failed: ${url} → ${err.message}`)
      }
    }

    throw lastErr
  }

  // Legacy text-only execution — backward compatible
  const basePayload = {
    task,
    meta: {
      platform: 'agentra',
      version: '2.0',
      ...meta,
    },
  }

  const compatibilityPayload = {
    ...basePayload,
    input: task,
    prompt: task,
    query: task,
    message: task,
  }

  const attempts = [
    { url: `${baseEndpoint}/execute`, payload: basePayload },
    { url: baseEndpoint, payload: basePayload },
    { url: `${baseEndpoint}/execute`, payload: compatibilityPayload },
    { url: baseEndpoint, payload: compatibilityPayload },
  ]

  let lastError = null
  let attemptNum = 0

  for (const attempt of attempts) {
    attemptNum++
    try {
      console.log(`[ORCHESTRATOR] Attempt ${attemptNum}/${attempts.length}: POST ${attempt.url}`)
      const response = await axios.post(attempt.url, attempt.payload, {
        timeout,
        responseType: 'arraybuffer',
        maxRedirects: 0,
        headers: { 'Content-Type': 'application/json' },
      })
      console.log(`[ORCHESTRATOR] ✅ Attempt ${attemptNum} succeeded with status ${response.status}`)
      return response
    } catch (err) {
      console.log(`[ORCHESTRATOR] ❌ Attempt ${attemptNum} failed: ${err.message}`)
      lastError = err
    }
  }

  if (!lastError) {
    throw new Error('Agent endpoint call failed without an error response')
  }

  const status = lastError.response?.status
  const responseMsg =
    lastError.response?.data?.error ||
    lastError.response?.data?.message ||
    (typeof lastError.response?.data === 'string' ? lastError.response.data : '') ||
    lastError.message

  if (status) {
    throw new Error(`Endpoint responded with status ${status}: ${responseMsg}`)
  }

  throw lastError
}

  async getInteractionHistory(agentId, limit = 50) {
    // Support DB id, DB agentId string, and on-chain contractAgentId
    const normalized = String(agentId || '').trim()
    const isContractAgentId = /^\d+$/.test(normalized)

    const agent = await prisma.agent.findFirst({
      where: isContractAgentId
        ? { OR: [{ id: normalized }, { agentId: normalized }, { contractAgentId: Number(normalized) }] }
        : { OR: [{ id: normalized }, { agentId: normalized }] },
    })

    if (!agent) return []

    return prisma.interaction.findMany({
      where: { agentId: agent.agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        callerWallet: true,
        task: true,
        latency: true,
        status: true,
        callDepth: true,
        createdAt: true,
      },
    })
  }
}

export default new Orchestrator()