import fs from 'node:fs/promises'
import path from 'node:path'
import { createAgentraClient, fetchRuntimeKey, verifyLicenseKey } from '@agentra-dev/sdk'
import { loadConfig, saveConfig } from './storage.js'
import { prompt } from './prompts.js'

function resolveWalletAddress(config, options = {}) {
  const candidate = options.address || process.env.AGENTRA_WALLET_ADDRESS || config.walletAddress || null
  return candidate ? String(candidate).trim().toLowerCase() : null
}

export async function handleActivate(agentId, options) {
  const config = await loadConfig()
  const walletAddress = resolveWalletAddress(config, options)
  if (!walletAddress) throw new Error('Wallet address is required. Run: agentra login --address <wallet> or pass --address <wallet>')
  const client = createAgentraClient({ baseUrl: options.baseUrl || config.baseUrl, walletAddress })
  const agent = await client.getAgent(agentId)
  const resolvedAgentId = agent?.agentId || String(agentId)
  const { licenseKey, expiresAt } = await client.getLicenseKey(agentId, { walletAddress })
  await verifyLicenseKey(licenseKey, { agentId: resolvedAgentId, wallet: walletAddress })
  config.walletAddress = walletAddress
  config.licenses = config.licenses || {}
  config.licenses[String(agentId)] = { licenseKey, expiresAt }
  config.licenses[resolvedAgentId] = { licenseKey, expiresAt }
  await saveConfig(config)
  console.log(`Activated. Valid until ${expiresAt}.`)
}

export async function handleRun(agentId, options) {
  const config = await loadConfig()
  const walletAddress = resolveWalletAddress(config, options)
  if (!walletAddress) throw new Error('Wallet address is required. Run: agentra login --address <wallet> or pass --address <wallet>')
  const client = createAgentraClient({ baseUrl: config.baseUrl, walletAddress })
  const agent = await client.getAgent(agentId)
  const resolvedAgentId = agent?.agentId || String(agentId)
  const saved = config.licenses?.[resolvedAgentId] || config.licenses?.[String(agentId)]
  if (!saved) throw new Error(`Not activated. Run: agentra agent activate ${agentId}`)

  try {
    await verifyLicenseKey(saved.licenseKey, { agentId: resolvedAgentId, wallet: walletAddress })
  } catch {
    throw new Error(`License expired or invalid. Run: agentra agent activate ${agentId}`)
  }

  const manifest = await getOrFetchManifest(agentId, config)
  let fileBlock = options.file ? await readFileAsContentBlock(options.file) : null
  const requiredFile = manifest.inputs?.find((i) => i.required && i.type === 'file')
  if (requiredFile && !fileBlock) {
    const filePath = await prompt(`File required (${requiredFile.accept.join(', ')}). Path`)
    fileBlock = await readFileAsContentBlock(filePath)
  }
  const apiKey = await fetchRuntimeKey(config.baseUrl, agentId, saved.licenseKey)
  await runLocalAgentLoop(manifest, { task: options.task, fileBlock, apiKey })
}

async function getOrFetchManifest(agentId, config) {
  config.manifestCache = config.manifestCache || {}
  if (config.manifestCache[agentId]) return config.manifestCache[agentId]
  const client = createAgentraClient({ baseUrl: config.baseUrl, walletAddress: config.walletAddress })
  const manifest = await client.getAgentManifest(agentId)
  config.manifestCache[agentId] = manifest
  await saveConfig(config)
  return manifest
}

async function readFileAsContentBlock(filePath) {
  const buffer = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mediaType = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[ext]
  if (!mediaType) throw new Error(`Unsupported file type: ${ext}`)
  return { type: mediaType === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } }
}

async function runLocalAgentLoop(manifest, { task, fileBlock, apiKey }) {
  const content = [...(fileBlock ? [fileBlock] : []), { type: 'text', text: task || '' }]
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: manifest.model || 'claude-opus-4-8',
      max_tokens: manifest.maxTokens || 1024,
      system: manifest.systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `Request failed with status ${response.status}`)
  console.log(data.content?.map((b) => b.text).join('\n') || JSON.stringify(data))
}
