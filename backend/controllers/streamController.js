import axios from 'axios'
import { z } from 'zod'

import prisma from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { hasPersistentAgentAccess } from '../services/accessService.js'
import { assertSafeUrl } from '../utils/ssrfGuard.js'
import { appendExchange, getConversation } from '../services/conversationService.js'
import agentService from '../services/agentService.js'



function buildAgentLookup(id) {
  const value = String(id || '').trim()
  if (/^[a-f\d]{24}$/i.test(value)) return { id: value }
  if (/^\d+$/.test(value)) return { OR: [{ agentId: value }, { contractAgentId: Number(value) }] }
  return { agentId: value }
}

const STREAM_TIMEOUT_MS = 180_000

const executeSchema = z.object({
  task: z.string().min(1).max(4000),
  maxPages: z.number().int().min(1).max(50).optional(),
})

const chatSchema = z.object({
  question: z.string().min(1).max(2000),
  reportId: z.string().max(120).optional(),
})

// Open the response as event stream 
function openStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders?.()
}

function send(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}


async function relay(res, url, body, onEvent) {
  const upstream = await axios.post(url, body, {
    responseType: 'stream',
    timeout: STREAM_TIMEOUT_MS,
    maxRedirects: 0,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
  })

  let buffer = ''

  await new Promise((resolve, reject) => {
    upstream.data.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      res.write(text)

      // Frames can split across chunks, so parse from a buffer rather than per chunk.
      buffer += text
      const frames = buffer.split('\n\n')
      buffer = frames.pop() || ''
      for (const frame of frames) {
        const line = frame.split('\n').find((l) => l.startsWith('data: '))
        if (!line) continue
        try {
          onEvent(JSON.parse(line.slice(6)))
        } catch {

        }
      }
    })
    upstream.data.on('end', resolve)
    upstream.data.on('error', reject)
    res.on('close', () => {
      upstream.data.destroy()
      resolve()
    })
  })
}

async function loadAgentForCaller(req, res) {
  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(req.params.agentId) })
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return null
  }
  if (!(await hasPersistentAgentAccess(agent, req.walletAddress))) {
    res.status(403).json({ error: 'Access not purchased' })
    return null
  }
  if (!agent.endpoint) {
    res.status(400).json({ error: `Agent "${agent.name}" has no endpoint configured` })
    return null
  }
  return agent
}

const executeStream = asyncHandler(async (req, res) => {
  const { task, maxPages } = executeSchema.parse(req.body)
  const agent = await loadAgentForCaller(req, res)
  if (!agent) return

  const base = String(agent.endpoint).trim().replace(/\/+$/, '')
  await assertSafeUrl(base)

  const startedAt = Date.now()
  let result = null
  let failure = null

  openStream(res)

  try {
    await relay(
      res,
      `${base}/execute/stream`,
      { task, maxPages, meta: { platform: 'agentra', agentId: agent.agentId, callerWallet: req.walletAddress } },
      (event) => {
        if (event.type === 'result') result = event.payload
        if (event.type === 'error') failure = event.error
      },
    )
  } catch (err) {
    const status = err.response?.status
    send(res, {
      type: 'error',
      error: status === 404 || status === 405
        ? `"${agent.name}" does not support streaming.`
        : `Agent stream failed: ${err.message}`,
    })
  }


  const spoken = result?.spokenSummary || result?.summary || null
  if (spoken) {
    try {
      await appendExchange(agent.agentId, req.walletAddress, task, spoken)
    } catch (err) {
      console.error('[STREAM] conversation save failed:', err.message)
    }
  }


  const latency = Date.now() - startedAt
  try {
    await prisma.interaction.create({
      data: {
        agentId: agent.agentId,
        callerWallet: (req.walletAddress || '').toLowerCase() || null,
        task,
        response: result ? JSON.stringify(result).slice(0, 100_000) : null,
        latency,
        status: result ? 'success' : 'failed',
        errorMessage: failure || null,
      },
    })
    await agentService.recordExecution(agent.agentId, { success: !!result, latency })
  } catch (err) {
    console.error('[STREAM] bookkeeping failed:', err.message)
  }

  res.end()
})

const chatStream = asyncHandler(async (req, res) => {
  const { question, reportId } = chatSchema.parse(req.body)
  const agent = await loadAgentForCaller(req, res)
  if (!agent) return

  const base = String(agent.endpoint).trim().replace(/\/+$/, '')
  await assertSafeUrl(base)

  const thread = await getConversation(agent.agentId, req.walletAddress)
  let answer = ''

  openStream(res)

  try {
    await relay(
      res,
      `${base}/chat/stream`,
      {
        question,
        reportId: reportId || undefined,
        history: thread.messages.map(({ role, content }) => ({ role, content })),
        meta: { platform: 'agentra', agentId: agent.agentId, callerWallet: req.walletAddress },
      },
      (event) => {
        if (event.type === 'token') answer += event.text || ''
        // The terminal frame carries the whole answer, so it wins over the accumulated
        // tokens — those can be a frame short if one was lost in transit.
        if (event.type === 'done' && event.answer) answer = event.answer
      },
    )
  } catch (err) {
    send(res, { type: 'error', error: `Agent chat stream failed: ${err.message}` })
  }

  if (answer.trim()) {
    try {
      await appendExchange(agent.agentId, req.walletAddress, question, answer)
    } catch (err) {
      console.error('[STREAM] conversation save failed:', err.message)
    }
  }

  res.end()
})

export { executeStream, chatStream }
