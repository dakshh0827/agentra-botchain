import fs from 'node:fs/promises'
import path from 'node:path'
import { createAgentraClient, fetchRuntimeKey, verifyLicenseKey } from '@agentra-dev/sdk'
import { loadConfig, saveConfig } from './storage.js'
import { prompt } from './prompts.js'
import { callLLM } from './providers.js'

export async function handleActivate(agentId, options) {
  const config = await loadConfig()
  const client = createAgentraClient({ baseUrl: options.baseUrl || config.baseUrl, walletAddress: config.walletAddress })
  const agent = await client.getAgent(agentId)
  const resolvedAgentId = agent?.agentId || String(agentId)
  const { licenseKey, expiresAt } = await client.getLicenseKey(agentId)
  await verifyLicenseKey(licenseKey, { agentId: resolvedAgentId, wallet: config.walletAddress })
  config.licenses = config.licenses || {}
  config.licenses[String(agentId)] = { licenseKey, expiresAt }
  config.licenses[resolvedAgentId] = { licenseKey, expiresAt }
  await saveConfig(config)
  console.log(`Activated. Valid until ${expiresAt}.`)
}

export async function handleRun(agentId, options) {
  const config = await loadConfig()
  const client = createAgentraClient({ baseUrl: config.baseUrl, walletAddress: config.walletAddress })
  const agent = await client.getAgent(agentId)
  const resolvedAgentId = agent?.agentId || String(agentId)
  const saved = config.licenses?.[resolvedAgentId] || config.licenses?.[String(agentId)]
  if (!saved) throw new Error(`Not activated. Run: agentra agent activate ${agentId}`)

  try {
    await verifyLicenseKey(saved.licenseKey, { agentId: resolvedAgentId, wallet: config.walletAddress })
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

  if (config.manifestCache[agentId]) {
    console.log("\n===== USING CACHED MANIFEST =====");
    console.log(JSON.stringify(config.manifestCache[agentId], null, 2));
    console.log("=================================\n");
    return config.manifestCache[agentId];
  }

  const client = createAgentraClient({
    baseUrl: config.baseUrl,
    walletAddress: config.walletAddress,
  });

  const manifest = await client.getAgentManifest(agentId);

  console.log("\n===== FETCHED MANIFEST =====");
  console.log(JSON.stringify(manifest, null, 2));
  console.log("============================\n");

  config.manifestCache[agentId] = manifest;
  await saveConfig(config);

  return manifest;
}

async function readFileAsContentBlock(filePath) {
  const buffer = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mediaType = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[ext]
  if (!mediaType) throw new Error(`Unsupported file type: ${ext}`)
  return { type: mediaType === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } }
}

async function runLocalAgentLoop(manifest, { task, fileBlock, apiKey }) {
  console.log("\n===== MANIFEST BEFORE callLLM =====");
  console.log(JSON.stringify(manifest, null, 2));
  console.log("===================================\n");

  const content = [
    ...(fileBlock ? [fileBlock] : []),
    { type: "text", text: task || "" },
  ];

  const output = await callLLM(manifest, { content, apiKey });
  console.log(output);
}
