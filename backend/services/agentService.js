import prisma from '../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import config from '../config/config.js'

function prismaSupportsAgentField(fieldName) {
  const model = prisma?._runtimeDataModel?.models?.Agent
  if (!model || !Array.isArray(model.fields)) return true
  return model.fields.some((field) => field?.name === fieldName)
}

function buildAgentLookup(id) {
  const value = String(id || '').trim()
  const isObjectId = /^[a-f\d]{24}$/i.test(value)
  const isContractAgentId = /^\d+$/.test(value)

  if (isObjectId) return { id: value }
  if (isContractAgentId) return { contractAgentId: Number(value) }
  return { agentId: value }
}

async function ensureUniqueAgentName(name, excludeAgentId = null) {
  const existing = await prisma.agent.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(excludeAgentId ? { id: { not: excludeAgentId } } : {}),
    },
  })

  if (existing) {
    const error = new Error(`Agent name "${name}" is already in use`)
    error.status = 409
    throw error
  } 
} 

class AgentService {
  async createAgent(data, ownerWallet) {
    const {
      name,
      description,
      endpoint = '',
      category,
      tags = [],
      pricing,
      lifetimeMultiplier,
      commsEnabled,
      commsPricePerCall,
      mcpSchema,
      tier,
      metadataUri,
      contractAgentId,
      txHash,
    } = data

    await ensureUniqueAgentName(name)

    const agent = await prisma.agent.create({
      data: {
        agentId: `AGT-${uuidv4().slice(0, 8).toUpperCase()}`,
        name,
        description,
        endpoint,
        category,
        tags,
        pricing: String(pricing),
        lifetimeMultiplier: lifetimeMultiplier ?? 12,
        commsEnabled: commsEnabled ?? false,
        commsPricePerCall: String(commsPricePerCall || '0'),
        tier,
        metadataUri: metadataUri || null,
        contractAgentId: contractAgentId || null,
        txHash: txHash || null,
        mcpSchema: mcpSchema || null,
        ownerWallet: ownerWallet.toLowerCase(),
        status: 'draft',
      },
    })

    await prisma.usageMetrics.create({
      data: { agentId: agent.id },
    })

    await prisma.globalStats.upsert({
      where: { id: 'global' },
      update: { totalAgents: { increment: 1 } },
      create: { id: 'global', totalAgents: 1, activeAgents: 0, totalCalls: 0, totalRevenue: '0' },
    })

    return agent
  }

  async activateAgent(contractAgentId) {
    await prisma.agent.updateMany({
      where: { contractAgentId },
      data: { status: 'active' },
    })

    await prisma.globalStats.upsert({
      where: { id: 'global' },
      update: { activeAgents: { increment: 1 } },
      create: { id: 'global', totalAgents: 1, activeAgents: 1, totalCalls: 0, totalRevenue: '0' },
    })
  }

  async validateEndpoint(endpoint) {
    if (!endpoint) return { valid: false, error: 'No endpoint provided' }

    const urls = [`${endpoint}/health`, `${endpoint}/ping`, endpoint]

    for (const url of urls) {
      try {
        const res = await axios.get(url, {
          timeout: 5000,
          validateStatus: (s) => s < 500,
        })
        return { valid: true, status: res.status, url }
      } catch {
        continue
      }
    }

    return { valid: false, error: 'Endpoint unreachable' }
  }

  async getAgents({
    category,
    search,
    status,
    sortBy = 'score',
    page = 1,
    limit = 20,
    ownerWallet,
    official,
  } = {}) {
    const where = {}

    if (official === true) where.isOfficial = true

    if (status && status !== 'all') {
      where.status = status
    } else {
      where.status = { not: 'inactive' }
    }

    if (category && category !== 'all') where.category = category
    if (ownerWallet) where.ownerWallet = ownerWallet.toLowerCase()

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ]
    }

    const orderByMap = {
      score: { score: 'desc' },
      rating: { rating: 'desc' },
      calls: { calls: 'desc' },
      newest: { createdAt: 'desc' },
    }

    const orderBy = orderByMap[sortBy] || orderByMap.score

    const [agents, total] = await prisma.$transaction([
      prisma.agent.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          metrics: true,
        },
      }),
      prisma.agent.count({ where }),
    ])

    // Attach helpful display fields so frontend can show contract/deployer info
    const enriched = agents.map((a) => ({
      ...a,
      contractAddress: a.contractAgentId ? config.blockchain.contracts.agentra || null : null,
      deployerAddress: a.ownerWallet || null,
    }))

    return {
      agents: enriched,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }
  }

  async getById(id) {
    const agent = await prisma.agent.findFirst({
      where: buildAgentLookup(id),
      include: {
        metrics: true,
      },
    })

    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })
    // Add contractAddress + deployerAddress for single agent responses
    return {
      ...agent,
      contractAddress: agent.contractAgentId ? config.blockchain.contracts.agentra || null : null,
      deployerAddress: agent.ownerWallet || null,
    }
  }

  async updateAgent(id, updates, wallet) {
    const agent = await prisma.agent.findFirst({
      where: buildAgentLookup(id),
    })

    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })
    if (agent.ownerWallet !== wallet.toLowerCase()) {
      throw Object.assign(new Error('Not authorized'), { status: 403 })
    }

    if (updates.name) {
      await ensureUniqueAgentName(updates.name, agent.id)
    }

    const allowed = [
      'name',
      'description',
      'endpoint',
      'tags',
      'mcpSchema',
      'executionConfig',
      'category',
      'pricing',
      'lifetimeMultiplier',
      'commsEnabled',
      'commsPricePerCall',
    ]

    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    )

    return prisma.agent.update({
      where: { id: agent.id },
      data: safeUpdates,
      include: { metrics: true },
    })
  }

  async deactivateAgent(id, wallet) {
    const agent = await prisma.agent.findFirst({
      where: buildAgentLookup(id),
    })

    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })
    if (agent.ownerWallet !== wallet.toLowerCase()) {
      throw Object.assign(new Error('Not authorized'), { status: 403 })
    }

    return prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'inactive' },
    })
  }

  async recordExecution(agentId, { success, latency }) {
    await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({ where: { agentId } })
      if (!agent) return

      const newCalls = agent.calls + 1
      const prevSuccessCount = Math.round((agent.successRate / 100) * agent.calls)
      const newSuccessCount = prevSuccessCount + (success ? 1 : 0)
      const newSuccessRate = parseFloat(((newSuccessCount / newCalls) * 100).toFixed(2))

      await tx.agent.update({
        where: { id: agent.id },
        data: {
          calls: { increment: 1 },
          successRate: newSuccessRate,
        },
      })

      const metrics = await tx.usageMetrics.findUnique({ where: { agentId: agent.id } })

      if (metrics) {
        const newAvgLatency =
          metrics.calls === 0
            ? latency
            : Math.round((metrics.avgLatency * metrics.calls + (latency || 0)) / (metrics.calls + 1))

        await tx.usageMetrics.update({
          where: { agentId: agent.id },
          data: {
            calls: { increment: 1 },
            successRate: newSuccessRate,
            avgLatency: newAvgLatency,
          },
        })
      }

      await tx.globalStats.upsert({
        where: { id: 'global' },
        update: { totalCalls: { increment: 1 } },
        create: { id: 'global', totalAgents: 0, activeAgents: 0, totalCalls: 1, totalRevenue: '0' },
      })
    })
  }

  async searchAgents(query) {
    return prisma.agent.findMany({
      where: {
        status: { not: 'inactive' },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
          { category: { equals: query } },
        ],
      },
      take: 20,
      orderBy: { score: 'desc' },
    })
  }
}

export default new AgentService()