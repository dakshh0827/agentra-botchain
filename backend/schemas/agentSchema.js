import { z } from 'zod'

import { agentCategorySchema, agentTierSchema } from './common.js'
import { capabilitiesSchema } from './capabilitiesSchema.js'


export const executionContentTypeSchema = z.enum(['json', 'form-data', 'x-www-form-urlencoded'])

export const executionFieldTypeSchema = z.enum(['text', 'textarea', 'number', 'file', 'password', 'boolean'])

export const executionHeaderFieldSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().optional(),
  required: z.boolean(),
  secret: z.boolean(),
  userProvided: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
})

export const executionBodyFieldSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Key must be a valid identifier'),
  type: executionFieldTypeSchema,
  value: z.string().optional(),
  secret: z.boolean().optional().default(false),
  required: z.boolean(),
  userProvided: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
})

export const executionConfigSchema = z.object({
  method: z.literal('POST'),
  contentType: executionContentTypeSchema,
  headers: z.array(executionHeaderFieldSchema).max(20),
  bodyFields: z.array(executionBodyFieldSchema).max(30),
}).superRefine((config, ctx) => {
  const headerKeys = config.headers.map(h => h.key)
  const bodyKeys = config.bodyFields.map(f => f.key)
  if (new Set(headerKeys).size !== headerKeys.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate header keys are not allowed' })
  }
  if (new Set(bodyKeys).size !== bodyKeys.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate body field keys are not allowed' })
  }
})

export const deploySchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().min(10).max(1000).optional(),
  category: agentCategorySchema,
  tags: z.array(z.string().max(32)).max(10).optional(),
  pricing: z.string(),             // monthly price in wei
  lifetimeMultiplier: z.number().int().min(1).max(36).optional().default(12),
  commsEnabled: z.boolean().optional().default(false),
  commsPricePerCall: z.string().optional().default('0'),
  tier: agentTierSchema,
  endpoint: z.string().url(),
  mcpSchema: z.record(z.string(), z.unknown()).optional(),
  executionConfig: executionConfigSchema.optional(),
  capabilities: capabilitiesSchema.optional(),
  deployMode: z.enum(['database', 'blockchain']).optional(),
  status: z.string().optional(),
})

export const updateSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  description: z.string().min(10).max(1000).optional(),
  endpoint: z.string().url().optional(),
  pricing: z.string().optional(),
  lifetimeMultiplier: z.number().int().min(1).max(36).optional(),
  commsEnabled: z.boolean().optional(),
  commsPricePerCall: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: agentCategorySchema.optional(),
  capabilities: capabilitiesSchema.nullable().optional(),
})
