import dotenv from 'dotenv'

dotenv.config()

const config = {
  port: parseInt(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-CHANGE-ME',
    expiresIn: '7d',
  },

  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || '',
    privateKey: process.env.PRIVATE_KEY || '',
    contracts: {
      agentra: process.env.AGENTRA_CONTRACT_ADDRESS || '',
    },
  },

  // token: {
  //   decimals: 18,
  //   upvoteCostWei: process.env.UPVOTE_COST_WEI || '1000000000000000000', // 1 AGT
  //   listingFeesWei: {
  //     // Keyed by lowercase tier name for easy lookup
  //     standard: process.env.LISTING_FEE_STANDARD || '50000000000000000000',       // 50 AGT
  //     professional: process.env.LISTING_FEE_PRO || '150000000000000000000',        // 150 AGT
  //     enterprise: process.env.LISTING_FEE_ENTERPRISE || '500000000000000000000',   // 500 AGT
  //   },
  // },

  storage: {
    rpcUrl: process.env.OG_STORAGE_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || '',
    indexerRpc: process.env.OG_STORAGE_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai',
    privateKey: process.env.OG_STORAGE_PRIVATE_KEY || process.env.PRIVATE_KEY || '',
  },

  // Add after the storage block:
  oracle: {
    cronSchedule: process.env.ORACLE_CRON_SCHEDULE || '*/10 * * * *',
    priceApiUrl: process.env.ORACLE_PRICE_API_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd',
    lastPrice: null,
    lastUpdated: null,
  },

  resolver: {
    cronSchedule: process.env.RESOLVER_CRON_SCHEDULE || '*/2 * * * *',
  },

  freeTier: {
   
    openAccess: String(process.env.FREE_AGENT_ACCESS || '').toLowerCase() === 'true',
    runsPerAgent: Number.isFinite(parseInt(process.env.FREE_RUNS_PER_AGENT))
      ? parseInt(process.env.FREE_RUNS_PER_AGENT)
      : 25,
  },

  platform: {
    maxCallDepth: parseInt(process.env.MAX_CALL_DEPTH) || 5,
    callTimeoutMs: parseInt(process.env.CALL_TIMEOUT_MS) || 600000, // 10 minutes for Hugging Face models
    rateLimitWindow: 60 * 1000,
    rateLimitMax: 100,
    executionRateLimitMax: 20,
    deployRateLimitMax: 10,
    leaderboardCronSchedule: '*/5 * * * *',
    healthCheckCronSchedule: '*/2 * * * *',
    // ADD inside platform: { ... }
    executionTimeoutMs: parseInt(process.env.EXECUTION_TIMEOUT_MS) || 600000, // 10 minutes for Hugging Face models
    maxPayloadSizeBytes: parseInt(process.env.MAX_PAYLOAD_BYTES) || 5 * 1024 * 1024,
    maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024,
    maxRetries: parseInt(process.env.EXECUTION_MAX_RETRIES) || 2,
  },
}

// Log configuration on load
console.log('[CONFIG] Configuration loaded:')
console.log('[CONFIG] Node Environment:', config.nodeEnv)
console.log('[CONFIG] Port:', config.port)
console.log('[CONFIG] Blockchain RPC URL:', config.blockchain.rpcUrl || '(not set)')
console.log('[CONFIG] Agentra Contract Address:', config.blockchain.contracts.agentra || '(not set)')
console.log('[CONFIG] Has Private Key:', !!config.blockchain.privateKey)
console.log('[CONFIG] Storage RPC URL:', config.storage.rpcUrl || '(not set)')
console.log('[CONFIG] Storage Indexer RPC:', config.storage.indexerRpc || '(not set)')
console.log('[CONFIG] Has Storage Private Key:', !!config.storage.privateKey)
console.log('[CONFIG] Free tier:', config.freeTier.openAccess
  ? 'OPEN ACCESS (all agents free for any wallet)'
  : `${config.freeTier.runsPerAgent} free run(s) per wallet per agent`)

export default config