import { AgentraError, AgentraRequestError } from './errors.js'

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false
  return Object.getPrototypeOf(value) === Object.prototype
}

function joinUrl(baseUrl, path) {
  const normalizedBase = String(baseUrl || '').replace(/\/$/, '')
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

function appendQuery(url, query = {}) {
  const nextUrl = new URL(url)

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          nextUrl.searchParams.append(key, String(item))
        }
      }
      continue
    }
    nextUrl.searchParams.set(key, String(value))
  }

  return nextUrl.toString()
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (response.status === 204) return null

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export class AgentraClient {
  constructor(options = {}) {
    const baseUrl = options.baseUrl || process.env.AGENTRA_BASE_URL || 'http://localhost:5001'

    this.baseUrl = String(baseUrl).replace(/\/$/, '')
    this.walletAddress = options.walletAddress || options.address || process.env.AGENTRA_WALLET_ADDRESS || null
    this.fetchImpl = options.fetchImpl || globalThis.fetch
    this.timeoutMs = Number(options.timeoutMs || process.env.AGENTRA_TIMEOUT_MS || 30000)
    this.userAgent = options.userAgent || 'agentra-sdk/1.0.0'
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '')
    return this
  }

  setWalletAddress(walletAddress) {
    this.walletAddress = walletAddress ? String(walletAddress).toLowerCase() : null
    return this
  }

  withWallet(walletAddress) {
    return new AgentraClient({
      baseUrl: this.baseUrl,
      walletAddress,
      fetchImpl: this.fetchImpl,
      timeoutMs: this.timeoutMs,
      userAgent: this.userAgent,
    })
  }

  async request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase()
    const auth = options.auth !== false
    const headers = new Headers(options.headers || {})

    headers.set('accept', headers.get('accept') || 'application/json')
    headers.set('user-agent', this.userAgent)

    if (auth) {
      if (!this.walletAddress) {
        throw new AgentraError('walletAddress is required for authenticated requests', {
          code: 'AGENTRA_AUTH_REQUIRED',
        })
      }
      headers.set('x-wallet-address', this.walletAddress)
    }

    let body = options.body
    if (body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD') {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        // Let fetch set multipart boundaries.
      } else if (typeof body === 'string' || body instanceof Uint8Array || body instanceof ArrayBuffer) {
        // pass through
      } else if (isPlainObject(body) || Array.isArray(body)) {
        body = JSON.stringify(body)
        if (!headers.has('content-type')) {
          headers.set('content-type', 'application/json')
        }
      }
    } else {
      body = undefined
    }

    const url = options.query ? appendQuery(joinUrl(this.baseUrl, path), options.query) : joinUrl(this.baseUrl, path)
    const controller = new AbortController()
    const timeoutMs = Number(options.timeoutMs || this.timeoutMs)
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      })

      const parsed = await parseResponseBody(response)

      if (!response.ok) {
        throw new AgentraRequestError(`Request failed with status ${response.status}`, {
          status: response.status,
          response: parsed,
          details: { url, method },
        })
      }

      return parsed
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new AgentraRequestError('Request timed out', {
          code: 'AGENTRA_TIMEOUT',
          details: { url, method, timeoutMs },
          cause: error,
        })
      }

      if (error instanceof AgentraError) {
        throw error
      }

      throw new AgentraError(error.message || 'Unexpected Agentra client failure', {
        cause: error,
        details: { url, method },
      })
    } finally {
      clearTimeout(timer)
    }
  }

  async health() {
    return this.request('/health', { auth: false })
  }

  async getNonce(address) {
    if (!address) {
      throw new AgentraError('address is required', { code: 'AGENTRA_VALIDATION_ERROR' })
    }
    return this.request(`/api/auth/nonce/${address}`, { auth: false })
  }

  async verifyWallet(payload) {
    return this.request('/api/auth/verify-wallet', {
      method: 'POST',
      auth: false,
      body: payload,
    })
  }

  async getProfile() {
    return this.request('/api/auth/profile')
  }

  async listAgents(query = {}) {
    return this.request('/api/agents', { auth: false, query })
  }

  async searchAgents(q) {
    return this.request('/api/agents/search', {
      auth: false,
      query: { q },
    })
  }

  async getAgent(id) {
    return this.request(`/api/agents/${id}`, { auth: false })
  }

  async getAgentMetrics(agentId) {
    return this.request(`/api/agents/${agentId}/metrics`, { auth: false })
  }

  async discoverAgents() {
    return this.request('/api/agents/discover')
  }

  async getCommsTarget() {
    return this.request('/api/agents/comms-target')
  }

  async getMessages(agentId) {
    return this.request(`/api/agents/${agentId}/messages`)
  }

  async validateEndpoint(endpoint) {
    return this.request('/api/agents/validate-endpoint', {
      method: 'POST',
      body: { endpoint },
    })
  }

  async deployAgent(payload) {
    return this.request('/api/agents/deploy', {
      method: 'POST',
      body: payload,
    })
  }

  async confirmDeploy(agentId, payload) {
    return this.request(`/api/agents/${agentId}/confirm`, {
      method: 'POST',
      body: payload,
    })
  }

  async cancelDraft(agentId) {
    return this.request(`/api/agents/${agentId}/draft`, {
      method: 'DELETE',
    })
  }

  async updateAgent(agentId, payload) {
    return this.request(`/api/agents/${agentId}`, {
      method: 'PUT',
      body: payload,
    })
  }

  async deleteAgent(agentId) {
    return this.request(`/api/agents/${agentId}`, {
      method: 'DELETE',
    })
  }

  async purchaseAccess(agentId, payload = {}) {
    return this.request(`/api/agents/${agentId}/purchase`, {
      method: 'POST',
      body: payload,
    })
  }

  async upvoteAgent(agentId, payload = {}) {
    return this.request(`/api/agents/${agentId}/upvote`, {
      method: 'POST',
      body: payload,
    })
  }

  async checkUpvote(agentId) {
    return this.request(`/api/agents/${agentId}/upvote-status`)
  }

  async checkAccess(agentId) {
    return this.request(`/api/agents/${agentId}/access`)
  }

  async createReview(agentId, payload) {
    return this.request(`/api/agents/${agentId}/reviews`, {
      method: 'POST',
      body: payload,
    })
  }

  async getReviews(agentId) {
    return this.request(`/api/agents/${agentId}/reviews`, { auth: false })
  }

  async executeAgent(agentId, payload) {
    return this.request(`/api/agents/${agentId}/execute`, {
      method: 'POST',
      body: payload,
    })
  }

  async composeAgents(payload) {
    return this.request('/api/agents/compose', {
      method: 'POST',
      body: payload,
    })
  }

  async getInteractions(agentId, options = {}) {
    return this.request(`/api/agents/${agentId}/interactions`, {
      auth: false,
      query: options,
    })
  }
}

export function createAgentraClient(options) {
  return new AgentraClient(options)
}