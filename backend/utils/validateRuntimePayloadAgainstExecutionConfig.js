/**
 * Validates a runtime payload against the agent's executionConfig schema.
 * Backend NEVER trusts frontend validation.
 */

const RESTRICTED_HEADERS = new Set([
  'host',
  'content-length',
  'transfer-encoding',
  'connection',
  'upgrade',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
])

/**
 * Validates that no restricted headers are being injected at runtime.
 */
export function validateRestrictedHeaders(runtimeHeaders = {}) {
  for (const key of Object.keys(runtimeHeaders)) {
    if (RESTRICTED_HEADERS.has(key.toLowerCase())) {
      throw Object.assign(
        new Error(`Header "${key}" is not allowed to be set at runtime`),
        { status: 400, code: 'RESTRICTED_HEADER' }
      )
    }
  }
}

/**
 * Validates a runtime payload against agent.executionConfig.
 *
 * @param {object} executionConfig - agent.executionConfig from DB
 * @param {object} runtimePayload  - { headers, body, files }
 * @param {object} uploadedFiles   - files from multer keyed by fieldname
 */
export function validateRuntimePayload(executionConfig, runtimePayload, uploadedFiles = {}) {
  if (!executionConfig) return // legacy agent — skip schema validation

  const { headers: schemaHeaders = [], bodyFields: schemaBodyFields = [] } = executionConfig
  const runtimeHeaders = runtimePayload?.headers || {}
  const runtimeBody = runtimePayload?.body || {}

  // 1. Validate restricted headers
  validateRestrictedHeaders(runtimeHeaders)

  // 2. Build allowed sets
  const allowedHeaderKeys = new Set(schemaHeaders.map(h => h.key))
  const allowedBodyKeys = new Set(schemaBodyFields.map(f => f.key))
  const fileFieldKeys = new Set(
    schemaBodyFields.filter(f => f.type === 'file').map(f => f.key)
  )

  // 3. Block unknown runtime headers (only user-provided headers are checked)
  const userProvidedHeaderKeys = new Set(
    schemaHeaders.filter(h => h.userProvided).map(h => h.key)
  )
  for (const key of Object.keys(runtimeHeaders)) {
    if (!userProvidedHeaderKeys.has(key)) {
      throw Object.assign(
        new Error(`Unknown runtime header "${key}" is not defined in the execution schema`),
        { status: 400, code: 'UNKNOWN_HEADER' }
      )
    }
  }

  // 4. Block unknown body fields
  for (const key of Object.keys(runtimeBody)) {
    if (!allowedBodyKeys.has(key)) {
      throw Object.assign(
        new Error(`Unknown body field "${key}" is not defined in the execution schema`),
        { status: 400, code: 'UNKNOWN_FIELD' }
      )
    }
  }

  // 5. Block file uploads to non-file fields
  for (const key of Object.keys(uploadedFiles)) {
    if (!fileFieldKeys.has(key)) {
      throw Object.assign(
        new Error(`File upload to field "${key}" is not allowed — field is not defined as type=file`),
        { status: 400, code: 'INVALID_FILE_FIELD' }
      )
    }
  }

  // 6. Validate required user-provided headers
  for (const headerDef of schemaHeaders) {
    if (!headerDef.userProvided || !headerDef.required) continue
    const val = runtimeHeaders[headerDef.key]
    if (val === undefined || val === null || String(val).trim() === '') {
      throw Object.assign(
        new Error(`Required header "${headerDef.key}" is missing`),
        { status: 400, code: 'MISSING_REQUIRED_HEADER' }
      )
    }
  }

  // 7. Validate required body fields
  for (const fieldDef of schemaBodyFields) {
    if (!fieldDef.userProvided || !fieldDef.required) continue

    if (fieldDef.type === 'file') {
      if (!uploadedFiles[fieldDef.key]) {
        throw Object.assign(
          new Error(`Required file field "${fieldDef.key}" is missing`),
          { status: 400, code: 'MISSING_REQUIRED_FILE' }
        )
      }
      continue
    }

    if (fieldDef.type === 'boolean') continue // booleans always have a value

    const val = runtimeBody[fieldDef.key]
    if (val === undefined || val === null || String(val).trim() === '') {
      throw Object.assign(
        new Error(`Required field "${fieldDef.key}" is missing`),
        { status: 400, code: 'MISSING_REQUIRED_FIELD' }
      )
    }
  }

  // 8. Validate field types
  for (const fieldDef of schemaBodyFields) {
    if (!fieldDef.userProvided || fieldDef.type === 'file') continue
    const val = runtimeBody[fieldDef.key]
    if (val === undefined || val === null || val === '') continue

    if (fieldDef.type === 'number' && isNaN(Number(val))) {
      throw Object.assign(
        new Error(`Field "${fieldDef.key}" must be a valid number`),
        { status: 400, code: 'INVALID_FIELD_TYPE' }
      )
    }
  }
}