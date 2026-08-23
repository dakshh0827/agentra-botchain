import { SignJWT } from 'jose'
import prisma from '../lib/prisma.js'
import { getPlatformPrivateKey } from '../config/keys.js'
import { getAgentAccessState, UNPAID_ACCESS_REASONS } from './accessService.js'

const LIFETIME_EXPIRY = new Date('2099-01-01T00:00:00.000Z')

function buildAgentLookup(id) {
  const value = String(id || '').trim()
  const isObjectId = /^[a-f\d]{24}$/i.test(value)
  const isContractAgentId = /^\d+$/.test(value)

  if (isObjectId) return { id: value }
  if (isContractAgentId) return { contractAgentId: Number(value) }
  return { agentId: value }
}

export async function issueLicenseKey(agentId, wallet) {
  const agent = await prisma.agent.findFirst({ where: buildAgentLookup(agentId) })
  if (!agent) {
    const err = new Error('Agent not found')
    err.status = 404
    throw err
  }

  const accessState = await getAgentAccessState(agent, wallet)
  if (UNPAID_ACCESS_REASONS.has(accessState.reason)) {
    const err = new Error('Free access does not include a license key — purchase this agent to run it locally')
    err.status = 403
    throw err
  }

  const isLifetime = Boolean(
    accessState.access?.isLifetime || accessState.purchase?.isLifetime || accessState.reason === 'owner' || accessState.reason === 'on-chain'
  )
  const expiresAt = isLifetime ? LIFETIME_EXPIRY : accessState.access?.expiresAt || accessState.purchase?.expiresAt

  if (!accessState.hasAccess || !expiresAt) {
    const err = new Error('No active subscription for this agent')
    err.status = 403
    throw err
  }

  const privateKey = await getPlatformPrivateKey()
  const token = await new SignJWT({ agentId: agent.agentId, wallet: String(wallet).toLowerCase(), isLifetime })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey)

  return { licenseKey: token, expiresAt }
}
