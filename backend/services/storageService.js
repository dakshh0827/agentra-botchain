// backend/services/storageService.js
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk'
import { ethers } from 'ethers'
import config from '../config/config.js'
import { generateDataKey, encryptAgentPayload, decryptAgentPayload, sealDataKey, unsealDataKey } from '../utils/cryptoKey.js'

const encoder = new TextEncoder()

function toDevMetadataFallback(metadata, payload) {
  const digest = ethers.keccak256(payload)
  return {
    metadataUri: `0g://dev-${digest.slice(2)}`,
    rootHash: digest,
    txHash: null,
    fallback: true,
  }
}

function getStorageCredentials() {
  const { rpcUrl, indexerRpc, privateKey } = config.storage
  console.log("0G Storage Config:", { rpcUrl, indexerRpc, hasPrivateKey: !!privateKey })
  if (!rpcUrl) throw new Error('0G storage RPC URL is not configured')
  if (!indexerRpc) throw new Error('0G storage indexer RPC URL is not configured')
  const normalizedPrivateKey = (privateKey || '').trim()
  if (!normalizedPrivateKey) throw new Error('0G storage private key is not configured. Set OG_STORAGE_PRIVATE_KEY to a valid 32-byte hex key.')
  if (!ethers.isHexString(normalizedPrivateKey, 32)) throw new Error('0G storage private key is invalid. Replace placeholder values with a real 0x-prefixed 32-byte hex key.')
  return { rpcUrl, indexerRpc, privateKey: normalizedPrivateKey }
}

function normalizeRootHash(tx, tree) {
  const rootHash = tx?.rootHash || tx?.rootHashes?.[0] || tree?.rootHash?.()
  if (!rootHash) throw new Error('0G upload completed without a root hash')
  return rootHash
}

function extractRootHash(metadataUri) {
  const value = String(metadataUri || '').trim()
  if (!value) throw new Error('Metadata URI is required')
  if (value.startsWith('0g://')) return value.slice('0g://'.length)
  return value
}

async function uploadRawToOg(payloadBuffer) {
  const memData = new MemData(payloadBuffer)
  let credentials
  try {
    credentials = getStorageCredentials()
  } catch (err) {
    if (config.isDev) {
      console.warn(`[0G STORAGE] ${err.message} Falling back to local metadata URI in development.`)
      return toDevMetadataFallback(null, payloadBuffer)
    }
    err.status = 500
    throw err
  }
  const { rpcUrl, indexerRpc, privateKey } = credentials
  const [tree, treeError] = await memData.merkleTree()
  if (treeError !== null) throw new Error(`0G merkle tree error: ${treeError}`)

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  const indexer = new Indexer(indexerRpc)
  const [tx, uploadError] = await indexer.upload(memData, rpcUrl, signer)
  if (uploadError !== null) throw new Error(`0G upload error: ${uploadError}`)

  const rootHash = normalizeRootHash(tx, tree)
  return { metadataUri: `0g://${rootHash}`, rootHash, txHash: tx?.txHash || null }
}

async function downloadRawFromOg(uri) {
  const rootHash = extractRootHash(uri)
  const { indexerRpc } = getStorageCredentials()
  const indexer = new Indexer(indexerRpc)
  const [blob, err] = await indexer.downloadToBlob(rootHash)
  if (err !== null) {
    console.error("0G DOWNLOAD ERROR", err)
    throw new Error(`0G metadata download error: ${err.message}`)
  }
  return Buffer.from(await blob.arrayBuffer())
}

// ── PUBLIC display metadata (avatar, name shown in marketplace) — unchanged ──
export async function uploadAgentMetadata(metadata) {
  const payload = encoder.encode(JSON.stringify(metadata))
  const result = await uploadRawToOg(payload)
  console.log("UPLOAD CONFIG (public display)", { rootHash: result.rootHash })
  return result
}

export async function resolveAgentMetadata(metadataUri) {
  const buf = await downloadRawFromOg(metadataUri)
  const raw = buf.toString('utf8')
  if (!raw.trim()) throw new Error('0G metadata download returned an empty document')
  console.log("Resolving public metadata:", metadataUri)
  return JSON.parse(raw)
}

// ── ENCRYPTED agent intelligence (system prompt / model config / memory) ──
export async function uploadEncryptedAgentIntelligence(intelligencePayload) {
  const dataKey = generateDataKey()
  const plaintext = JSON.stringify(intelligencePayload)
  const encrypted = encryptAgentPayload(plaintext, dataKey)

  const result = await uploadRawToOg(encrypted)
  const sealedKey = sealDataKey(dataKey)

  console.log("UPLOAD CONFIG (encrypted intelligence)", { rootHash: result.rootHash })

  return {
    intelligenceUri: result.metadataUri,
    dataCommitment: '0x' + Buffer.from(result.rootHash.replace(/^0x/, ''), 'hex').toString('hex').padStart(64, '0'),
    sealedKey,
  }
}

export async function resolveEncryptedAgentIntelligence(intelligenceUri, sealedKeyHex) {
  const encrypted = await downloadRawFromOg(intelligenceUri)
  const dataKey = unsealDataKey(sealedKeyHex)
  const plaintext = decryptAgentPayload(encrypted, dataKey)
  return JSON.parse(plaintext)
}