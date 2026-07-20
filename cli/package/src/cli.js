import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { createAgentraClient } from '@agentra-dev/sdk'
import { clearConfig, getConfigLocation, getWorkspaceRuntimeFiles, loadConfig, saveConfig } from './storage.js'
import { prompt } from './prompts.js'
import { handleActivate, handleRun } from './localRun.js'

function parseArgs(argv) {
  const positionals = []
  const options = {}

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]
    if (!value.startsWith('--')) {
      positionals.push(value)
      continue
    }

    const [keyPart, inlineValue] = value.split('=', 2)
    const key = keyPart.slice(2)

    if (inlineValue !== undefined) {
      options[key] = inlineValue
      continue
    }

    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      options[key] = next
      i++
    } else {
      options[key] = true
    }
  }

  return { positionals, options }
}

function parseJson(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  return JSON.parse(String(value))
}

function toWalletAddress(value) {
  return String(value || '').trim().toLowerCase()
}

function printJson(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n')
}

function printHelp() {
  process.stdout.write(`Agentra CLI\n\n`)
  process.stdout.write(`Commands:\n`)
  process.stdout.write(`  agentra doctor\n`)
  process.stdout.write(`  agentra login [--address <wallet>] [--base-url <url>]\n`)
  process.stdout.write(`  agentra whoami\n`)
  process.stdout.write(`  agentra logout\n`)
  process.stdout.write(`  agentra auth nonce <address>\n`)
  process.stdout.write(`  agentra auth verify --address <wallet> --signature <sig> --message <msg>\n`)
  process.stdout.write(`  agentra agents list [--status active] [--search term]\n`)
  process.stdout.write(`  agentra agents get <id>\n`)
  process.stdout.write(`  agentra agents deploy [flags]\n`)
  process.stdout.write(`  agentra agents execute <id> --task <text>\n`)
  process.stdout.write(`  agentra agents compose --agents '[...]'\n`)
  process.stdout.write(`  agentra runtime init --docker [--name <name>] [--output <dir>]\n`)
  process.stdout.write(`  agentra agent activate <id>          Activate offline license for a purchased agent\n`)
  process.stdout.write(`  agentra agent run <id> [--task ""] [--file path]   Run agent locally, offline\n`)
}

async function loadRuntimePayload(options) {
  if (options['runtime-payload']) return parseJson(options['runtime-payload'])
  if (options['payload-file']) {
    const raw = await fs.readFile(options['payload-file'], 'utf8')
    return JSON.parse(raw)
  }
  return undefined
}

async function loadAgentsPayload(options) {
  if (options.file) {
    const raw = await fs.readFile(options.file, 'utf8')
    return JSON.parse(raw)
  }
  if (options.agents) return parseJson(options.agents)
  throw new Error('agents payload is required')
}

async function ensureClient(options = {}) {
  const stored = await loadConfig()
  const baseUrl = options.baseUrl || process.env.AGENTRA_BASE_URL || stored.baseUrl || 'http://localhost:5001'
  const walletAddress = options.address || process.env.AGENTRA_WALLET_ADDRESS || stored.walletAddress || null

  return createAgentraClient({
    baseUrl,
    walletAddress,
    timeoutMs: options.timeoutMs,
  })
}

async function handleLogin(options) {
  let address = options.address || process.env.AGENTRA_WALLET_ADDRESS
  let baseUrl = options['base-url'] || process.env.AGENTRA_BASE_URL || 'http://localhost:5001'

  if (!address) {
    address = await prompt('Wallet address')
  }

  address = toWalletAddress(address)
  if (!address) throw new Error('Wallet address is required')

  const client = createAgentraClient({ baseUrl })
  const nonce = await client.getNonce(address)

  await saveConfig({
    baseUrl,
    walletAddress: address,
    lastNonce: nonce.nonce,
    lastLoginAt: new Date().toISOString(),
  })

  printJson({
    loggedIn: true,
    walletAddress: address,
    baseUrl,
    nonce: nonce.nonce,
    configPath: getConfigLocation(),
  })
}

async function handleAuth(argv, options) {
  const subcommand = argv[0]
  const client = await ensureClient(options)

  if (subcommand === 'nonce') {
    const address = toWalletAddress(argv[1] || options.address)
    if (!address) throw new Error('wallet address is required')
    printJson(await client.getNonce(address))
    return
  }

  if (subcommand === 'verify') {
    const address = toWalletAddress(options.address)
    const signature = options.signature
    const message = options.message
    if (!address || !signature || !message) {
      throw new Error('address, signature, and message are required')
    }
    const result = await client.verifyWallet({ address, signature, message })
    printJson(result)
    return
  }

  throw new Error(`Unknown auth subcommand: ${subcommand || '(missing)'}`)
}

async function handleAgents(argv, options) {
  const subcommand = argv[0]
  const client = await ensureClient(options)

  if (subcommand === 'list') {
    const result = await client.listAgents({
      status: options.status,
      search: options.search,
      category: options.category,
      sortBy: options['sort-by'],
      page: options.page,
      limit: options.limit,
      mine: options.mine,
    })
    printJson(result)
    return
  }

  if (subcommand === 'get') {
    const id = argv[1] || options.id
    if (!id) throw new Error('agent id is required')
    printJson(await client.getAgent(id))
    return
  }

  if (subcommand === 'deploy') {
    const payload = options.file ? JSON.parse(await fs.readFile(options.file, 'utf8')) : {
      name: options.name,
      description: options.description,
      category: options.category,
      pricing: options.pricing,
      tier: options.tier,
      endpoint: options.endpoint,
      deployMode: options['deploy-mode'],
      commsEnabled: options['comms-enabled'] === 'true' || options['comms-enabled'] === true,
      commsPricePerCall: options['comms-price-per-call'] || '0',
      tags: options.tags ? String(options.tags).split(',').map((item) => item.trim()).filter(Boolean) : undefined,
      mcpSchema: options['mcp-schema'] ? parseJson(options['mcp-schema']) : undefined,
      executionConfig: options['execution-config'] ? parseJson(options['execution-config']) : undefined,
    }

    printJson(await client.deployAgent(payload))
    return
  }

  if (subcommand === 'execute') {
    const id = argv[1] || options.id
    if (!id) throw new Error('agent id is required')
    const task = options.task || ''
    const runtimePayload = await loadRuntimePayload(options)
    printJson(await client.executeAgent(id, { task, runtimePayload }))
    return
  }

  if (subcommand === 'compose') {
    const agents = await loadAgentsPayload(options)
    printJson(await client.composeAgents({ agents, sequential: options.sequential === 'true' || options.sequential === true }))
    return
  }

  if (subcommand === 'profile') {
    printJson(await client.getProfile())
    return
  }

  throw new Error(`Unknown agents subcommand: ${subcommand || '(missing)'}`)
}

async function handleDoctor(options) {
  const client = await ensureClient(options)
  const health = await client.health()
  const profile = client.walletAddress ? await client.getProfile().catch(() => null) : null

  printJson({
    healthy: true,
    baseUrl: client.baseUrl,
    walletAddress: client.walletAddress,
    health,
    profile,
  })
}

async function handleRuntime(argv, options) {
  const subcommand = argv[0]

  if (subcommand !== 'init') {
    throw new Error(`Unknown runtime subcommand: ${subcommand || '(missing)'}`)
  }

  const outputDir = path.resolve(options.output || options.o || process.cwd())
  const runtimeName = options.name || path.basename(outputDir)
  const { runtimeFile, manifestFile, dockerfile, dockerignore } = getWorkspaceRuntimeFiles(outputDir)

  await fs.mkdir(outputDir, { recursive: true })

  const runtimeSource = [
    "import http from 'node:http'",
    '',
    'const port = Number(process.env.PORT || 8787)',
    `const agentName = process.env.AGENT_NAME || ${JSON.stringify(runtimeName)}`,
    '',
    'function readBody(req) {',
    '  return new Promise((resolve) => {',
    '    const chunks = []',
    "    req.on('data', (chunk) => chunks.push(chunk))",
    "    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))" ,
    '  })',
    '}',
    '',
    'const server = http.createServer(async (req, res) => {',
    "  const url = new URL(req.url || '/', 'http://localhost')",
    '',
    "  if (req.method === 'GET' && url.pathname === '/health') {",
    "    res.writeHead(200, { 'content-type': 'application/json' })",
    "    res.end(JSON.stringify({ status: 'ok', agentName, mode: 'local-docker' }))",
    '    return',
    '  }',
    '',
    "  if (req.method === 'POST' && url.pathname === '/execute') {",
    '    const raw = await readBody(req)',
    '    let parsed = {}',
    '    try {',
    '      parsed = raw ? JSON.parse(raw) : {}',
    '    } catch {',
    '      parsed = { raw }',
    '    }',
    '',
    "    const task = parsed.task || ''",
    "    res.writeHead(200, { 'content-type': 'application/json' })",
    "    res.end(JSON.stringify({",
    '      success: true,',
    '      agentName,',
    '      task,',
    '      response: {',
    '        message: `Executed locally in Docker for ${agentName}`,' ,
    '        received: parsed,',
    '      },',
    '    }))',
    '    return',
    '  }',
    '',
    "  res.writeHead(404, { 'content-type': 'application/json' })",
    "  res.end(JSON.stringify({ error: 'Not found' }))",
    '})',
    '',
    'server.listen(port, () => {',
    '  process.stdout.write(`Agentra local runtime running on port ${port}\\n`)',
    '})',
    '',
  ].join('\n')

  const manifest = {
    name: runtimeName,
    runtimeMode: 'local-docker',
    entrypoint: 'agentra.runtime.js',
    port: 8787,
    endpoints: {
      health: '/health',
      execute: '/execute',
    },
  }

  const dockerfileSource = `FROM node:22-alpine\nWORKDIR /app\nCOPY agentra.runtime.js ./agentra.runtime.js\nENV PORT=8787\nEXPOSE 8787\nCMD ["node", "agentra.runtime.js"]\n`

  const dockerignoreSource = `node_modules\n.git\n.agentra\n`

  await fs.writeFile(runtimeFile, runtimeSource, 'utf8')
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  await fs.writeFile(dockerfile, dockerfileSource, 'utf8')
  await fs.writeFile(dockerignore, dockerignoreSource, 'utf8')

  printJson({
    created: true,
    outputDir,
    files: {
      runtimeFile,
      manifestFile,
      dockerfile,
      dockerignore,
    },
  })
}

export async function runCli(argv = process.argv.slice(2)) {
  const { positionals, options } = parseArgs(argv)
  const command = positionals[0]

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'doctor') {
    await handleDoctor(options)
    return
  }

  if (command === 'login') {
    await handleLogin(options)
    return
  }

  if (command === 'whoami') {
    const config = await loadConfig()
    printJson({
      baseUrl: config.baseUrl || process.env.AGENTRA_BASE_URL || 'http://localhost:5001',
      walletAddress: config.walletAddress || process.env.AGENTRA_WALLET_ADDRESS || null,
      configPath: getConfigLocation(),
    })
    return
  }

  if (command === 'logout') {
    await clearConfig()
    printJson({ loggedOut: true, configPath: getConfigLocation() })
    return
  }

  if (command === 'auth') {
    await handleAuth(positionals.slice(1), options)
    return
  }

  if (command === 'agents') {
    await handleAgents(positionals.slice(1), options)
    return
  }

  if (command === 'runtime') {
    await handleRuntime(positionals.slice(1), options)
    return
  }

  if (command === 'agent' && positionals[1] === 'activate') {
    await handleActivate(positionals[2], options)
    return
  }

  if (command === 'agent' && positionals[1] === 'run') {
    await handleRun(positionals[2], options)
    return
  }

  throw new Error(`Unknown command: ${command}`)
}
