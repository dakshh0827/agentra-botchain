import { z } from 'zod'

import { agentIdSchema, runtimePayloadBaseSchema } from './common.js'

export const callAgentSchema = z.object({
  task: z.string().min(1).max(10000),
  targetAgentName: z.string().min(2).max(64).optional(),
  targetAgentId: agentIdSchema.optional(),
  autoDiscover: z.boolean().optional().default(false),
  txHash: z.string().min(10).optional(),
  runtimePayload: runtimePayloadBaseSchema
    .extend({ files: z.record(z.string(), z.unknown()).optional().default({}) })
    .optional(),
})

export const discoverSchema = z.object({
  task: z.string().min(2).max(300),
  excludeId: z.string().optional(),
})

export const commsTargetSchema = z.object({
  targetAgentName: z.string().min(2).max(64).optional(),
  targetAgentId: agentIdSchema.optional(),
})
