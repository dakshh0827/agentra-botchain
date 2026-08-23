import { z } from 'zod'

export const createReviewSchema = z.object({
  content: z.string().min(1).max(5000),
  rating: z.number().int().min(0).max(5).optional().default(0),
  parentId: z.string().optional(),
})
