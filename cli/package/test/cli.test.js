import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

function startMockServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const rawBody = Buffer.concat(chunks).toString('utf8')

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/auth/nonce/')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ nonce: 'abc123', message: 'Sign this nonce to authenticate: abc123' }))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/profile') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ walletAddress: req.headers['x-wallet-address'], agents: [] }))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/agents') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ agents: [{ agentId: 'agent-1', name: 'Test Agent' }], total: 1 }))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/agents/agent-1') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ agentId: 'agent-1', name: 'Test Agent' }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/deploy') {
      res.writeHead(201, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id: 'db-id', name: JSON.parse(rawBody).name }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/agent-1/execute') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ success: true, agentId: 'agent-1', response: 'ok' }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/compose') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ mode: 'parallel', results: [] }))
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found', path: url.pathname }))
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` })
    })
  })
}

async function runCli(args, env = {}) {
  const cliPath = path.resolve(process.cwd(), 'bin/agentra.js')

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: { ...process.env, ...env },
      cwd: path.resolve(process.cwd(), '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })

    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

test('CLI login, whoami, agents, execute, and runtime init work end to end', async () => {
  const mock = await startMockServer()
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agentra-cli-'))

  try {
    const loginResult = await runCli(['login', '--address', '0x1234567890123456789012345678901234567890', '--base-url', mock.baseUrl], {
      AGENTRA_HOME: tempHome,
    })
    assert.equal(loginResult.code, 0)
    assert.match(loginResult.stdout, /"loggedIn": true/)

    const whoamiResult = await runCli(['whoami'], {
      AGENTRA_HOME: tempHome,
      AGENTRA_BASE_URL: mock.baseUrl,
    })
    assert.equal(whoamiResult.code, 0)
    assert.match(whoamiResult.stdout, /0x1234567890123456789012345678901234567890/)

    const agentsResult = await runCli(['agents', 'list'], {
      AGENTRA_HOME: tempHome,
      AGENTRA_BASE_URL: mock.baseUrl,
    })
    assert.equal(agentsResult.code, 0)
    assert.match(agentsResult.stdout, /Test Agent/)

    const executeResult = await runCli(['agents', 'execute', 'agent-1', '--task', 'hello'], {
      AGENTRA_HOME: tempHome,
      AGENTRA_BASE_URL: mock.baseUrl,
    })
    assert.equal(executeResult.code, 0)
    assert.match(executeResult.stdout, /"response": "ok"/)

    const runtimeDir = path.join(tempHome, 'runtime-sample')
    await fs.mkdir(runtimeDir, { recursive: true })
    const runtimeResult = await runCli(['runtime', 'init', '--docker', '--name', 'Sample Agent', '--output', runtimeDir], {
      AGENTRA_HOME: tempHome,
    })
    assert.equal(runtimeResult.code, 0)

    const runtimeFiles = await Promise.all([
      fs.readFile(path.join(runtimeDir, 'agentra.runtime.js'), 'utf8'),
      fs.readFile(path.join(runtimeDir, 'agentra.runtime.json'), 'utf8'),
      fs.readFile(path.join(runtimeDir, 'Dockerfile'), 'utf8'),
    ])
    assert.match(runtimeFiles[0], /GET '\/health'|\/health/)
    assert.match(runtimeFiles[1], /local-docker/)
    assert.match(runtimeFiles[2], /node:22-alpine/)
  } finally {
    mock.server.close()
    await fs.rm(tempHome, { recursive: true, force: true })
  }
})
