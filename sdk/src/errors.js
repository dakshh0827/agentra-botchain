export class AgentraError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'AgentraError'
    this.code = options.code || 'AGENTRA_ERROR'
    this.status = options.status || null
    this.cause = options.cause || null
    this.details = options.details || null
  }
}

export class AgentraRequestError extends AgentraError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'AGENTRA_REQUEST_ERROR',
      status: options.status,
      cause: options.cause,
      details: options.details,
    })
    this.name = 'AgentraRequestError'
    this.response = options.response || null
  }
}