import { jwtVerify, importSPKI } from 'jose'
import prisma from '../lib/prisma.js'
import { decryptLlmKey } from '../utils/cryptoKey.js'
import { AGENTRA_PUBLIC_KEY_PEM } from '../config/keys.js'

let cachedKey = null
async function getVerifyKey() {
  if (!cachedKey) cachedKey = await importSPKI(AGENTRA_PUBLIC_KEY_PEM, 'EdDSA')
  return cachedKey
}

function buildAgentLookup(id) {
  const value = String(id || '').trim()
  const isObjectId = /^[a-f\d]{24}$/i.test(value)
  const isContractAgentId = /^\d+$/.test(value)

  if (isObjectId) return { id: value }
  if (isContractAgentId) return { OR: [{ agentId: value }, { contractAgentId: Number(value) }] }
  return { agentId: value }
}

export async function getRuntimeKey(agentId, licenseToken) {
  let payload
  try {
    ;({ payload } = await jwtVerify(licenseToken, await getVerifyKey(), { algorithms: ['EdDSA'] }))
  } catch {
    const err = new Error('Invalid or expired license token')
    err.status = 401
    throw err
  }

  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(agentId), select: { agentId: true, encryptedLlmKey: true } })

  if (!agent) {
    const err = new Error('Agent not found')
    err.status = 404
    throw err
  }

  if (payload.agentId !== agent.agentId) {
    const err = new Error('License does not match this agent')
    err.status = 403
    throw err
  }

  if (!agent?.encryptedLlmKey) {
    const err = new Error('This agent has no local-execution key configured')
    err.status = 404
    throw err
  }

  return { llmApiKey: decryptLlmKey(agent.encryptedLlmKey) }
}
