

// Optional chaining so the module can be imported outside a Vite bundle (tests).
const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5001/api'

/** The probe lives at the origin root, not under /api. */
function healthUrl() {
  const trimmed = String(API_BASE).replace(/\/+$/, '')
  const origin = trimmed.replace(/\/api$/, '')
  return `${origin}/healthz`
}

export const BackendState = {
  UNKNOWN: 'unknown',
  WARMING: 'warming',
  WARM: 'warm',
  UNREACHABLE: 'unreachable',
}

let state = BackendState.UNKNOWN
let inFlight = null
const listeners = new Set()

function setState(next) {
  if (state === next) return
  state = next
  for (const listener of listeners) {
    try {
      listener(state)
    } catch {
      // A broken subscriber must not take down the warmup.
    }
  }
}

export function getBackendState() {
  return state
}


export function onBackendState(listener) {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

const ATTEMPT_TIMEOUT_MS = 45_000
const RETRY_DELAY_MS = 4_000
const MAX_ATTEMPTS = 3

function ping(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)

  return fetch(url, {
    method: 'GET',
    signal: controller.signal,
    cache: 'no-store',
    credentials: 'omit',
  }).finally(() => clearTimeout(timer))
}


export function warmBackend() {
  if (state === BackendState.WARM) return Promise.resolve(true)
  if (inFlight) return inFlight

  const url = healthUrl()
  setState(BackendState.WARMING)

  inFlight = (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await ping(url)
        if (res.ok) {
          setState(BackendState.WARM)
          return true
        }
      
      } catch {
        // Network error or abort — same handling.
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    setState(BackendState.UNREACHABLE)
    return false
  })()

  inFlight = inFlight.finally(() => {
    inFlight = null
  })

  return inFlight
}
