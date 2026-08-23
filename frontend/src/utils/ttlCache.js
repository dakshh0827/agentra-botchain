/** In-memory TTL cache with in-flight request dedupe. */

const entries = new Map()
const inflight = new Map()

export const EXPLORER_CACHE_TTL_MS = 30_000

const MISS = Symbol('ttl-miss')

export function ttlGet(key) {
  const hit = entries.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expiresAt) {
    entries.delete(key)
    return undefined
  }
  return hit.value
}

/** Like ttlGet, but distinguishes "missing" from a cached undefined/null. */
export function ttlPeek(key) {
  const hit = entries.get(key)
  if (!hit) return MISS
  if (Date.now() > hit.expiresAt) {
    entries.delete(key)
    return MISS
  }
  return hit.value
}

export function ttlHas(key) {
  return ttlPeek(key) !== MISS
}

export function ttlSet(key, value, ttlMs = EXPLORER_CACHE_TTL_MS) {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs })
  return value
}

export function ttlClear(key) {
  if (key) {
    entries.delete(key)
    inflight.delete(key)
  } else {
    entries.clear()
    inflight.clear()
  }
}

/**
 * Return cached value if fresh; otherwise run fetcher once and cache the result.
 * Concurrent callers with the same key share one in-flight promise.
 */
export async function ttlCached(key, fetcher, ttlMs = EXPLORER_CACHE_TTL_MS) {
  const peeked = ttlPeek(key)
  if (peeked !== MISS) return peeked

  if (inflight.has(key)) return inflight.get(key)

  const pending = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      ttlSet(key, value, ttlMs)
      inflight.delete(key)
      return value
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, pending)
  return pending
}
