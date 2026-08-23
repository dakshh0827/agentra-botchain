import { z } from 'zod'

import { agentIdSchema, runtimePayloadBaseSchema } from './common.js'


export const executeSchema = z.object({
  task: z.string().max(10000).optional().default(''),
  runtimePayload: runtimePayloadBaseSchema.optional(),
})

/** Fan a single request across several agents, in order or in parallel. */
export const composeSchema = z.object({
  agents: z.array(z.object({
    agentId: agentIdSchema,
    task: z.string().min(1),
  })).min(2).max(5),
  sequential: z.boolean().optional(),
})
