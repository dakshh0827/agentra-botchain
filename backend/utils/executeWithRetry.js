/**
 * Retry utility for agent execution.
 * Only retries network-level and 5xx failures.
 * Never retries auth, validation, or 4xx errors.
 */

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504])

function isRetryableError(err) {
  // Network failures (no response received)
  if (!err.response && (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ECONNRESET' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'ENOTFOUND' ||
    err.code === 'ECONNABORTED' ||
    err.message?.toLowerCase().includes('timeout') ||
    err.message?.toLowerCase().includes('network')
  )) {
    return true
  }

  // 502, 503, 504 gateway errors
  if (err.response?.status && RETRYABLE_STATUS_CODES.has(err.response.status)) {
    return true
  }

  return false
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry on transient failures.
 *
 * @param {Function} fn          - async function to execute
 * @param {object}   options
 * @param {number}   options.maxRetries     - max retry attempts (default: 2)
 * @param {number}   options.baseDelayMs    - base delay in ms (default: 500)
 * @param {number}   options.maxDelayMs     - max delay cap in ms (default: 5000)
 * @param {Function} options.onRetry        - callback(attempt, error) for observability
 * @returns {object} { result, retryCount }
 */
export async function executeWithRetry(fn, options = {}) {
  const {
    maxRetries = 2,
    baseDelayMs = 500,
    maxDelayMs = 5000,
    onRetry = null,
  } = options

  let lastError
  let retryCount = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      return { result, retryCount }
    } catch (err) {
      lastError = err

      // Never retry on first attempt being a non-retryable error
      if (!isRetryableError(err)) {
        throw err
      }

      // If we've exhausted retries, throw
      if (attempt === maxRetries) {
        break
      }

      retryCount++

      // Exponential backoff with jitter
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
      const jitter = Math.floor(Math.random() * 200)

      if (onRetry) {
        onRetry(attempt + 1, err)
      }

      await sleep(delay + jitter)
    }
  }

  throw lastError
}