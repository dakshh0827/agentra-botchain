const SECRET_KEYS = [
  'authorization', 'x-api-key', 'api-key', 'apikey', 'api_key',
  'token', 'secret', 'password', 'passwd', 'credential',
  'bearer', 'private', 'auth',
]

export function redactHeaders(headers = {}) {
  const redacted = {}
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase()
    const isSensitive = SECRET_KEYS.some(s => lower.includes(s))
    redacted[k] = isSensitive ? '[REDACTED]' : v
  }
  return redacted
}

export function redactPayload(payload = {}) {
  const redacted = {}
  for (const [k, v] of Object.entries(payload)) {
    const lower = k.toLowerCase()
    const isSensitive = SECRET_KEYS.some(s => lower.includes(s))
    redacted[k] = isSensitive ? '[REDACTED]' : v
  }
  return redacted
}