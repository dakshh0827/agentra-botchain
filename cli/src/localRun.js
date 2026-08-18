import fs from 'node:fs/promises'
import path from 'node:path'
import { createAgentraClient, verifyLicenseKey } from '@agentra-dev/sdk'
import { fetchRuntimeSecrets } from '@agentra-dev/sdk'
import { loadConfig, saveConfig } from './storage.js'
import { prompt } from './prompts.js'
import { buildLocalRequest } from './requestBuilder.js'

// Deploy forms often mislabel numeric fields as type "text", but the downstream
// agent's JSON schema still requires a real number — send digit-only strings as
// numbers so schema validation ("age must be a positive number") doesn't reject
// them. Leading-zero strings (zip codes, IDs) are left as-is since Number() would
// silently drop the zero.
function coerceNumericLike(raw) {
  if (!/^-?\d+(\.\d+)?$/.test(raw) || /^-?0\d/.test(raw)) return raw
  return Number(raw)
}

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
  const client = createAgentraClient({
    baseUrl: options.baseUrl || config.baseUrl,
    walletAddress,
  })
  const agent = await client.getAgent(agentId)
  const resolvedAgentId = agent?.agentId || String(agentId)
  const saved = config.licenses?.[resolvedAgentId] || config.licenses?.[String(agentId)]
  if (!saved) throw new Error(`Not activated. Run: agentra agent activate ${agentId}`)
  await verifyLicenseKey(saved.licenseKey, { agentId: resolvedAgentId, wallet: walletAddress })
    .catch(() => { throw new Error(`License expired or invalid. Run: agentra agent activate ${agentId}`) })

  const manifest = await getOrFetchManifest(agentId, config)
  const executionConfig = manifest.executionConfig || { headers: [], bodyFields: [] }
  const { headerSecrets, bodySecrets } = await fetchRuntimeSecrets(config.baseUrl, agentId, saved.licenseKey)

  const presetHeaders = (executionConfig.headers || []).filter(h => !h.userProvided)
  const presetBody = (executionConfig.bodyFields || []).filter(f => !f.userProvided)
  if (presetHeaders.length || presetBody.length) {
    console.log('Preset fields (configured by the creator):')
    for (const f of [...presetHeaders, ...presetBody]) console.log(`  - ${f.key}`)
  }

  const headers = {}
  for (const h of presetHeaders) headers[h.key] = h.secret ? headerSecrets[h.key] : h.value
  for (const h of (executionConfig.headers || []).filter(h => h.userProvided)) {
    headers[h.key] = await prompt(`${h.description || h.key}${h.required ? ' (required)' : ' (optional)'}`, h.placeholder || '')
  }

  const body = {}
  const fileNames = {}
  for (const f of presetBody) body[f.key] = f.secret ? bodySecrets[f.key] : f.value
  for (const f of (executionConfig.bodyFields || []).filter(f => f.userProvided)) {
    if (f.type === 'file') {
      const filePath = await prompt(`${f.description || f.key} — file path${f.required ? ' (required)' : ' (optional)'}`, '')
      if (filePath) {
        body[f.key] = await fs.readFile(filePath)
        fileNames[f.key] = path.basename(filePath)
      }
    } else {
      const raw = await prompt(`${f.description || f.key}${f.required ? ' (required)' : ' (optional)'}`, f.placeholder || '')
      body[f.key] = f.type === 'boolean' ? (raw === 'true' || raw === 'yes')
        : f.type === 'number' ? Number(raw)
        : coerceNumericLike(raw)
    }
  }

  const req = buildLocalRequest(manifest.endpoint, executionConfig, { headers, body, fileNames }, options.task)
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body })
  const data = await res.json().catch(() => null)
  console.log(data ? JSON.stringify(data, null, 2) : await res.text())
}

async function getOrFetchManifest(agentId, config) {
  config.manifestCache = config.manifestCache || {}

  if (config.manifestCache[agentId]) {
    return config.manifestCache[agentId]
  }

  const client = createAgentraClient({
    baseUrl: config.baseUrl,
    walletAddress: config.walletAddress || process.env.AGENTRA_WALLET_ADDRESS || null,
  })

  const manifest = await client.getAgentManifest(agentId)

  config.manifestCache[agentId] = manifest
  await saveConfig(config)

  return manifest
}
