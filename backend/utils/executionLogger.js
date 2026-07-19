/**
 * Structured execution observability logger.
 * Never logs secrets, API keys, or sensitive header values.
 */
import { redactHeaders, redactPayload } from './redactSecrets.js'

export function logExecutionStart({ executionTraceId, agentId, contentType, uploadCount, payloadSize }) {
  console.log(JSON.stringify({
    event: 'execution_start',
    executionTraceId,
    agentId,
    contentType: contentType || 'legacy',
    uploadCount: uploadCount || 0,
    payloadSize: payloadSize || 0,
    timestamp: new Date().toISOString(),
  }))
}

export function logExecutionComplete({ executionTraceId, agentId, contentType, executionDuration, retryCount, uploadCount, payloadSize, status }) {
  console.log(JSON.stringify({
    event: 'execution_complete',
    executionTraceId,
    agentId,
    contentType: contentType || 'legacy',
    executionDuration,
    retryCount: retryCount || 0,
    uploadCount: uploadCount || 0,
    payloadSize: payloadSize || 0,
    status,
    timestamp: new Date().toISOString(),
  }))
}

export function logExecutionError({ executionTraceId, agentId, errorCategory, errorMessage, retryCount }) {
  console.error(JSON.stringify({
    event: 'execution_error',
    executionTraceId,
    agentId,
    errorCategory,
    errorMessage,
    retryCount: retryCount || 0,
    timestamp: new Date().toISOString(),
  }))
}

export function logExecutionHeaders({ executionTraceId, headers }) {
  console.log(JSON.stringify({
    event: 'execution_headers',
    executionTraceId,
    headers: redactHeaders(headers || {}),
    timestamp: new Date().toISOString(),
  }))
}

/**
 * Categorize error for analytics tracking.
 */
export function categorizeError(err) {
  if (!err) return 'unknown'
  const status = err.response?.status || err.status
  const msg = (err.message || '').toLowerCase()

  if (status === 401 || status === 403) return 'auth_failure'
  if (status === 400) return 'validation_failure'
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limited'
  if (status === 502 || status === 503) return 'gateway_error'
  if (msg.includes('timeout') || msg.includes('timedout')) return 'timeout'
  if (msg.includes('ssrf') || msg.includes('blocked')) return 'ssrf_blocked'
  if (msg.includes('network') || msg.includes('econnrefused')) return 'network_failure'
  if (msg.includes('redirect')) return 'redirect_blocked'
  return 'execution_failure'
}