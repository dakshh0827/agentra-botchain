import axios from 'axios'

import prisma from '../lib/prisma.js'
import config from '../config/config.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { accessDeniedMessage, getAgentAccessState } from '../services/accessService.js'
import { assertSafeUrl } from '../utils/ssrfGuard.js'
import {
  appendExchange,
  clearConversation,
  getConversation,
  listConversations,
} from '../services/conversationService.js'
import { chatMessageSchema } from '../schemas/chatSchema.js'


function buildAgentLookup(id) {
  const value = String(id || '').trim()
  if (/^[a-f\d]{24}$/i.test(value)) return { id: value }
  if (/^\d+$/.test(value)) return { OR: [{ agentId: value }, { contractAgentId: Number(value) }] }
  return { agentId: value }
}



const CHAT_TIMEOUT_MS = 60_000

const chatWithAgent = asyncHandler(async (req, res) => {
  const { question, reportId } = chatMessageSchema.parse(req.body)
  const callerWallet = req.walletAddress

  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(req.params.agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

    //chekc this agent is purchased y user ot not ..handle permssison 
  const accessState = await getAgentAccessState(agent, callerWallet)
  if (!accessState.hasAccess) {
    return res.status(403).json({ error: accessDeniedMessage(accessState), freeRuns: accessState.freeRuns || null })
  }

  if (!agent.endpoint) {
    return res.status(400).json({ error: `Agent "${agent.name}" has no endpoint configured` })
  }

  const base = String(agent.endpoint).trim().replace(/\/+$/, '')
  await assertSafeUrl(base)

 
  const thread = await getConversation(agent.agentId, callerWallet)

  let response
  try {
    response = await axios.post(
      `${base}/chat`,
      {
        question,
        reportId: reportId || undefined,
        history: thread.messages.map(({ role, content }) => ({ role, content })),
        meta: {
          platform: 'agentra',
          agentId: agent.agentId,
          callerWallet,
        },
      },
      {
        timeout: CHAT_TIMEOUT_MS,
        maxRedirects: 0,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    const status = err.response?.status
    const detail =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message
    if (status === 404 || status === 405) {
      return res.status(501).json({
        error: `"${agent.name}" does not support chat yet.`,
      })
    }
    if (status === 503) {
      return res.status(503).json({ error: detail })
    }
    return res.status(502).json({ error: `Agent chat failed: ${detail}` })
  }

  const answer = response.data?.answer
  if (!answer) {
    return res.status(502).json({ error: 'Agent returned no answer.' })
  }

  const updated = await appendExchange(agent.agentId, callerWallet, question, answer)

  res.json({
    agentId: agent.agentId,
    agentName: agent.name,
    question,
    answer,
  
    ...(response.data?.comparison ? { comparison: response.data.comparison } : {}),
    messages: updated.messages,
    messageCount: updated.messageCount,
  })
})

//get agent convo
const getAgentConversation = asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(req.params.agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  res.json(await getConversation(agent.agentId, req.walletAddress))
})

//delete agent convo
const deleteAgentConversation = asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(req.params.agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  await clearConversation(agent.agentId, req.walletAddress)
  res.json({ success: true })
})

//fetch all converstaion for user
const getMyConversations = asyncHandler(async (req, res) => {
  res.json({ conversations: await listConversations(req.walletAddress) })
})

export { chatWithAgent, getAgentConversation, deleteAgentConversation, getMyConversations }
