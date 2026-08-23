import axios from 'axios'
import prisma from '../lib/prisma.js'
import { parseCapabilities } from '../schemas/capabilitiesSchema.js'
import { capabilitiesFingerprint, inferCapabilities } from '../utils/inferCapabilities.js'
import { assertSafeUrl } from '../utils/ssrfGuard.js'


const PROBE_TIMEOUT_MS = 5000
const MAX_PROBE_BYTES = 32 * 1024


export async function probeCapabilities(endpoint) {
  if (!endpoint) return null

  const base = String(endpoint).trim().replace(/\/+$/, '')
  const url = `${base}/capabilities`

  try {
    await assertSafeUrl(url)
  } catch (err) {
    console.warn('[CAPABILITIES] refusing to probe unsafe endpoint:', err.message)
    return null
  }

  try {
    const res = await axios.get(url, {
      timeout: PROBE_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: MAX_PROBE_BYTES,
      headers: { Accept: 'application/json' },
      validateStatus: (s) => s === 200,
    })
    return parseCapabilities(res.data)
  } catch {
    return null
  }
}


export async function resolveCapabilities({ declared, endpoint }) {
  const explicit = parseCapabilities(declared)
  if (explicit) return explicit
  return probeCapabilities(endpoint)
}

/**
 * Learn an agent's shape from a run it just completed.
 *
 * Most agents will never serve /capabilities, so this is how the marketplace stops
 * guessing for everyone else. Best-effort and fire-and-forget: it runs after the
 * caller already has their result, and a failure here must never surface to them.
 *
 * Skipped entirely for an agent that declares its own contract — an author who took
 * the trouble to be explicit should not be second-guessed by a heuristic.
 */
export async function learnFromResult(agent, payload) {
  if (!agent || agent.capabilities) return null

  const derived = inferCapabilities(payload)
  if (!derived) return null

  // Validate what we generated. If our own inference cannot satisfy the contract,
  // storing it would only push the failure into the frontend.
  const valid = parseCapabilities(derived)
  if (!valid) return null

  // A run whose shape has not changed should not cost a write.
  if (capabilitiesFingerprint(agent.inferredCapabilities) === capabilitiesFingerprint(valid)) {
    return valid
  }

  try {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { inferredCapabilities: valid },
    })
  } catch (err) {
    console.error('[CAPABILITIES] could not store inferred contract:', err.message)
    return null
  }

  return valid
}

export default { probeCapabilities, resolveCapabilities, learnFromResult }
