import { z } from 'zod'


const ICON_NAME = z.string().regex(/^[a-z0-9-]{1,24}$/, 'icon must be a short slug')

export const deliverableSchema = z.object({
  // Field on the agent's result payload that holds the download URL.
  key: z.string().min(1).max(60).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'key must be a valid identifier'),
  label: z.string().min(1).max(24),
  hint: z.string().max(24).optional(),
  icon: ICON_NAME.optional(),
})

export const reportShapeSchema = z.object({
  // Numeric headline score, if the agent produces one.
  scoreField: z.string().max(60).optional(),
  scoreMax: z.number().int().min(1).max(1000).optional().default(100),
  titleField: z.string().max(60).optional(),
  subtitleField: z.string().max(60).optional(),
  subtitleLabel: z.string().max(40).optional(),
  countsField: z.string().max(60).optional(),
  // Which keys of countsField to surface, in order. Without it every non-zero count
  // is shown, which is rarely what a caller wants once the object holds a total.
  countsInclude: z.array(z.string().max(40)).max(6).optional(),
  categoriesField: z.string().max(60).optional(),

  noticeField: z.string().max(60).optional(),
})

export const featureSchema = z.object({
  icon: ICON_NAME.optional(),
  title: z.string().min(1).max(48),
  blurb: z.string().max(120).optional(),
})

export const capabilitiesSchema = z.object({
  version: z.literal(1).optional().default(1),
  multiRun: z.boolean().optional().default(false),
  inputHint: z.string().max(200).optional(),
  readyMessage: z.string().max(240).optional(),
  featuresTitle: z.string().max(48).optional(),
  featuresBlurb: z.string().max(200).optional(),

  // Deliverables render as one row of chips, so a small cap keeps that readable.
  deliverables: z.array(deliverableSchema).max(8).optional(),
  report: reportShapeSchema.optional(),
  // Features are a scrolling grid, and a multi-tool agent legitimately has more than
  // a handful — the research agent declares twelve. Capping this at 8 rejected the
  // whole declaration and silently dropped the agent to the heuristic path.
  features: z.array(featureSchema).max(20).optional(),
}).strict()


export function parseCapabilities(raw) {
  if (!raw || typeof raw !== 'object') return null

  const parsed = capabilitiesSchema.safeParse(raw)
  if (!parsed.success) {
    console.warn('[CAPABILITIES] rejected malformed declaration:', parsed.error.issues[0]?.message)
    return null
  }

  const keys = (parsed.data.deliverables || []).map((d) => d.key)
  if (new Set(keys).size !== keys.length) {
    console.warn('[CAPABILITIES] rejected declaration: duplicate deliverable keys')
    return null
  }

  return parsed.data
}
