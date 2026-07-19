# Agentra Execution Config Migration

# OVERVIEW

Agentra has evolved from a simple text-only AI marketplace into a schema-driven AI execution platform supporting:

- multipart/form-data
- runtime headers
- runtime secrets
- file uploads
- schema-driven execution
- dynamic request building
- multimodal AI APIs

The migration has been implemented incrementally across stages.

---

# IMPORTANT ARCHITECTURE RULES

## Solidity contracts remain unchanged

Execution schemas remain:
- off-chain
- stored in Prisma
- embedded inside metadataURI JSON

Contracts continue handling:
- ownership
- pricing
- access control
- deployment lifecycle

---

# STAGE 1 — BACKEND EXECUTION CONFIG SUPPORT

## STATUS

✅ COMPLETE

Includes:
- Prisma executionConfig field
- backend validation
- metadata propagation
- DB persistence
- backward compatibility

---

# STAGE 2 — DEPLOYSTUDIO EXECUTION SCHEMA BUILDER

## STATUS

✅ COMPLETE

Includes:
- schema builder UI
- header builder
- body field builder
- validation
- live preview
- deploy integration

---

# STAGE 3 — AGENTDETAILS DYNAMIC EXECUTION UI

## STATUS

✅ COMPLETE

Includes:
- schema-driven runtime UI
- dynamic field rendering
- file upload UI
- runtime payload preparation
- backward compatibility

---

# STAGE 4 — DYNAMIC EXECUTION ENGINE

## STATUS

✅ COMPLETE

---

# OBJECTIVE

Upgrade execution pipeline from:
- task-only execution

into:
- fully schema-driven API execution.

The orchestrator now dynamically executes requests using:

```js
agent.executionConfig
```

and:

```js
runtimePayload
```

---

# NEW UTILITIES CREATED

## redactSecrets.js

```txt
backend/utils/redactSecrets.js
```

Centralized secret redaction utility.

Supports:
- header redaction
- payload redaction
- secret-safe logging

---

## ssrfGuard.js

```txt
backend/utils/ssrfGuard.js
```

SSRF protection utility.

Blocks:
- localhost
- internal IP ranges
- metadata endpoints
- unsafe protocols

Also:
- DNS resolves hostnames
- validates resolved IPs

---

## buildExecutionRequest.js

```txt
backend/utils/buildExecutionRequest.js
```

Core schema-driven request builder.

Responsibilities:
- build multipart requests
- build JSON requests
- build urlencoded requests
- inject runtime headers
- append runtime files
- generate axios-compatible configs

NO hardcoded field names exist.

Execution is fully schema-driven.

---

## uploadValidation.js

```txt
backend/utils/uploadValidation.js
```

Upload validation utility.

Supports:
- mime validation
- extension blocking
- file size limits

Blocks dangerous extensions:
```txt
.exe
.sh
.py
.dll
.jar
```

---

# BACKEND EXECUTION ENGINE UPDATED

## executionRoutes.js

Multipart support added using:

```js
multer.memoryStorage()
```

Uploads remain:
- in-memory only
- never persisted to disk

---

# executionController.js

Execution controller now supports:
- JSON payloads
- multipart payloads
- runtimePayload parsing
- uploaded file attachment
- runtime payload enrichment

---

# orchestrator.js UPDATED

Execution engine now supports:

## Legacy path

```json
{
  "task": "..."
}
```

---

## Schema-driven path

```js
{
  task,
  runtimePayload
}
```

with:
- multipart execution
- runtime headers
- runtime files
- dynamic request building

---

# FRONTEND EXECUTION UPDATED

## AgentDetail.jsx

Execution flow now dynamically selects:

- standard JSON execution
- payload execution
- multipart execution

depending on:
- runtimePayload
- uploaded files

---

# agents.js UPDATED

Added:
- executeWithPayload
- executeMultipart

without breaking:
- existing execute()

---

# RUNTIME PAYLOAD STRUCTURE

```js
{
  method,
  contentType,
  headers,
  body,
  files
}
```

Execution engine dynamically interprets this payload.

---

# EXECUTION CONTENT TYPES SUPPORTED

```txt
application/json
multipart/form-data
application/x-www-form-urlencoded
```

---

# FILE UPLOAD SUPPORT

Supported:
- runtime file uploads
- multipart request generation
- upload validation
- temporary in-memory storage

Current upload limit:
```txt
10 MB
```

---

# SECRET HANDLING

Implemented:
- secret log redaction
- runtime-only secret usage

Secrets are never:
- persisted to DB
- written to logs

---

# SSRF PROTECTION

Implemented:
- localhost blocking
- private IP blocking
- metadata endpoint blocking
- DNS resolution validation

---

# BACKWARD COMPATIBILITY

Legacy agents remain fully functional.

Fallback execution path preserved:

```json
{
  "task": "..."
}
```

No migration required for existing marketplace agents.

---

# IMPORTANT CURRENT LIMITATIONS

## Runtime payload is not yet validated against executionConfig

Current limitation:
backend validates generic structure only.

Future requirement:
strict schema-level validation.

---

# Redirect SSRF protection incomplete

Future:
disable redirects or recursively validate redirects.

---

# File uploads currently memory-based

Future:
streaming uploads recommended for scalability.

---

# Header restrictions incomplete

Future:
block dangerous headers:
```txt
Host
Content-Length
Transfer-Encoding
```

---

# CURRENT PLATFORM CAPABILITIES

Creators can deploy:
- multipart APIs
- upload-based AI agents
- API-key-based agents
- multimodal APIs
- dynamic schema-driven agents

Users can:
- upload files
- provide runtime headers
- execute multipart agents
- execute schema-driven APIs

Execution engine now dynamically adapts to executionConfig.

---

# NEXT STAGES

Upcoming:
- strict runtime schema validation
- advanced security hardening
- execution analytics
- retry strategies
- timeout hardening
- streaming uploads
- request observability
- execution tracing
- production optimization