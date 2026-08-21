import prisma from '../lib/prisma.js'


const MAX_STORED_MESSAGES = 40


const PREVIEW_CHARS = 160

function normalizeWallet(wallet) {
  return String(wallet || '').toLowerCase()
}

// Only the fields we store, and only the roles the agent contract allows
function sanitize(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').slice(0, 8000),
      at: m.at || new Date().toISOString(),
    }))
}

export async function getConversation(agentId, callerWallet) {
  const row = await prisma.agentConversation.findUnique({
    where: {
      agentId_callerWallet: { agentId, callerWallet: normalizeWallet(callerWallet) },
    },
  })

  if (!row) return { agentId, messages: [], messageCount: 0, lastMessageAt: null }

  return {
    agentId,
    messages: sanitize(row.messages),
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt,
  }
}


export async function appendExchange(agentId, callerWallet, question, answer) {
  const wallet = normalizeWallet(callerWallet)
  const existing = await getConversation(agentId, wallet)
  const now = new Date()

  const messages = [
    ...existing.messages,
    { role: 'user', content: String(question).slice(0, 8000), at: now.toISOString() },
    { role: 'assistant', content: String(answer).slice(0, 8000), at: now.toISOString() },
  ].slice(-MAX_STORED_MESSAGES)

  const data = {
    messages,
    lastMessage: String(answer).slice(0, PREVIEW_CHARS),
    messageCount: messages.length,
    lastMessageAt: now,
  }

  await prisma.agentConversation.upsert({
    where: { agentId_callerWallet: { agentId, callerWallet: wallet } },
    update: data,
    create: { agentId, callerWallet: wallet, ...data },
  })

  return { agentId, ...data }
}

export async function clearConversation(agentId, callerWallet) {
  await prisma.agentConversation.deleteMany({
    where: { agentId, callerWallet: normalizeWallet(callerWallet) },
  })
}


export async function listConversations(callerWallet, limit = 20) {
  const rows = await prisma.agentConversation.findMany({
    where: { callerWallet: normalizeWallet(callerWallet) },
    orderBy: { lastMessageAt: 'desc' },
    take: limit,
    include: { agent: { select: { name: true, category: true, isOfficial: true } } },
  })

  return rows.map((row) => ({
    agentId: row.agentId,
    agentName: row.agent?.name || row.agentId,
    category: row.agent?.category || null,
    isOfficial: !!row.agent?.isOfficial,
    lastMessage: row.lastMessage,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt,
  }))
}

export default { getConversation, appendExchange, clearConversation, listConversations }
