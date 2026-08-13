import agentService from '../services/agentService.js'
import prisma from '../lib/prisma.js'
import contractManager from '../lib/contractManager.js'
import config from '../config/config.js'
import { resolveAgentMetadata, uploadAgentMetadata } from '../services/storageService.js'
import { getAgentAccessState, recordAgentPurchase } from '../services/accessService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { ethers } from 'ethers'
import { z } from 'zod'
import { encryptLlmKey as encryptSecretValue } from '../utils/cryptoKey.js'

const AGENTRA_CONFIRM_EVENT_ABI = [
  'event AgentDeployed(uint256 indexed agentId, address indexed creator, uint8 tier, uint256 listingFeePaidUSD)',
]

const agentraEventInterface = new ethers.Interface(AGENTRA_CONFIRM_EVENT_ABI)

function buildAgentLookup(id) {
  const value = String(id || '').trim()
  const isObjectId = /^[a-f\d]{24}$/i.test(value)
  const isContractAgentId = /^\d+$/.test(value)

  if (isObjectId) return { id: value }
  if (isContractAgentId) return { OR: [{ agentId: value }, { contractAgentId: Number(value) }] }
  return { agentId: value }
}

// ── Validation schemas ────────────────────────────────────────

const executionContentTypeSchema = z.enum(['json', 'form-data', 'x-www-form-urlencoded'])

const executionFieldTypeSchema = z.enum(['text', 'textarea', 'number', 'file', 'password', 'boolean'])

const executionHeaderFieldSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().optional(),
  required: z.boolean(),
  secret: z.boolean(),
  userProvided: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
})

const executionBodyFieldSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Key must be a valid identifier'),
  type: executionFieldTypeSchema,
  value: z.string().optional(),
  secret: z.boolean().optional().default(false),
  required: z.boolean(),
  userProvided: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
})

const executionConfigSchema = z.object({
  method: z.literal('POST'),
  contentType: executionContentTypeSchema,
  headers: z.array(executionHeaderFieldSchema).max(20),
  bodyFields: z.array(executionBodyFieldSchema).max(30),
}).superRefine((config, ctx) => {
  const headerKeys = config.headers.map(h => h.key)
  const bodyKeys = config.bodyFields.map(f => f.key)
  if (new Set(headerKeys).size !== headerKeys.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate header keys are not allowed' })
  }
  if (new Set(bodyKeys).size !== bodyKeys.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate body field keys are not allowed' })
  }
})

const deploySchema = z.object({
  name: z.string().min(2).max(64), 
  description: z.string().min(10).max(1000).optional(),
  category: z.enum(['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']),
  tags: z.array(z.string().max(32)).max(10).optional(),
  pricing: z.string(),             // monthly price in wei
  lifetimeMultiplier: z.number().int().min(1).max(36).optional().default(12),
  commsEnabled: z.boolean().optional().default(false),
  commsPricePerCall: z.string().optional().default('0'),
  tier: z.enum(['Standard', 'Professional', 'Enterprise']),
  endpoint: z.string().url(),
  mcpSchema: z.record(z.string(), z.unknown()).optional(),
  executionConfig: executionConfigSchema.optional(),
  deployMode: z.enum(['database', 'blockchain']).optional(),
  status: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  description: z.string().min(10).max(1000).optional(),
  endpoint: z.string().url().optional(),
  pricing: z.string().optional(),
  lifetimeMultiplier: z.number().int().min(1).max(36).optional(),
  commsEnabled: z.boolean().optional(),
  commsPricePerCall: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.enum(['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']).optional(),
})

function encryptExecutionConfigSecrets(executionConfig) {
  if (!executionConfig) return executionConfig
  const encryptField = (f) => (f.secret && !f.userProvided && f.value) ? { ...f, value: encryptSecretValue(f.value) } : f
  return {
    ...executionConfig,
    headers: (executionConfig.headers || []).map(encryptField),
    bodyFields: (executionConfig.bodyFields || []).map(encryptField),
  }
}

function stripExecutionConfigSecrets(executionConfig) {
  if (!executionConfig) return executionConfig
  const stripField = (f) => (f.secret && !f.userProvided) ? { ...f, value: undefined } : f
  return {
    ...executionConfig,
    headers: (executionConfig.headers || []).map(stripField),
    bodyFields: (executionConfig.bodyFields || []).map(stripField),
  }
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

// ── Controllers ───────────────────────────────────────────────

const getAgents = asyncHandler(async (req, res) => {
  const { category, search, status, sortBy, page, limit, mine } = req.query

  const result = await agentService.getAgents({
    category: category === 'all' ? undefined : category,
    search,
    status: (!status || status === 'all') ? 'active' : status,
    sortBy: sortBy || 'score',
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100),
    ownerWallet: mine === 'true' ? req.walletAddress : undefined,
  })

  res.json(result)
})

const getAgentById = asyncHandler(async (req, res) => {
  const agent = await agentService.getById(req.params.id)
  res.json(agent)
})

const getAgentManifest = asyncHandler(async (req, res) => {
  const agent = await agentService.getById(req.params.agentId)

  if (!agent?.metadataUri) {
    return res.status(404).json({ error: 'Agent manifest not found' })
  }

  console.log("Metadata URI:", agent.metadataUri);

  const manifest = await resolveAgentMetadata(agent.metadataUri)

console.log('\n====== MANIFEST FETCH ======')
console.log('Agent ID:', req.params.agentId)
console.log(JSON.stringify(manifest, null, 2))
console.log('============================\n')

res.json(manifest)
})

// ── DEPLOY AGENT (ON-CHAIN + DB) ───────────────────────────

const deployAgent = asyncHandler(async (req, res) => {
  const data = deploySchema.parse(req.body)
  await ensureUniqueAgentName(data.name)

  const encryptedExecutionConfig = encryptExecutionConfigSecrets(data.executionConfig)

  const metadataPayload = {
    name: data.name,
    description: data.description || '',
    category: data.category,
    tags: data.tags || [],
    endpoint: data.endpoint,
    tier: data.tier,
    pricing: data.pricing,
    lifetimeMultiplier: data.lifetimeMultiplier ?? 12,
    commsEnabled: data.commsEnabled ?? false,
    commsPricePerCall: data.commsPricePerCall || '0',
    mcpSchema: data.mcpSchema || null,
    executionConfig: stripExecutionConfigSecrets(data.executionConfig) || null,
    deployMode: data.deployMode || 'database',
  }

  console.log('\n========== DEPLOY ==========')
console.log('Metadata Payload:')
console.log(JSON.stringify(metadataPayload, null, 2))
console.log('============================\n')

  const { metadataUri: metadataURI } = await uploadAgentMetadata(metadataPayload)
  console.log('\n====== METADATA UPLOADED ======')
console.log('Metadata URI:', metadataURI)
console.log('===============================\n')
  const isBlockchain = data.deployMode === 'blockchain'

  // For database-only deploys, skip the contract call
  if (!isBlockchain) {
    const agent = await prisma.agent.create({
      data: {
      name: data.name,
      description: data.description,
      metadataUri: metadataURI,
      ownerWallet: req.walletAddress,
      endpoint: data.endpoint,
      tier: data.tier,
      pricing: data.pricing,
      lifetimeMultiplier: data.lifetimeMultiplier ?? 12,
      commsEnabled: data.commsEnabled ?? false,
      commsPricePerCall: data.commsPricePerCall || '0',
      category: data.category,
      tags: data.tags || [],
      mcpSchema: data.mcpSchema || null,
      executionConfig: encryptedExecutionConfig || null,
      status: 'active',
      txHash: null,
      },
    })

    await prisma.usageMetrics.create({ data: { agentId: agent.id } })

    await prisma.globalStats.upsert({
      where: { id: 'global' },
      update: { totalAgents: { increment: 1 }, activeAgents: { increment: 1 } },
      create: { id: 'global', totalAgents: 1, activeAgents: 1, totalCalls: 0, totalRevenue: '0' },
    })

    return res.status(201).json(agent)
  }

  // Blockchain deploys are draft-first: the frontend submits the wallet tx,
  // then calls confirmDeploy once the transaction is mined.
  const agent = await prisma.agent.create({
    data: {
    name: data.name,
    description: data.description,
    metadataUri: metadataURI,
    ownerWallet: req.walletAddress,
    endpoint: data.endpoint,
    tier: data.tier,
    pricing: data.pricing,
    lifetimeMultiplier: data.lifetimeMultiplier ?? 12,
    commsEnabled: data.commsEnabled ?? false,
    commsPricePerCall: data.commsPricePerCall || '0',
    category: data.category,
    tags: data.tags || [],
    mcpSchema: data.mcpSchema || null,
    executionConfig: encryptedExecutionConfig || null,
    status: 'draft',
    txHash: null,
    },
  })

  await prisma.usageMetrics.create({ data: { agentId: agent.id } })

  await prisma.globalStats.upsert({
    where: { id: 'global' },
    update: { totalAgents: { increment: 1 } },
    create: { id: 'global', totalAgents: 1, activeAgents: 0, totalCalls: 0, totalRevenue: '0' },
  })

  res.status(201).json(agent)
})

// ── CONFIRM DEPLOY (SYNC CONTRACT ID) ──────────────────────────

const confirmDeploy = asyncHandler(async (req, res) => {
  const { contractAgentId, txHash } = req.body
  const { id } = req.params

  if (!txHash) {
    return res.status(400).json({ error: 'txHash is required to confirm a blockchain deploy' })
  }

  const parsedContractAgentId = Number.parseInt(contractAgentId, 10)
  if (!Number.isInteger(parsedContractAgentId) || parsedContractAgentId < 0) {
    return res.status(400).json({ error: 'contractAgentId is required and must be a valid non-negative integer' })
  }

  const confirmed = await contractManager.isTransactionConfirmed(txHash)
  if (!confirmed) {
    return res.status(400).json({ error: 'Provided txHash is not confirmed on-chain' })
  }

  if (!config.blockchain.rpcUrl) {
    return res.status(500).json({ error: 'Blockchain RPC URL is not configured' })
  }

  const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)
  const receipt = await provider.getTransactionReceipt(txHash)
  if (!receipt || receipt.status !== 1) {
    return res.status(400).json({ error: 'Provided txHash did not produce a successful on-chain receipt' })
  }

  let deployedEvent = null
  for (const log of receipt.logs) {
    try {
      const parsed = agentraEventInterface.parseLog({ topics: log.topics, data: log.data })
      if (parsed?.name === 'AgentDeployed') {
        deployedEvent = parsed
        break
      }
    } catch {
      // Ignore unrelated logs
    }
  }

  if (!deployedEvent) {
    return res.status(400).json({ error: 'No AgentDeployed event found in the confirmed transaction' })
  }

  const emittedAgentId = Number(deployedEvent.args.agentId)
  const emittedCreator = String(deployedEvent.args.creator || '').toLowerCase()

  if (emittedAgentId !== parsedContractAgentId) {
    return res.status(400).json({ error: 'contractAgentId does not match the on-chain deployed agent' })
  }

  if (emittedCreator !== (req.walletAddress || '').toLowerCase()) {
    return res.status(400).json({ error: 'On-chain agent creator does not match connected wallet' })
  }

  const existingAgent = await prisma.agent.findFirst({
    where: { id, ownerWallet: req.walletAddress },
  })

  if (!existingAgent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  const agent = await prisma.agent.update({
    where: { id: existingAgent.id },
    data: {
      status: 'active',
      contractAgentId: parsedContractAgentId,
      txHash,
      isVerified: true,
    },
  })

  // const listingFeeWei = '0'

  await prisma.transaction.upsert({
    where: { txHash },
    update: {
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet: req.walletAddress,
      ownerWallet: req.walletAddress,
      totalAmount: '0',
      platformFee: '0',
      creatorAmount: '0',
    },
    create: {
      txHash,
      type: 'deploy',
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet: req.walletAddress,
      ownerWallet: req.walletAddress,
      totalAmount: '0',
      platformFee: '0',
      creatorAmount: '0',
    },
  })

  await prisma.globalStats.upsert({
    where: { id: 'global' },
    update: { activeAgents: { increment: 1 } },
    create: { id: 'global', totalAgents: 1, activeAgents: 1, totalCalls: 0, totalRevenue: '0' },
  })

  res.json({ success: true, agent })
})

// ── CANCEL DRAFT ───────────────────────────────────────────

const cancelDraft = asyncHandler(async (req, res) => {
  const { id } = req.params

  const deleted = await prisma.agent.deleteMany({
    where: { id, status: 'draft', ownerWallet: req.walletAddress },
  })

  if (!deleted.count) {
    return res.status(404).json({ error: 'Draft not found' })
  }

  res.json({ success: true })
})

// ── PURCHASE ACCESS ────────────────────────────────────────────
// For blockchain agents: txHash is provided after client-side wallet tx
// For database agents: no txHash needed, access granted immediately

const purchaseAccess = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const { isLifetime, txHash } = req.body

  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  // Owner always has access
  if (agent.ownerWallet === req.walletAddress) {
    return res.status(400).json({ error: 'You own this agent' })
  }

  // ✅ REQUIRED: escrow tx must exist
  if (!txHash) {
    return res.status(400).json({ error: 'txHash required: purchase must be processed by wallet first' })
  }

  // ✅ Ensure tx is mined (not necessarily settled)
  const confirmed = await contractManager.isTransactionConfirmed(txHash)
  if (!confirmed) {
    return res.status(400).json({ error: 'Provided txHash is not confirmed on-chain' })
  }

  const multiplier = BigInt(agent.lifetimeMultiplier ?? 12)
  const monthlyWei = BigInt(agent.pricing)
  const totalCost = isLifetime
    ? (monthlyWei * multiplier).toString()
    : monthlyWei.toString()

  // Keep creator/platform split consistent with other monetized flows.
  const totalWei = BigInt(totalCost)
  const platformFeeWei = (totalWei * 20n / 100n).toString()
  const creatorAmountWei = (totalWei - BigInt(platformFeeWei)).toString()

  const expiresAt = isLifetime
    ? new Date('9999-12-31')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // ✅ Grant access immediately (UX decision)
  await prisma.agentAccess.upsert({
    where: {
      agentId_userWallet: {
        agentId: agent.agentId,
        userWallet: req.walletAddress,
      },
    },
    update: {
      isLifetime: isLifetime || false,
      expiresAt,
      txHash,
    },
    create: {
      agentId: agent.agentId,
      userWallet: req.walletAddress,
      isLifetime: isLifetime || false,
      expiresAt,
      txHash,
    },
  })

  await recordAgentPurchase({
    agent,
    walletAddress: req.walletAddress,
    txHash,
    isLifetime: isLifetime || false,
    expiresAt,
  })

  // Persist as confirmed once on-chain inclusion is verified by txHash.
  await prisma.transaction.upsert({
    where: { txHash },
    update: {
      type: 'purchase_access',
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet: req.walletAddress,
      ownerWallet: agent.ownerWallet,
      totalAmount: totalCost,
      platformFee: platformFeeWei,
      creatorAmount: creatorAmountWei,
    },
    create: {
      txHash,
      type: 'purchase_access',
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet: req.walletAddress,
      ownerWallet: agent.ownerWallet,
      totalAmount: totalCost,
      platformFee: platformFeeWei,
      creatorAmount: creatorAmountWei,
    },
  })

  // Keep denormalized revenue in sync with purchase persistence.
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      revenue: (BigInt(agent.revenue || '0') + BigInt(creatorAmountWei)).toString(),
    },
  })

  // ❌ REMOVED:
  // - platformFee calculation
  // - creatorAmount calculation
  // - revenue update

  res.json({
    success: true,
    txHash,
    expiresAt,
    status: 'confirmed',
  })
})

// ── UPVOTE ─────────────────────────────────────────────────────
// DB agents: free upvote, tracked by AgentUpvote table to prevent dupes
// Blockchain agents: txHash required (wallet payment done client-side)

const upvoteAgent = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const { txHash } = req.body // optional now
  const voterWallet = req.walletAddress

  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  if (agent.ownerWallet === voterWallet) {
    return res.status(400).json({ error: 'Cannot upvote your own agent' })
  }

  // Check for duplicate upvote
  const existing = await prisma.agentUpvote.findUnique({
    where: { agentId_voterWallet: { agentId: agent.agentId, voterWallet } },
  })

  if (existing) {
    return res.status(409).json({ error: 'Already upvoted this agent' })
  }

  // Record upvote
  await prisma.agentUpvote.create({
    data: {
      agentId: agent.agentId,
      voterWallet,
      txHash: txHash || null,
    },
  })

  // Increment upvotes
  await prisma.agent.update({
    where: { id: agent.id },
    data: { upvotes: { increment: 1 } },
  })

  // Transaction record (no payment)
  const txRecord = txHash || `upvote_${agent.agentId}_${Date.now()}`

  await prisma.transaction.upsert({
    where: { txHash: txRecord },
    update: {},
    create: {
      txHash: txRecord,
      type: 'upvote',
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet: voterWallet,
      ownerWallet: agent.ownerWallet,
      totalAmount: '0',
      platformFee: '0',
      creatorAmount: '0',
    },
  })

  res.json({ success: true, txHash: txRecord })
})

// ── CHECK UPVOTE STATUS ────────────────────────────────────────
const checkUpvote = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const walletAddress = req.walletAddress

  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  const existing = await prisma.agentUpvote.findUnique({
    where: { agentId_voterWallet: { agentId: agent.agentId, voterWallet: walletAddress } },
  })

  res.json({ hasUpvoted: !!existing })
})

// ── CHECK ACCESS ──────────────────────────────────────────────

const checkAccess = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const walletAddress = req.walletAddress

  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(agentId) })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  const accessState = await getAgentAccessState(agent, walletAddress)

  if (accessState.hasAccess) {
    return res.json({ hasAccess: true, reason: accessState.reason, expiresAt: accessState.access?.expiresAt || accessState.purchase?.expiresAt || null })
  }

  res.json({ hasAccess: false })
})

// ── UPDATE / DELETE ───────────────────────────────────────────

const updateAgent = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body)
  if (data.name) {
    const existingAgent = await prisma.agent.findFirst({
      where: {
        OR: [{ id: req.params.id }, { agentId: req.params.id }, ...( /^\d+$/.test(String(req.params.id || '').trim()) ? [{ contractAgentId: Number(req.params.id) }] : [])],
      },
    })

    if (existingAgent) {
      await ensureUniqueAgentName(data.name, existingAgent.id)
    }
  }
  const updatedAgent = await agentService.updateAgent(req.params.id, data, req.walletAddress)
  res.json(updatedAgent)
})

const deleteAgent = asyncHandler(async (req, res) => {
  await agentService.deactivateAgent(req.params.id, req.walletAddress)
  res.json({ message: 'Agent deactivated successfully' })
})

// ── OTHER ─────────────────────────────────────────────────────

const validateEndpoint = asyncHandler(async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
  const result = await agentService.validateEndpoint(endpoint)
  res.json(result)
})

const searchAgents = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'query param q required' })
  const agents = await agentService.searchAgents(q)
  res.json(agents)
})

export {
  getAgents,
  getAgentById,
  getAgentManifest,
  deployAgent,
  confirmDeploy,
  cancelDraft,
  purchaseAccess,
  upvoteAgent,
  checkUpvote,
  checkAccess,
  updateAgent,
  deleteAgent,
  validateEndpoint,
  searchAgents,
}