import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { AgentraClient, AgentraRequestError } from '../src/index.js'

function startMockServer(routes) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const key = `${req.method} ${url.pathname}`
    const handler = routes[key]

    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const rawBody = Buffer.concat(chunks).toString('utf8')

    if (!handler) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found', key, rawBody }))
      return
    }

    const result = await handler({ req, url, rawBody })
    res.writeHead(result.status || 200, result.headers || { 'content-type': 'application/json' })
    res.end(result.body ?? '')
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      })
    })
  })
}

test('AgentraClient can call auth and execution endpoints', async () => {
  const mock = await startMockServer({
    'GET /api/auth/nonce/0x1234567890123456789012345678901234567890': async ({ req }) => {
      assert.equal(req.headers['x-wallet-address'], undefined)
      return {
        body: JSON.stringify({ nonce: 'nonce-1', message: 'Sign this nonce to authenticate: nonce-1' }),
      }
    },
    'GET /api/auth/profile': async ({ req }) => {
      assert.equal(req.headers['x-wallet-address'], '0x1234567890123456789012345678901234567890')
      return {
        body: JSON.stringify({ walletAddress: req.headers['x-wallet-address'], agents: [] }),
      }
    },
    'POST /api/agents/agent-1/execute': async ({ req, rawBody }) => {
      assert.equal(req.headers['x-wallet-address'], '0x1234567890123456789012345678901234567890')
      assert.match(req.headers['content-type'], /application\/json/)
      const parsed = JSON.parse(rawBody)
      assert.equal(parsed.task, 'hello')
      return {
        body: JSON.stringify({ success: true, agentId: 'agent-1', response: 'world' }),
      }
    },
    'POST /api/agents/agent-1/license': async ({ req }) => {
      assert.equal(req.headers['x-wallet-address'], '0x1234567890123456789012345678901234567890')
      return {
        body: JSON.stringify({ licenseKey: 'license-1', expiresAt: '2099-01-01T00:00:00.000Z' }),
      }
    },
  })

  try {
    const client = new AgentraClient({ baseUrl: mock.baseUrl, walletAddress: '0x1234567890123456789012345678901234567890' })
    const nonce = await client.getNonce('0x1234567890123456789012345678901234567890')
    assert.equal(nonce.nonce, 'nonce-1')

    const profile = await client.getProfile()
    assert.equal(profile.walletAddress, '0x1234567890123456789012345678901234567890')

    const result = await client.executeAgent('agent-1', { task: 'hello' })
    assert.equal(result.success, true)
    assert.equal(result.response, 'world')

    const license = await client.getLicenseKey('agent-1')
    assert.equal(license.licenseKey, 'license-1')
  } finally {
    mock.server.close()
  }
})

test('AgentraClient can fetch license with per-call wallet override', async () => {
  const mock = await startMockServer({
    'POST /api/agents/agent-1/license': async ({ req }) => {
      assert.equal(req.headers['x-wallet-address'], '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
      return {
        body: JSON.stringify({ licenseKey: 'license-2', expiresAt: '2099-01-01T00:00:00.000Z' }),
      }
    },
  })

  try {
    const client = new AgentraClient({ baseUrl: mock.baseUrl })
    const license = await client.getLicenseKey('agent-1', {
      walletAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
    })

    assert.equal(license.licenseKey, 'license-2')
  } finally {
    mock.server.close()
  }
})

test('AgentraClient surfaces HTTP errors', async () => {
  const mock = await startMockServer({
    'POST /api/agents/agent-1/execute': async () => ({
      status: 403,
      body: JSON.stringify({ error: 'Access not purchased' }),
    }),
  })

  try {
    const client = new AgentraClient({ baseUrl: mock.baseUrl, walletAddress: '0x1234567890123456789012345678901234567890' })
    await assert.rejects(
      () => client.executeAgent('agent-1', { task: 'hello' }),
      (error) => error instanceof AgentraRequestError
        && error.status === 403
        && String(error.message).includes('Access not purchased')
    )
  } finally {
    mock.server.close()
  }
})