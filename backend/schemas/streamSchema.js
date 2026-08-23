import { z } from 'zod'


export const executeStreamSchema = z.object({
  task: z.string().min(1).max(4000),
  maxPages: z.number().int().min(1).max(50).optional(),
})
