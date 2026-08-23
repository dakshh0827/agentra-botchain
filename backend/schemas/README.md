# `backend/schemas/`

Request shapes and validation. **No I/O in this folder** — a schema file imports
`zod` and other schema files, nothing else. Fetching, DB access, and HTTP belong in
`services/` and `controllers/`.

| File | Holds |
|---|---|
| `common.js` | Pieces used by two or more schemas: category/tier enums, `agentIdSchema`, `runtimePayloadBaseSchema` |
| `agentSchema.js` | `deploySchema`, `updateSchema`, execution-config form |
| `capabilitiesSchema.js` | Agent capability contract v1 + `parseCapabilities()` |
| `chatSchema.js` | `chatMessageSchema` — shared by the buffered and streaming chat controllers |
| `streamSchema.js` | `executeStreamSchema` |
| `executionSchema.js` | `executeSchema`, `composeSchema` |
| `agentCommsSchema.js` | Agent-to-agent call, discover, target resolution |
| `reviewSchema.js` | `createReviewSchema` |

## Conventions

- One file per domain, named `<domain>Schema.js`. `common.js` is the only exception.
- Export every schema as a named export. Controllers import what they need; there is
  no barrel file.
- A schema used by exactly one controller still lives here — keeping half the shapes
  inline is what made them drift in the first place.
- Promote a shape into `common.js` only once a second file needs it. Two schemas that
  merely look alike are not the same schema: buffered execution deliberately drops
  `files` from its runtime payload, while agent-to-agent calls keep it.
