import FormData from 'form-data'
import { redactHeaders } from './redactSecrets.js'

/**
 * Builds the axios-compatible request config from executionConfig + runtimePayload.
 * Fully schema-driven — no hardcoded field names.
 *
 * @param {object} executionConfig  — agent.executionConfig from DB
 * @param {object} runtimePayload   — { headers, body, files, contentType, method }
 * @param {string} task             — the task string (used for multipart/urlencoded flows)
 * @returns {{ url: string, method: string, headers: object, data: any }}
 */
export function buildExecutionRequest(endpoint, executionConfig, runtimePayload, task) {
  const method = (executionConfig?.method || 'POST').toUpperCase()
  const contentType = executionConfig?.contentType || 'json'

  const runtimeHeaders = runtimePayload?.headers || {}
  const runtimeBody    = runtimePayload?.body    || {}
  const runtimeFiles   = runtimePayload?.files   || {}

  // ── Build request headers ────────────────────────────────────
  const baseRequestHeaders = {}

  // Inject static (non-userProvided) header defaults from schema
  for (const headerDef of (executionConfig?.headers || [])) {
    if (!headerDef.userProvided && headerDef.value) {
      baseRequestHeaders[headerDef.key] = headerDef.value
    }
  }

  // Inject runtime user-provided headers
  for (const [k, v] of Object.entries(runtimeHeaders)) {
    if (v !== undefined && v !== '') {
      baseRequestHeaders[k] = v
    }
  }

  console.log('[EXECUTION] Headers (redacted):', redactHeaders(baseRequestHeaders))

  // ── Build request body ────────────────────────────────────────
  const baseEndpoint = String(endpoint || '').trim().replace(/\/+$/, '')
  const candidateUrls = []

  const isHfSpace = (() => {
    try {
      return new URL(baseEndpoint).hostname.endsWith('hf.space')
    } catch {
      return false
    }
  })()

  try {
    const parsed = new URL(baseEndpoint)
    const pathname = parsed.pathname.replace(/\/+$/, '')
    const origin = parsed.origin

    if (pathname.endsWith('/apply')) {
      candidateUrls.push(baseEndpoint)
      candidateUrls.push(`${origin}${pathname.replace(/\/apply$/, '')}`)
    } else if (pathname.endsWith('/execute')) {
      candidateUrls.push(baseEndpoint)
      candidateUrls.push(`${origin}${pathname.replace(/\/execute$/, '')}`)
    } else {
      if (isHfSpace) {
        candidateUrls.push(`${origin}${pathname}/apply`)
        candidateUrls.push(baseEndpoint)
        candidateUrls.push(`${origin}${pathname}/execute`)
      } else {
        candidateUrls.push(baseEndpoint)
        candidateUrls.push(`${origin}${pathname}/apply`)
        candidateUrls.push(`${origin}${pathname}/execute`)
      }
    }
  } catch {
    // ignore URL parsing issues; the base endpoint will still be tried
  }

  const uniqueCandidateUrls = [...new Set(candidateUrls.filter(Boolean))]

  const buildRequestConfig = (targetUrl) => {
    const requestHeaders = { ...baseRequestHeaders }
    let data

    if (contentType === 'form-data') {
      const form = new FormData()

      // Always include task
      form.append('task', task || '')

      for (const fieldDef of (executionConfig?.bodyFields || [])) {
        if (!fieldDef.userProvided && fieldDef.type !== 'file') {
          // skip — no static defaults supported for body fields currently
        }
      }

      for (const [k, v] of Object.entries(runtimeBody)) {
        if (v !== undefined && v !== '') {
          form.append(k, String(v))
        }
      }

      for (const [k, fileBuffer] of Object.entries(runtimeFiles)) {
        if (fileBuffer) {
          form.append(k, fileBuffer.buffer, {
            filename: fileBuffer.originalname || k,
            contentType: fileBuffer.mimetype || 'application/octet-stream',
          })
        }
      }

      Object.assign(requestHeaders, form.getHeaders())
      data = form
    } else if (contentType === 'x-www-form-urlencoded') {
      const params = new URLSearchParams()
      params.append('task', task || '')
      for (const [k, v] of Object.entries(runtimeBody)) {
        if (v !== undefined && v !== '') {
          params.append(k, String(v))
        }
      }
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      data = params.toString()
    } else {
      data = {
        task: task || '',
        ...runtimeBody,
      }
      requestHeaders['Content-Type'] = 'application/json'
      requestHeaders['Accept'] = 'application/json, text/event-stream'
    }

    return {
      url: targetUrl,
      method,
      headers: requestHeaders,
      data,
    }
  }

  return {
    candidateUrls: uniqueCandidateUrls,
    buildRequestConfig,
  }
}