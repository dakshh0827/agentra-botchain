import { Router } from 'express'
import { getPendingTransactions } from '../controllers/transactionController.js'
import { authMiddleware } from '../middlewares/auth.js'

const router = Router()
router.get('/transactions/pending', authMiddleware, getPendingTransactions)
export default router