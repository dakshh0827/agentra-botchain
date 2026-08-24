
// Optional chaining so the module can be imported outside a Vite bundle (tests).
const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5001/api'

/** The probe lives at the origin root, not under /api. */
function healthUrl() {
  const trimmed = String(API_BASE).replace(/\/+$/, '')
  const origin = trimmed.replace(/\/api$/, '')
  return `${origin}/healthz`
}

/** Real read path — warms Mongo / Prisma, not just the HTTP process. */
function analyticsUrl() {
  const trimmed = String(API_BASE).replace(/\/+$/, '')
  return `${trimmed}/analytics/global`
}

function agentsUrl() {
  const trimmed = String(API_BASE).replace(/\/+$/, '')
  return `${trimmed}/agents?limit=1&sortBy=newest`
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
const RETRY_DELAY_MS = 3_000
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

async function pingOk(url) {
  const res = await ping(url)
  return res.ok
}

/**
 * Wake the API process, then touch a real DB-backed route.
 * Fire-and-forget from main.jsx — UI must not block on this.
 */
export function warmBackend() {
  if (state === BackendState.WARM) return Promise.resolve(true)
  if (inFlight) return inFlight

  setState(BackendState.WARMING)

  inFlight = (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // 1) Process up
        if (!(await pingOk(healthUrl()))) {
          throw new Error('healthz not ok')
        }
        // 2) DB / Prisma path the Explorer hits next
        await Promise.allSettled([
          pingOk(analyticsUrl()),
          pingOk(agentsUrl()),
        ])
        setState(BackendState.WARM)
        return true
      } catch {
        // Network error or abort — retry.
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
