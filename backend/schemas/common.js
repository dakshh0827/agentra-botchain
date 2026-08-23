import { z } from 'zod'



export const agentCategorySchema = z.enum([
  'Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other',
])

export const agentTierSchema = z.enum(['Standard', 'Professional', 'Enterprise'])

export const agentIdSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))


export const runtimePayloadBaseSchema = z.object({
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.record(z.string(), z.unknown()).optional().default({}),
  contentType: z.string().optional(),
  method: z.string().optional(),
})
