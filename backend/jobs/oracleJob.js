import cron from 'node-cron'
import axios from 'axios'
import { ethers } from 'ethers'
import config from '../config/config.js'
import contractManager from '../lib/contractManager.js'

let lastKnownPriceUSD = null
let isRunning = false

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=zero-gravity&vs_currencies=usd'
const FALLBACK_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'

async function fetch0GPrice() {
  try {
    const res = await axios.get(COINGECKO_URL, { timeout: 8000 })
    const price = res.data?.['zero-gravity']?.usd
    if (price && price > 0) return price
  } catch (err) {
    console.warn('[ORACLE] CoinGecko primary fetch failed:', err.message)
  }

  // Fallback: use a hardcoded reasonable price to avoid breaking payments
  if (lastKnownPriceUSD) {
    console.warn('[ORACLE] Using last known price as fallback:', lastKnownPriceUSD)
    return lastKnownPriceUSD
  }

  // Last resort fallback
  console.warn('[ORACLE] No price available, using fallback price: $1.00')
  return 1.0
}

async function runOracleUpdate() {
  if (isRunning) {
    console.log('[ORACLE] Already running, skipping...')
    return
  }

  isRunning = true

  try {
    await contractManager.init()

    if (contractManager.isMock) {
      console.log('[ORACLE] Mock mode — skipping on-chain price update')
      return
    }

    const priceUSD = await fetch0GPrice()
    lastKnownPriceUSD = priceUSD

    // Convert to 18-decimal wei representation (e.g., $1.25 → 1250000000000000000)
    const priceWei = ethers.parseUnits(priceUSD.toFixed(18).slice(0, 20), 18)

    const tx = await contractManager.agentra.update0GPrice(priceWei)
    const receipt = await tx.wait(1)

    console.log(`[ORACLE] ✅ 0G price updated: $${priceUSD} | tx: ${receipt.hash}`)

    // Cache price in config for reference
    config.oracle.lastPrice = priceUSD
    config.oracle.lastUpdated = new Date().toISOString()

  } catch (err) {
    console.error('[ORACLE] ❌ Price update failed:', err.message)
  } finally {
    isRunning = false
  }
}

function startOracleJob() {
  const schedule = config.oracle.cronSchedule || '*/10 * * * *'
  console.log(`[ORACLE JOB] Starting — schedule: ${schedule}`)

  cron.schedule(schedule, runOracleUpdate)

  // Run once shortly after startup
  setTimeout(runOracleUpdate, 5000)
}

export { startOracleJob, runOracleUpdate, lastKnownPriceUSD }