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

    // priceUSD.toString() uses JS's shortest round-trip decimal representation, so it
    // only carries digits the float actually has. toFixed(18) instead manufactures 18
    // decimal digits from IEEE-754 rounding noise (e.g. 0.1 -> "0.100000000000000006"),
    // and the old .slice(0, 20) truncated that at a fixed character count regardless of
    // how many digits belonged to the integer part — both are precision bugs.
    const priceWei = ethers.parseUnits(priceUSD.toString(), 18)

    // Skip the on-chain write if the price hasn't moved enough to be worth the gas.
    // Reads the live contract value (not an in-memory cache) so this stays correct
    // across process restarts, and treats a revert (uninitialized oracle) as "always write".
    const onChainPriceWei = await contractManager.getCurrent0GPrice()
    if (onChainPriceWei && onChainPriceWei > 0n) {
      const diff = priceWei > onChainPriceWei ? priceWei - onChainPriceWei : onChainPriceWei - priceWei
      const changePercent = Number((diff * 10000n) / onChainPriceWei) / 100
      if (changePercent < 1) {
        console.log(`[ORACLE] Price change ${changePercent.toFixed(3)}% < 1% threshold — skipping update ($${priceUSD} USD / ${priceWei} wei, on-chain: ${onChainPriceWei} wei)`)
        return
      }
    }

    console.log(`[ORACLE] Updating price: $${priceUSD} USD -> ${priceWei} wei`)

    const tx = await contractManager.agentra.update0GPrice(priceWei)
    const receipt = await tx.wait(1)

    console.log(`[ORACLE] ✅ 0G price updated: $${priceUSD} USD (${priceWei} wei) | tx: ${receipt.hash}`)

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

if (process.argv[1].includes('oracleJob.js')) {
  console.log('[ORACLE DEBUG] Running one-time update...')
  runOracleUpdate()
}