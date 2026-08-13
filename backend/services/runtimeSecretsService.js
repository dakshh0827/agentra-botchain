import { jwtVerify, importSPKI } from 'jose'
import prisma from '../lib/prisma.js'
import { decryptLlmKey as decryptSecretValue } from '../utils/cryptoKey.js'
import { AGENTRA_PUBLIC_KEY_PEM } from '../config/keys.js'

let cachedKey = null
async function getVerifyKey() {
  if (!cachedKey) cachedKey = await importSPKI(AGENTRA_PUBLIC_KEY_PEM, 'EdDSA')
  return cachedKey
}

export async function getRuntimeSecrets(agentId, licenseToken) {
  const { payload } = await jwtVerify(licenseToken, await getVerifyKey(), { algorithms: ['EdDSA'] })
  if (payload.agentId !== agentId) {
    const err = new Error('License does not match this agent')
    err.statusCode = 403
    throw err
  }

  const agent = await prisma.agent.findFirst({ where: { agentId }, select: { executionConfig: true } })
  const config = agent?.executionConfig || {}
  const decryptField = (f) => (f.secret && !f.userProvided && f.value) ? [f.key, decryptSecretValue(f.value)] : null

  const headerSecrets = Object.fromEntries((config.headers || []).map(decryptField).filter(Boolean))
  const bodySecrets = Object.fromEntries((config.bodyFields || []).map(decryptField).filter(Boolean))

  return { headerSecrets, bodySecrets }
}
