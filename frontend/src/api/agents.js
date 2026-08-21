import api from './axios'
const NO_CACHE = {
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
}

export const agentsAPI = {
  // ─────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────
  getAll: (params) => api.get('/agents', { params }),

  
  getOfficial: (limit = 6) =>
    api.get('/agents', { params: { official: 'true', sortBy: 'newest', limit } }),

  getById: (id) => api.get(`/agents/${id}`),


  chat: (agentId, question, reportId) =>
    api.post(`/agents/${agentId}/chat`, { question, reportId }, { timeout: 90000 }),

  getConversation: (agentId) =>
    api.get(`/agents/${agentId}/conversation`, NO_CACHE),

  clearConversation: (agentId) =>
    api.delete(`/agents/${agentId}/conversation`),

  myConversations: () => api.get('/agents/conversations', NO_CACHE),


  search: (query) => api.get('/agents/search', { params: { q: query } }),

  getMetrics: (id) => api.get(`/agents/${id}/metrics`),

  // ── Wallet-sensitive — never cache ──────────────────────────

  checkAccess: (agentId) =>
    api.get(`/agents/${agentId}/access`, NO_CACHE),

  checkUpvoteStatus: (agentId) =>
    api.get(`/agents/${agentId}/upvote-status`, NO_CACHE),

  // ─────────────────────────────────────────────
  // DEPLOY AGENT FLOW
  // ─────────────────────────────────────────────

deploy: (data) =>
    api.post('/agents/deploy', {
      name: data.name,
      description: data.description,
      endpoint: data.endpoint,
      tier: data.tier,
      pricing: data.pricing,
      lifetimeMultiplier: data.lifetimeMultiplier ?? 12,
      commsEnabled: data.commsEnabled ?? false,
      commsPricePerCall: data.commsPricePerCall ?? '0',
      tags: data.tags || [],
      category: data.category,
      mcpSchema: data.mcpSchema || undefined,
      executionConfig: data.executionConfig || undefined,
      deployMode: data.deployMode || 'database',
      llmApiKey: data.llmApiKey || undefined,
      provider: data.provider,
      providerBaseUrl: data.providerBaseUrl || undefined,
    }),

  confirmDeploy: (id, txHash, contractAgentId) =>
    api.post(`/agents/${id}/confirm`, {
      txHash,
      contractAgentId: contractAgentId ? String(contractAgentId) : undefined,
    }),

  cancelDraft: (id) => api.delete(`/agents/${id}/draft`),

  // ─────────────────────────────────────────────
  // ACCESS PURCHASE
  // ─────────────────────────────────────────────

  purchaseAccess: (agentId, isLifetime, txHash) =>
    api.post(`/agents/${agentId}/purchase`, {
      isLifetime,
      txHash: txHash || undefined,
    }),

  getLicenseKey: (agentId) =>
    api.post(`/agents/${agentId}/license`),

  // ─────────────────────────────────────────────
  // UPVOTE
  // ─────────────────────────────────────────────

  upvote: (agentId, txHash) =>
    api.post(`/agents/${agentId}/upvote`, { txHash: txHash || undefined }),

  // ─────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────

  execute: (id, task) =>
    api.post(`/agents/${id}/execute`, { task }),

  executeWithPayload: (id, task, runtimePayload) =>
    api.post(`/agents/${id}/execute`, { task, runtimePayload }),

  executeMultipart: (id, formData) =>
    api.post(`/agents/${id}/execute`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  discoverForComms: (task, excludeId) =>
    api.get('/agents/discover', { params: { task, excludeId } }),

  getCommsTarget: ({ targetAgentName, targetAgentId }) =>
    api.get('/agents/comms-target', { params: { targetAgentName, targetAgentId } }),

  callAgent: (fromId, payload) =>
    api.post(`/agents/${fromId}/call-agent`, payload),

  callAgentMultipart: (fromId, formData) =>
    api.post(`/agents/${fromId}/call-agent`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getCommsMessages: (agentId) =>
    api.get(`/agents/${agentId}/messages`),

  // ─────────────────────────────────────────────
  // REVIEWS
  // ─────────────────────────────────────────────

  getReviews: (agentId, page = 1) =>
    api.get(`/agents/${agentId}/reviews`, { params: { page } }),

  createReview: (agentId, data) =>
    api.post(`/agents/${agentId}/reviews`, data),

  likeReview: (reviewId) =>
    api.post(`/reviews/${reviewId}/like`),

  deleteReview: (reviewId) =>
    api.delete(`/reviews/${reviewId}`),

  // ─────────────────────────────────────────────
  // MANAGEMENT
  // ─────────────────────────────────────────────

  update: (id, data) => api.put(`/agents/${id}`, data),

  deactivate: (id) => api.delete(`/agents/${id}`),

  validateEndpoint: (endpoint) =>
    api.post('/agents/validate-endpoint', { endpoint }),

  getPendingTransactions: () =>
    api.get('/transactions/pending'),
}