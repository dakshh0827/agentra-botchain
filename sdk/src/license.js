import { jwtVerify, importSPKI } from 'jose'
import { AGENTRA_PUBLIC_KEY_PEM } from './constants.js'

let cachedKey = null
async function getPublicKey() {
  if (!cachedKey) cachedKey = await importSPKI(AGENTRA_PUBLIC_KEY_PEM, 'EdDSA')
  return cachedKey
}

export async function verifyLicenseKey(licenseKey, { agentId, wallet } = {}) {
  const key = await getPublicKey()
  const { payload } = await jwtVerify(licenseKey, key, { algorithms: ['EdDSA'] })
  if (agentId && payload.agentId !== agentId) throw new Error('License key does not match this agent')
  if (wallet && payload.wallet?.toLowerCase() !== wallet.toLowerCase()) throw new Error('License key does not match this wallet')
  return payload
}
