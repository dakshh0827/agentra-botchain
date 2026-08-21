import { URL } from 'url'
import dns from 'dns/promises'

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '0.0.0.0',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal',
])

const BLOCKED_PREFIXES = [
  '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
  '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
  '172.30.', '172.31.', '192.168.', '127.',
]

function isBlockedIp(ip) {
  if (ip === '::1' || ip === '::') return true
  return BLOCKED_PREFIXES.some(p => ip.startsWith(p))
}

export async function assertSafeUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw Object.assign(new Error('Invalid endpoint URL'), { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('Only http/https endpoints are allowed'), { status: 400 })
  }


  if (process.env.ALLOW_LOCAL_AGENT_ENDPOINTS === 'true') {
    return
  }

  const hostname = parsed.hostname

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw Object.assign(new Error(`Endpoint hostname "${hostname}" is not allowed`), { status: 400 })
  }

  // Resolve DNS and check resolved IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true })
    for (const { address } of addresses) {
      if (isBlockedIp(address)) {
        throw Object.assign(
          new Error(`Endpoint resolves to a blocked IP address`),
          { status: 400 }
        )
      }
    }
  } catch (err) {
    if (err.status === 400) throw err
    // DNS failure — block to be safe
    throw Object.assign(new Error(`Cannot resolve endpoint hostname`), { status: 400 })
  }
}