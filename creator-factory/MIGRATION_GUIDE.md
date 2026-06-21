# Openfy Migration Guide

**From vanilla Apify Actor → Openfy Pilot Family Actor**

This guide walks you through migrating an existing Apify actor to Openfy's standardized structure, from understanding the differences to deploying your first Pilot-branded actor.

---

## Table of Contents

1. [From Vanilla Apify to Openfy](#1-from-vanilla-apify-to-openfy)
2. [Step-by-Step Migration](#2-step-by-step-migration)
3. [Common Migration Pitfalls](#3-common-migration-pitfalls)
4. [When to Use Openfy vs. Vanilla](#4-when-to-use-openfy-vs-vanilla)

---

## 1. From Vanilla Apify to Openfy

### What Is Different?

Openfy generates actors with an opinionated, standardized structure built for **monetization, testing, and batch deployment**. The core logic is the same Apify SDK you already know — but Openfy wraps it in:

- A verified file layout (all required `.actor/` files pre-generated)
- A PACT test loop (automated validation before push)
- A quality gate (checks for schema validity, secret exposure, output shape)
- Pay-Per-Event pricing auto-configured via `sync-store`
- A B2B MCP wrapper (so AI agents can call your actor via Claude, etc.)

### Structural Comparison

| File | Vanilla Apify | Openfy Generated |
| --- | --- | --- |
| `.actor/actor.json` | Manually written | Auto-generated with all required fields |
| `.actor/input_schema.json` | Optional, hand-crafted | Required, validated, with `editor` fields |
| `.actor/output_schema.json` | Often missing | Required, `actorOutputSchemaVersion: 1` |
| `.actor/dataset_schema.json` | Rarely used | Generated for Apify Console display |
| `.actor/README.md` | Optional | Required, auto-synced from root `README.md` |
| `.actor/CHANGELOG.md` | Not standard | Required, auto-synced |
| `.actor/icon.png` | Optional | Required, True PNG pipeline (1024×1024 RGBA) |
| `main.js` | Your entrypoint | Auto-generated scaffold; you fill in logic |
| `test/run-tests.js` | Rarely exists | Auto-generated assertion tests |
| `PACT testing` | None | Automated: `npm install → build → test → lint → apify run` |
| `SPEC.md` | None | Auto-generated technical spec |
| `.mcp-wrapper/` | None | Auto-generated MCP server for AI agent access |

### Template Categories

Openfy includes four templates. Choose based on your use case:

| Template | Best For | Key Dependencies |
| --- | --- | --- |
| `typescript-beeai` | Most B2B actors, AI agents | Apify SDK, BeeAI framework |
| `javascript-langgraph` | Workflow orchestration, multi-step agents | LangGraph JS |
| `python-langgraph` | Python-first actors, ML integrations | Python, LangGraph Python |
| `typescript-mcp-server` | MCP wrapper for existing actors | `@modelcontextprotocol/sdk` |

The `typescript-beeai` template is the default for most business-outcome actors. Use `python-langgraph` only when the core logic requires Python libraries (e.g., scikit-learn, pandas).

---

## 2. Step-by-Step Migration

### Before You Start: Prerequisites

```bash
node --version       # >= 18.0.0
apify --version      # >= 1.6.2 (run: npm install -g apify-cli)
cd creator-factory
npm install
```

Ensure `creator-factory/.env` has at minimum:
```
APIFY_TOKEN=your_apify_token_here
```

---

### Step 1: Export Your Existing Actor Code

From the Apify Console or your local clone, gather these files:
- `main.js` (or `main.ts`, `src/main.ts`) — your core scraping/agent logic
- `package.json` — your existing dependencies
- `.actor/actor.json` — existing metadata (name, version, description)
- `.actor/input_schema.json` — existing input definition (if any)
- Any helper modules in `src/`

**What you DON'T need** (Openfy will regenerate these):
- `.actor/output_schema.json`
- `.actor/README.md` / `.actor/CHANGELOG.md`
- `.actor/icon.png`
- `test/` directory
- `Dockerfile`
- `.gitignore` / `.actorignore`

---

### Step 2: Create a New Openfy Actor Scaffold

Run the main agent with a reduced actor count, or manually scaffold:

```bash
cd creator-factory

# Option A: Let the main agent generate a fresh scaffold for your idea
MAIN_AGENT_ACTORS_PER_RUN=1 npm run main-agent
# Then copy your logic into generated-actors/<your-slug>/main.js

# Option B: Copy the template directly
cp -r templates/typescript-beeai generated-actors/my-actor-slug
cd generated-actors/my-actor-slug
npm install
```

---

### Step 3: Map Your Old Logic Into the Template

#### Before (vanilla Apify — typical pattern)

```javascript
// Old main.js — minimal structure, no schema, no tests
import { Actor } from 'apify';

await Actor.init();
const input = await Actor.getInput();
const { startUrls, maxPages } = input;

const crawler = new CheerioCrawler({
  requestList: await RequestList.open(null, startUrls),
  async requestHandler({ $, request }) {
    const title = $('title').text();
    await Actor.pushData({ url: request.url, title });
  },
  maxRequestsPerCrawl: maxPages,
});

await crawler.run();
await Actor.exit();
```

#### After (Openfy-generated scaffold — structured)

```javascript
// New main.js — Openfy structure
import { Actor } from 'apify';

await Actor.init();
const input = await Actor.getInput() ?? {};

// ✅ Validate required inputs before doing any work
const startUrls = Array.isArray(input.startUrls)
  ? input.startUrls.filter((item) => item?.url)
  : [];
if (!startUrls.length) throw new Error('startUrls must contain at least one URL');

// ✅ Warn but don't crash on missing optional keys
if (input.includeAiAnalysis && !process.env.OPENAI_API_KEY) {
  console.warn('AI analysis requested but no key configured. Using deterministic output.');
}

// ✅ Process items up to the max limit
for (const item of startUrls.slice(0, Number(input.maxItems ?? 25))) {
  console.log('Processing ' + item.url);

  // --- YOUR SCRAPING LOGIC GOES HERE ---
  const result = await scrapeMyData(item.url, input);

  await Actor.pushData(result);  // ✅ Push structured results
}

await Actor.exit();             // ✅ Always call exit()

// Your existing functions go here, unchanged
async function scrapeMyData(url, input) {
  // ... your old requestHandler logic, adapted as a plain async function
}
```

**Key mapping rules**:
- `requestHandler` content → extract into a named `async function`
- `CheerioCrawler` / `PlaywrightCrawler` stays — just call it from inside the for-loop or keep it as-is
- Add input validation at the top (throw if required fields are missing)
- Add the `maxItems` cap

---

### Step 4: Update Input/Output Schemas

#### Input Schema (`.actor/input_schema.json`)

Every property **must** have an `editor` field. Map your old properties:

```json
// Before (missing editor fields — will fail validation)
{
  "properties": {
    "startUrls": { "type": "array" },
    "maxPages": { "type": "integer" }
  }
}

// After (Openfy-compliant)
{
  "title": "My Actor Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "startUrls": {
      "title": "Start URLs",
      "type": "array",
      "editor": "requestListSources",
      "minItems": 1,
      "prefill": [{ "url": "https://example.com" }],
      "items": {
        "type": "object",
        "required": ["url"],
        "properties": { "url": { "type": "string" } }
      }
    },
    "maxItems": {
      "title": "Max items",
      "type": "integer",
      "editor": "number",
      "default": 25,
      "minimum": 1,
      "maximum": 500
    }
  },
  "required": ["startUrls"]
}
```

Validate before pushing:
```bash
APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema
```

#### Output Schema (`.actor/output_schema.json`)

This is often missing in vanilla actors. Add it:

```json
{
  "$schema": "https://apify-projects.github.io/actor-json-schemas/output.json?v=0.3",
  "actorOutputSchemaVersion": 1,
  "title": "My Actor Output",
  "description": "Results written to the default dataset.",
  "properties": {
    "results": {
      "type": "string",
      "title": "Results",
      "description": "Default dataset items.",
      "template": "{{links.apiDefaultDatasetUrl}}/items"
    }
  }
}
```

---

### Step 5: Test Locally with Apify CLI

```bash
cd generated-actors/my-actor-slug

# Install dependencies
npm install

# TypeScript type check
npm run build

# Run unit tests
npm test

# Run locally with default input
apify run --purge
```

**Check output**:
```bash
ls storage/datasets/default/   # Should contain JSON files
cat storage/datasets/default/000000001.json
```

If `apify run` fails:
- Check `storage/key_value_stores/default/INPUT.json` exists and is valid JSON
- Verify your `startUrls` array has at least one `{ url: "..." }` object

---

### Step 6: Deploy via Openfy

```bash
# Sync docs (required before push)
cp README.md .actor/README.md
cp CHANGELOG.md .actor/CHANGELOG.md

# Validate schema one final time
APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema

# Push to Apify
apify push --force --wait-for-finish 300

# Apply store metadata, pricing, and icon
cd ../../  # back to creator-factory root
npm run sync-store
```

---

## 3. Common Migration Pitfalls

### ❌ Pitfall 1: Schema validation fails on push

**Cause**: Missing `editor` fields on input properties, or `actorOutputSchemaVersion` missing from output schema.

**Fix**: See [Step 4](#step-4-update-inputoutput-schemas). Always run `APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema` before `apify push`.

---

### ❌ Pitfall 2: Environment variable names changed

**Cause**: Old actors often used custom env var names; Openfy uses a standardized set.

**Mapping**:
| Old pattern | Openfy convention |
| --- | --- |
| `process.env.API_KEY` | `process.env.OPENAI_API_KEY` or `process.env.ANTHROPIC_API_KEY` |
| `process.env.TOKEN` | `process.env.APIFY_TOKEN` |
| Any hardcoded values | Move to `.env` and add to `.env.example` |

---

### ❌ Pitfall 3: Deprecated Apify SDK methods

Common deprecated patterns (Apify SDK v2 → v3):

| Deprecated (v2) | Replacement (v3) |
| --- | --- |
| `Apify.main(async () => {...})` | `Actor.init()` + `Actor.exit()` |
| `Apify.getValue('INPUT')` | `Actor.getInput()` |
| `Apify.pushData(...)` | `Actor.pushData(...)` |
| `new Apify.RequestList(...)` | `await RequestList.open(...)` |
| `Apify.openDataset()` | `await Actor.openDataset()` |

Check your SDK version:
```bash
npm list apify   # Should be ^3.x.x
```

---

### ❌ Pitfall 4: PACT test failures on `apify run`

**Cause**: The default `INPUT.json` doesn't match your actual schema.

**Fix**: Update `storage/key_value_stores/default/INPUT.json` to match a real, minimal valid input:
```json
{
  "startUrls": [{ "url": "https://example.com" }],
  "maxItems": 1,
  "includeAiAnalysis": false
}
```

---

### ❌ Pitfall 5: Actor name doesn't follow Pilot Family naming

**Cause**: Your old actor was named `my-scraper`. Openfy requires the "Pilot Family" naming convention.

**Fix**: Rename following the pattern: `BrandPilot — Outcome Description`

Examples:
- ❌ `website-auditor`
- ✅ `SitePilot — AI Website Readiness Auditor`

Update in `.actor/actor.json`:
```json
{
  "name": "site-pilot-ai-website-auditor",
  "title": "SitePilot — AI Website Readiness Auditor"
}
```

---

### ❌ Pitfall 6: `apify push` rejected for missing `.actor/README.md`

**Cause**: Apify reads docs from `.actor/README.md`, not `README.md`.

**Fix**:
```bash
cp README.md .actor/README.md
cp CHANGELOG.md .actor/CHANGELOG.md
cmp README.md .actor/README.md   # Must match exactly
```

---

### ❌ Pitfall 7: Icon is wrong format or missing

**Cause**: The `.actor/icon.png` either doesn't exist or is not a true 1024×1024 RGBA PNG with transparent corners.

**Fix**: Run the icon pipeline:
```bash
# Generate an icon using the built-in tool, then process it
python3 creator-factory/scripts/process_icon.py generated-actors/<slug>/.actor/icon.png

# Verify
file generated-actors/<slug>/.actor/icon.png
# Should output: PNG image data, 1024 x 1024, 8-bit/color RGBA
```

---

## 4. When to Use Openfy vs. Vanilla

### Use Openfy When…

| Scenario | Reason |
| --- | --- |
| Building multiple similar actors | Openfy's templates + PACT loop dramatically reduce per-actor time |
| Planning monetization via PPE | `sync-store` auto-configures Pay-Per-Event pricing |
| Wanting automated testing | PACT loop runs 5 checks and retries automatically |
| Needing AI agent integration | Auto-generated MCP wrapper works with Claude, GPT, etc. |
| Building a "Pilot Family" portfolio | Consistent naming, icons, and docs across all actors |
| Publishing to the Apify Store | Quality gate + `sync-store` ensures Store compliance |

### Use Vanilla Apify When…

| Scenario | Reason |
| --- | --- |
| One-off internal script | No need for store publishing or monetization infrastructure |
| Extreme customization of Dockerfile | Openfy's Dockerfile is opinionated; vanilla gives full control |
| Complex multi-crawler architectures | Openfy's scaffold is optimized for single-entrypoint actors |
| You already have a mature actor | Migration overhead may outweigh benefits for large, stable actors |
| Rapid prototype / proof of concept | Vanilla is faster for throwaway experiments |
