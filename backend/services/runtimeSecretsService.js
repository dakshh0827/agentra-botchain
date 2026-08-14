import { jwtVerify, importSPKI } from 'jose'
import prisma from '../lib/prisma.js'
import { decryptLlmKey as decryptSecretValue } from '../utils/cryptoKey.js'
import { AGENTRA_PUBLIC_KEY_PEM } from '../config/keys.js'

function buildAgentLookup(id) {
  const value = String(id || '').trim()
  const isObjectId = /^[a-f\d]{24}$/i.test(value)
  const isContractAgentId = /^\d+$/.test(value)

  if (isObjectId) return { id: value }
  if (isContractAgentId) return { contractAgentId: Number(value) }
  return { agentId: value }
}

let cachedKey = null
async function getVerifyKey() {
  if (!cachedKey) cachedKey = await importSPKI(AGENTRA_PUBLIC_KEY_PEM, 'EdDSA')
  return cachedKey
}

export async function getRuntimeSecrets(agentId, licenseToken) {
  const { payload } = await jwtVerify(licenseToken, await getVerifyKey(), { algorithms: ['EdDSA'] })

  const agent = await prisma.agent.findFirst({
    where: buildAgentLookup(agentId),
    select: { agentId: true, executionConfig: true },
  })

  if (!agent) {
    const err = new Error('Agent not found')
    err.statusCode = 404
    throw err
  }

  if (payload.agentId !== agent.agentId) {
    const err = new Error('License does not match this agent')
    err.statusCode = 403
    throw err
  }

  const config = agent?.executionConfig || {}
  const decryptField = (f) => (f.secret && !f.userProvided && f.value) ? [f.key, decryptSecretValue(f.value)] : null

  const headerSecrets = Object.fromEntries((config.headers || []).map(decryptField).filter(Boolean))
  const bodySecrets = Object.fromEntries((config.bodyFields || []).map(decryptField).filter(Boolean))

  return { headerSecrets, bodySecrets }
}
