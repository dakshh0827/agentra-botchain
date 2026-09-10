import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import config from './config/config.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { apiLimiter } from './middlewares/rateLimiter.js'
import { authMiddleware } from './middlewares/auth.js'
import { deployLimiter } from './middlewares/rateLimiter.js'
import prisma from './lib/prisma.js'
import contractManager from './lib/contractManager.js'

// Routes
import agentRoutes from './routes/agentRoutes.js'
import authRoutes from './routes/authRoutes.js'
import executionRoutes from './routes/executionRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import { deployAgent } from './controllers/agentController.js'

import { startOracleJob } from './jobs/oracleJob.js'
import { startResolverJob } from './jobs/resolverJob.js'

const app = express()


app.set('etag', false)

// ── Core middleware ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
)

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'https://www.agentra.live',
      'https://agentra.live',
      'https://www.agentra69.in',
      'https://agentra-botchain.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-wallet-address',
      'Cache-Control',
      'Pragma',
    ],
  })
)


app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) })
})

app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))
app.use(morgan(config.isDev ? 'dev' : 'combined'))
app.use(apiLimiter)

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

// ── Diagnostics ────────────────────────────────────────────────
// Reaches out to the chain RPC, so it is for humans and dashboards — not for a
// keep-warm ping. Use /healthz for that.
app.get('/health', async (req, res) => {
  const network = await contractManager.getNetworkInfo?.()
  res.json({
    status: 'ok',
    service: 'agentra-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    blockchain: network || null,
  })
})

// ── API routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.post('/api/agents/deploy', authMiddleware, deployLimiter, deployAgent)
app.use('/api', executionRoutes)
app.use('/api', analyticsRoutes)
app.use('/api', reviewRoutes)
app.use('/api', transactionRoutes)

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  })
})

// ── Error handler ──────────────────────────────────────────────
app.use(errorHandler)

// ── Start server ───────────────────────────────────────────────
const start = async () => {
  try {
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('🚀 AGENTRA BACKEND STARTUP')
    console.log('═══════════════════════════════════════════════════════════')
    
    console.log('\n[STARTUP] Initializing contract manager...')
    await contractManager.init()
    console.log('[STARTUP] Contract manager initialization complete')
    console.log('[STARTUP] Contract manager mock mode:', contractManager.isMock)

    if (!contractManager.isMock) {
      console.log('[STARTUP] Starting blockchain event listeners...')
      contractManager.startAllListeners(prisma)
      console.log('[STARTUP] ✅ Blockchain event listeners started')
    } else {
      console.log('[STARTUP] ⚠️ Mock mode active - no blockchain event listeners')
    }

    // startOracleJob() // ❌ DISABLED: No more automated price update transactions
    console.log('[STARTUP] Starting resolver job...')
    startResolverJob()
    console.log('[STARTUP] ✅ Resolver job started')

    app.listen(config.port, () => {
      console.log(`\n═══════════════════════════════════════════════════════════`)
      console.log(`✅ Agentra API ready on port ${config.port}`)
      console.log(`═══════════════════════════════════════════════════════════`)
      console.log(`   Environment  : ${config.nodeEnv}`)
      console.log(`   Database     : Prisma / MongoDB`)
      console.log(`   Blockchain   : ${contractManager.isMock ? '🔴 MOCK MODE' : '🟢 LIVE MODE'}`)
      console.log(`   Health       : http://localhost:${config.port}/health`)
      console.log(`═══════════════════════════════════════════════════════════\n`)
    })
  } catch (err) {
    console.error('\n❌ STARTUP ERROR')
    console.error(err)
    process.exit(1)
  }
}
 
start()
 
export default app
