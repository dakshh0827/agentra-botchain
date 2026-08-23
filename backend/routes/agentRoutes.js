import { Router } from 'express'
import multer from 'multer'
import {
  getAgents,
  getAgentById,
  getAgentManifest,
  deployAgent,
  confirmDeploy,
  cancelDraft,
  updateAgent,
  deleteAgent,
  validateEndpoint,
  refreshCapabilities,
  searchAgents,
  purchaseAccess,
  upvoteAgent,
  checkUpvote,
  checkAccess,
} from '../controllers/agentController.js'

import { authMiddleware, optionalAuth } from '../middlewares/auth.js'
import { deployLimiter, executionLimiter } from '../middlewares/rateLimiter.js'

import { getAgentMetrics } from '../controllers/analyticsController.js'
import { getReviews, createReview } from '../controllers/reviewController.js'
import { callAgent, discoverAgents, getCommsTarget, getMessages } from '../controllers/agentCommsController.js'
import { issueLicenseKey } from '../services/licenseService.js'
import { getRuntimeSecrets } from '../services/runtimeSecretsService.js'
import {
  chatWithAgent,
  getAgentConversation,
  deleteAgentConversation,
  getMyConversations,
} from '../controllers/chatController.js'
import { executeStream, chatStream } from '../controllers/streamController.js'

const upload = multer({ storage: multer.memoryStorage() })

const router = Router()

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

router.get('/', optionalAuth, getAgents)
router.get('/search', searchAgents)
router.get('/discover', authMiddleware, discoverAgents)
router.get('/comms-target', authMiddleware, getCommsTarget)

// ── CHAT (PROTECTED) ─────────────────────────
// Any agent exposing POST /chat gets durable per-wallet history from these three; the
// agent stays stateless and the thread survives its restarts.
router.get('/conversations', authMiddleware, getMyConversations)
// executionLimiter, not the global apiLimiter: every one of these proxies out to the
// agent's own endpoint, burns the owner's LLM budget, and holds a socket. Sharing one
// limiter instance with /execute caps total agent-endpoint calls per wallet rather
// than handing out a separate budget per route.
router.post('/:agentId/chat', authMiddleware, executionLimiter, chatWithAgent)
// SSE. Separate from /execute because the orchestrator cannot consume a stream —
// see controllers/streamController.js for why it is not taught to.
router.post('/:agentId/execute/stream', authMiddleware, executionLimiter, executeStream)
router.post('/:agentId/chat/stream', authMiddleware, executionLimiter, chatStream)
router.get('/:agentId/conversation', authMiddleware, getAgentConversation)
router.delete('/:agentId/conversation', authMiddleware, deleteAgentConversation)

router.get('/:agentId/metrics', getAgentMetrics)
router.get('/:agentId/manifest', optionalAuth, getAgentManifest)

// ─────────────────────────────────────────────
// WEB3 ACTIONS (PROTECTED)
// ─────────────────────────────────────────────

// Deploy agent (creates draft first)
router.post('/deploy', authMiddleware, deployLimiter, deployAgent)


router.post('/validate-endpoint', authMiddleware, validateEndpoint)

// Owner re-probes their agent's /capabilities after redeploying it
router.post('/:agentId/capabilities/refresh', authMiddleware, refreshCapabilities)
router.post('/:fromId/call-agent', authMiddleware, upload.any(), callAgent)
router.get('/:agentId/messages', authMiddleware, getMessages)

// Routes with :id param
router.get('/:id', optionalAuth, getAgentById)

// Confirm on-chain deployment
router.post('/:id/confirm', authMiddleware, confirmDeploy)

// Cancel draft
router.delete('/:id/draft', authMiddleware, cancelDraft)

// Purchase access (monthly / lifetime)
router.post('/:agentId/purchase', authMiddleware, purchaseAccess)

// Upvote agent
router.post('/:agentId/upvote', authMiddleware, upvoteAgent)

// Check if user has upvoted
router.get('/:agentId/upvote-status', authMiddleware, checkUpvote)

// Check access
router.get('/:agentId/access', authMiddleware, checkAccess)

// Reviews
router.get('/:agentId/reviews', optionalAuth, getReviews)
router.post('/:agentId/reviews', authMiddleware, createReview)

// Update / Delete
router.put('/:id', authMiddleware, updateAgent)
router.delete('/:id', authMiddleware, deleteAgent)

// Offline license key issuance
router.post('/:id/license', authMiddleware, async (req, res, next) => {
  try {
    res.json(await issueLicenseKey(req.params.id, req.walletAddress))
  } catch (err) {
    next(err)
  }
})

// Runtime secret-preset fetch — license JWT itself is the credential, no wallet auth needed
router.post('/:agentId/runtime-secrets', async (req, res, next) => {
  try {
    const licenseToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!licenseToken) return res.status(401).json({ error: 'Missing license token' })
    res.json(await getRuntimeSecrets(req.params.agentId, licenseToken))
  } catch (err) {
    next(err)
  }
})

export default router