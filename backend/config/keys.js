import { importPKCS8 } from 'jose'

export { AGENTRA_PUBLIC_KEY_PEM } from '../../sdk/src/constants.js'

let cachedKeyPromise = null

export function getPlatformPrivateKey() {
  if (!cachedKeyPromise) {
    const pem = process.env.LICENSE_PRIVATE_KEY
    if (!pem) {
      throw new Error('LICENSE_PRIVATE_KEY environment variable is not set')
    }
    cachedKeyPromise = importPKCS8(pem, 'EdDSA')
  }
  return cachedKeyPromise
}
