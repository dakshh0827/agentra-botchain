import test from 'node:test'
import assert from 'node:assert/strict'

import { fetchRuntimeSecrets } from '../src/runtimeSecrets.js'

test('fetchRuntimeSecrets calls /api runtime-secrets endpoint', async () => {
  const originalFetch = globalThis.fetch
  const calls = []

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    return {
      ok: true,
      json: async () => ({ headerSecrets: {}, bodySecrets: {} }),
    }
  }

  try {
    const result = await fetchRuntimeSecrets('https://agentra-0g.onrender.com/', '1', 'license-token')
    assert.deepEqual(result, { headerSecrets: {}, bodySecrets: {} })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://agentra-0g.onrender.com/api/agents/1/runtime-secrets')
    assert.equal(calls[0].options.method, 'POST')
    assert.equal(calls[0].options.headers.authorization, 'Bearer license-token')
  } finally {
    globalThis.fetch = originalFetch
  }
})
