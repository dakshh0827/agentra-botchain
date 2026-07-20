import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'
const SECRET = crypto.createHash('sha256').update(process.env.LLM_KEY_ENCRYPTION_SECRET || '').digest()

export function encryptLlmKey(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${data.toString('hex')}`
}

export function decryptLlmKey(ciphertext) {
  const [ivHex, authTagHex, dataHex] = ciphertext.split(':')
  const decipher = crypto.createDecipheriv(ALGO, SECRET, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}
