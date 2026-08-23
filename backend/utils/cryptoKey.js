// backend/utils/cryptoKey.js
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

// ─────────────────────────────────────────────
// ERC-7857 "agent intelligence" envelope encryption
// ─────────────────────────────────────────────
// Generates a fresh, random Data Encryption Key (DEK) per agent. The agent's
// actual system prompt / model config / memory is encrypted with this DEK
// before being uploaded to 0G Storage — that ciphertext is what
// `dataCommitment` (the 0G root hash) points to on-chain.
//
// The DEK itself is then wrapped ("sealed") with the SAME server-held
// LLM_KEY_ENCRYPTION_SECRET used above. This is a BOOTSTRAP model: it means
// your backend, not the owner's wallet, is the thing that can actually
// decrypt an agent's intelligence — access is gated by checking
// `ownerOf(tokenId) === requester` on every read/transfer, not by true
// per-wallet asymmetric cryptography. That's why `transferAgentDEK` below
// re-wraps with the SAME secret regardless of `to` — nothing cryptographic
// actually changes hands, only the on-chain permission record does.
//
// This satisfies the ERC-7857 INTERFACE (transfer/clone/authorizeUsage all
// work, proofs are checked) without you having to build wallet-to-wallet
// ECIES key exchange on day one. When you're ready to harden this to real
// per-owner sealing (so even a compromised backend can't read an agent
// someone else owns), swap this for something like `eth-crypto`'s ECIES
// encryption against the owner's Ethereum public key, recovered from a
// signed message during account setup — that's a separate, larger piece of
// work and 0G's TEE-based approach exists specifically to avoid needing it.

export function generateDataKey() {
  return crypto.randomBytes(32) // raw AES-256 key for the agent payload
}

export function encryptAgentPayload(plaintextJson, dataKey) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, dataKey, iv)
  const data = Buffer.concat([cipher.update(Buffer.from(plaintextJson, 'utf8')), cipher.final()])
  const authTag = cipher.getAuthTag()
  // This is what gets uploaded to 0G Storage — ciphertext only, never plaintext.
  return Buffer.concat([iv, authTag, data])
}

export function decryptAgentPayload(encryptedBuffer, dataKey) {
  const iv = encryptedBuffer.subarray(0, 12)
  const authTag = encryptedBuffer.subarray(12, 28)
  const data = encryptedBuffer.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, dataKey, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/// Wraps the DEK for on-chain storage as `sealedKey`. Returns a hex string
/// suitable for passing directly as `bytes` to the contract.
export function sealDataKey(dataKey) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv)
  const data = Buffer.concat([cipher.update(dataKey), cipher.final()])
  const authTag = cipher.getAuthTag()
  return '0x' + Buffer.concat([iv, authTag, data]).toString('hex')
}

export function unsealDataKey(sealedKeyHex) {
  const buf = Buffer.from(sealedKeyHex.replace(/^0x/, ''), 'hex')
  const iv = buf.subarray(0, 12)
  const authTag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, SECRET, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(data), decipher.final()]) // returns raw DEK
}

/// Called during transfer(). In the bootstrap model nothing cryptographic
/// changes — the DEK is still wrapped with the same server secret — but
/// this exists as the single seam you'd modify when moving to real
/// per-owner ECIES sealing later.
export function reSealDataKeyForTransfer(currentSealedKeyHex) {
  const dek = unsealDataKey(currentSealedKeyHex)
  return sealDataKey(dek)
}