# Agent capability contract (v1)

## Why this exists

The marketplace UI used to decide what to render by matching an agent's **name**
against `/\bseo\b/i`. That meant:

- an agent called "Search Engine Optimizer" got the generic UI, because the literal
  string "seo" was missing;
- any agent whose description happened to mention SEO got an audit UI it could not
  deliver on;
- download slots (`reportUrl` / `pdfUrl` / `excelUrl` / `csvUrl`) and the score field
  (`overall`) were hardcoded, so an agent returning a different result shape rendered
  a blank card with no error;
- only SEO agents could start a second run inside the Try modal — every other agent
  was locked onto the chat channel after its first result.

Agents now describe their own UI surface. The marketplace reads that description
instead of guessing.

## How an agent declares

Serve `GET /capabilities` at the agent's endpoint, returning JSON. The backend probes
it once at deploy time and stores the result on the agent row.

```jsonc
{
  "version": 1,

  // May the user start a second, unrelated task without closing the modal? When true
  // the modal also auto-detects a new target from the message text.
  "multiRun": true,

  // Copy shown before the first run.
  "inputHint": "e.g. crawl 10 pages on example.com",
  "readyMessage": "Name a site to audit — then ask follow-ups about the report.",

  // Features tab headings.
  "featuresTitle": "What it checks",
  "featuresBlurb": "Measured from a live crawl — not invented rankings.",

  // Download links. `key` is the field on your result payload holding the URL.
  "deliverables": [
    { "key": "reportUrl", "label": "Report", "hint": "HTML",  "icon": "html"  },
    { "key": "pdfUrl",    "label": "PDF",    "hint": "Print", "icon": "pdf"   },
    { "key": "excelUrl",  "label": "Excel",  "hint": ".xlsx", "icon": "excel" },
    { "key": "csvUrl",    "label": "Sheets", "hint": ".csv",  "icon": "csv"   }
  ],

  // Which fields of your result payload hold what. Every field is optional — omit
  // `scoreField` and the score badge simply does not render.
  "report": {
    "scoreField": "overall",
    "scoreMax": 100,
    "titleField": "host",
    "subtitleField": "pagesCrawled",
    "subtitleLabel": "page(s) crawled",
    "countsField": "counts",          // { critical: 3, warnings: 5, total: 42 }
    "countsInclude": ["critical", "warnings"],  // which of those to show, in order
    "categoriesField": "categories",  // [{ name, score }]
    "noticeField": "selfCheckFailed"  // string, or non-empty array
  },

  // Feature cards. Replaces the category/tag heuristics entirely when present.
  "features": [
    { "icon": "globe", "title": "Live crawl", "blurb": "robots.txt, sitemap, pages" }
  ]
}
```

### Icon slugs

Icons cross the wire as names, not components. Available:

`globe` `type` `braces` `megaphone` `shield` `hash` `gauge` `checklist` `terminal`
`chat` `text` `code` `bug` `database` `brain` `coins` `chart` `cpu` `lock` `sparkles`
`workflow` `search` `book` `network` `html` `pdf` `excel` `csv` `image` `download`
`package`

Unknown slugs fall back to a neutral icon rather than breaking the render.

## Validation

`backend/schemas/capabilitiesSchema.js` holds the **strict** zod schema and
`parseCapabilities()` — unrecognised top-level keys are rejected. A malformed
declaration is dropped with a warning and the agent falls back to the legacy path; it
never blocks a deploy.

`backend/services/capabilitiesService.js` only fetches: `probeCapabilities()` hits the
endpoint, `resolveCapabilities()` picks between an explicit declaration and a probe.
Shape lives in `schemas/`, I/O lives in `services/`.

Deliverable `key`s must be unique, or the whole declaration is rejected.

## Where it is stored and refreshed

- `Agent.capabilities` (Json, nullable) — the live value.
- Also written into the uploaded metadata at deploy time. `GET /:agentId/manifest`
  overlays the DB value on top, since metadata is frozen once uploaded but
  capabilities can be re-probed.
- `POST /:agentId/capabilities/refresh` — owner-only. Re-probes the endpoint, or
  accepts an explicit `{ capabilities }` body. Use after redeploying an agent whose
  `/capabilities` response changed.

## Who implements it

`agentra-agents/agentra_seo/main.py` serves `GET /capabilities` (and the `/` variant —
the orchestrator runs with `maxRedirects: 0`, so a trailing-slash redirect would read
as a silent failure). Its `CAPABILITIES` dict is the worked example: every field there
maps onto a key the agent actually returns from `_publish()` / `AuditReport.as_dict()`.
Change one without the other and the result card goes blank.

## Three tiers

Declaring is optional because most agent authors will never know this endpoint
exists. `capabilitiesFor(agent)` resolves in order:

| Tier | Source | Effort for the author |
|---|---|---|
| 1. Declared | `Agent.capabilities`, probed from `/capabilities` | Serve one endpoint |
| 2. Inferred | `Agent.inferredCapabilities`, derived from a real result | **None** |
| 3. Legacy | Name / category / tag heuristics | None |

### Tier 2 - inferred

`backend/utils/inferCapabilities.js` reads one successful result payload and works out
the shape: `*Url` keys become deliverables, a bounded number under `overall`/`score`
becomes the score field, an all-numeric object becomes counts, and so on. It returns
null when a payload says nothing useful, so a plain-text agent keeps the heuristics
rather than getting an empty result card.

`learnFromResult()` in `services/capabilitiesService.js` persists it after a run -
after the caller already has their response, skipped entirely for an agent that
declared, and skipped again when the shape has not changed since last time.

Inference reads structure, never prose. It cannot know what the input hint should say
or whether a second run may start mid-conversation, so an inferred contract is layered
**over** the legacy copy rather than replacing it, and `multiRun` stays with the
legacy guess until an author declares otherwise.

### Tier 3 - legacy

- agents matching `/seo/i` get `SEO_LEGACY` in
  `frontend/src/utils/agentCapabilities.js`, reproducing the previous hardcoded UI;
- everything else gets `GENERIC_LEGACY` plus the category/tag feature heuristics in
  `frontend/src/utils/agentFeatures.js`.

The name regex survives **only** as this fallback. New code should read
`capabilitiesFor(agent)`, never `isSeoAgent(agent)`.

## One behaviour that changed for everyone

The Try modal now shows an explicit **"Start a new run instead"** control once a run
has finished, for every agent regardless of `multiRun`. Previously only SEO agents
could escape the chat channel, and only by naming a different host. `multiRun` now
governs just the *automatic* detection; the explicit control is always available.
