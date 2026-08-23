import { z } from 'zod'


export const chatMessageSchema = z.object({
  question: z.string().min(1).max(2000),
  reportId: z.string().max(120).optional(),
})
