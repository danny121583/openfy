# Openfy CLI Reference

Complete reference for all `npm run` scripts and environment variables in the `creator-factory` package.

---

## Table of Contents

1. [npm run main-agent](#1-npm-run-main-agent)
2. [npm run sync-store](#2-npm-run-sync-store)
3. [npm run mcp-start](#3-npm-run-mcp-start)
4. [npm run dev](#4-npm-run-dev)
5. [npm test / typecheck](#5-npm-test--typecheck)
6. [Environment Variables Reference](#6-environment-variables-reference)

---

## 1. `npm run main-agent`

**File**: `scripts/run-main-agent.ts`  
**Purpose**: Orchestrates the full end-to-end pipeline: researches the Apify Store for gaps, selects 5 actor ideas, generates code, runs PACT tests, passes the quality gate, and pushes to Apify — one actor at a time in strict sequence.

### Basic Usage

```bash
cd creator-factory
npm run main-agent
```

### What It Does (in order)

1. **Researches** the Apify Store for existing actors
2. **Analyzes gaps** — identifies underserved categories
3. **Selects ideas** — picks up to 5 actors that don't duplicate existing ones
4. For each actor, sequentially:
   - Validates the concept with OraclePilot (AI reviewer)
   - Creates `SPEC.md`
   - Scaffolds project files (package.json, Dockerfile, schemas, main.js, tests)
   - Generates a B2B MCP wrapper
   - Runs the PACT loop (npm install → build → test → lint → apify run)
   - Runs the quality gate
   - Pushes to Apify (`apify push --force`)
   - Publishes to the Apify Store via `storePublication`
5. Writes run reports to `reports/main-agent-runs/<run-id>/`
6. Updates `reports/actor-registry.json`

### Environment Toggles

These are set in `creator-factory/.env` or exported before the command:

| Variable | Default | Description |
| --- | --- | --- |
| `MAIN_AGENT_ACTORS_PER_RUN` | `5` | How many actors to attempt per run |
| `MAIN_AGENT_MAX_ATTEMPTS` | `10` | PACT retry attempts before marking an actor as failed |
| `MAIN_AGENT_USE_APIFY_CREATE` | (unset) | Set to `"1"` to use `apify create` for scaffolding instead of deterministic file generation |
| `PACT_USE_APIFY_RUN` | (unset) | Set to `"1"` to force `apify run` even when Apify credentials are missing |

### Limiting Scope for Testing

```bash
# Generate only 1 actor (fastest local test)
MAIN_AGENT_ACTORS_PER_RUN=1 MAIN_AGENT_MAX_ATTEMPTS=1 npm run main-agent

# Use apify create scaffolding instead of deterministic generation
MAIN_AGENT_USE_APIFY_CREATE=1 npm run main-agent
```

### Output

Each run produces a directory: `reports/main-agent-runs/run-<timestamp>/`

```
run-2026-06-21T10-00-00-000Z/
├── apify-store-research.md       # What actors exist in the Store
├── gap-analysis.md               # Where the gaps are
├── selected-actors.md            # Which 5 ideas were chosen
├── <slug>-pact-test-report.md    # PACT results per actor
├── <slug>-quality-gate.md        # Quality gate results per actor
├── <slug>-deploy-report.md       # Push/deploy results per actor
├── <slug>-store-publication-report.md
└── main-run-report.md            # Full summary with PASS/PARTIAL/FAIL verdict
```

### Final Verdict

| Verdict | Meaning |
| --- | --- |
| `PASS` | All actors pushed successfully |
| `PARTIAL` | At least one actor pushed; others failed |
| `FAIL` | No actors pushed |

---

## 2. `npm run sync-store`

**File**: `scripts/sync-all-actors-store.ts`  
**Purpose**: Programmatically applies store metadata (categories, pricing, SEO title, description, icon) to all actors in `reports/actor-registry.json` that have `status: "pushed"`.

### Basic Usage

```bash
cd creator-factory
npm run sync-store
```

### What It Does

For each `pushed` actor in the registry:
1. Fetches the current actor config from the Apify API
2. Updates categories (always 3, filled with defaults if needed)
3. Updates Pay-Per-Event pricing (if not already set — limited to once/month)
4. Uploads the PNG icon via `APIFY_UI_TOKEN`
5. Publishes the actor to the Apify Store

### Environment Requirements

| Variable | Required | Description |
| --- | --- | --- |
| `APIFY_TOKEN` | ✅ Yes | Your Apify API token |
| `APIFY_UI_TOKEN` | ⚠️ Recommended | UI token for icon uploads. If missing, icons are skipped |

### Rate Limits

- **Store publication**: Apify limits new publications to **5 per 24 hours**. If exceeded, the actor is logged as a warning and skipped. Re-run after 24h.
- **Pricing updates**: Apify limits pricing changes to **once per 30 days** per actor. The script skips pricing if it's already configured correctly.

---

## 3. `npm run mcp-start`

**File**: `src/mcp/local-mcp-server.ts`  
**Purpose**: Starts a local Model Context Protocol (MCP) server that exposes creator factory capabilities as JSON-RPC tools. Use this to connect AI agents (e.g., Claude Desktop) to the factory.

### Basic Usage

```bash
cd creator-factory
npm run mcp-start
```

### Exposed MCP Tools

| Tool | Description |
| --- | --- |
| `list_factory_actors` | Lists actors from the B2B registry |
| `run_pact_test` | Runs a local PACT test for an actor slug |
| `validate_actor_schema` | Audits schema files in an actor directory |
| `sync_store` | Triggers the store sync script |
| `copy_and_convert_icon` | Copies and converts a source image to `.actor/icon.png` |
| `create_actor` | Runs the full pipeline to scaffold and test a new actor |

### Typecheck

```bash
npm run typecheck:mcp
```

---

## 4. `npm run dev`

**Purpose**: Starts the creator-factory web dashboard and API in development mode with hot reload.

```bash
cd creator-factory
npm run dev
```

This runs two processes concurrently:
- **API** (`apps/api`): Express server, typically on port 3001
- **Web** (`apps/web`): Vite React dashboard, typically on port 5173

### Individual servers

```bash
npm run dev:api    # API only
npm run dev:web    # Web dashboard only
```

---

## 5. `npm test` / `typecheck`

```bash
npm test           # Runs unit tests in the shared package
npm run typecheck  # TypeScript strict check across all workspaces
npm run build      # Production build of all packages
```

### Per-script typechecks

```bash
npm run typecheck:main-agent   # Check main-agent scripts only (faster)
npm run typecheck:mcp          # Check MCP server only
```

---

## 6. Environment Variables Reference

Set these in `creator-factory/.env` (copy from `.env.example`):

```bash
cp .env.example .env
```

### Required Variables

| Variable | Required | Where to Find | Example |
| --- | --- | --- | --- |
| `APIFY_TOKEN` | ✅ Yes | [console.apify.com/account/integrations](https://console.apify.com/account/integrations) | `apify_api_abc123...` |
| `OPENAI_API_KEY` | ⚠️ For AI features | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | ⚠️ For AI features (alt.) | [console.anthropic.com](https://console.anthropic.com) | `sk-ant-api03-...` |
| `GITHUB_TOKEN` | ⚠️ For store research | [github.com/settings/tokens](https://github.com/settings/tokens) | `ghp_...` |

> **Note**: You need at least one of `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for the OraclePilot concept validator. Without either, actor generation falls back to deterministic (non-AI) output.

### Optional Variables

| Variable | Default | Description |
| --- | --- | --- |
| `APIFY_UI_TOKEN` | (unset) | UI-level token for icon uploads via `console-backend.apify.com`. If missing, icon upload is skipped during `sync-store`. |
| `MAIN_AGENT_ACTORS_PER_RUN` | `5` | Number of actors to generate per main-agent run |
| `MAIN_AGENT_MAX_ATTEMPTS` | `10` | Max PACT retries before marking an actor as failed |
| `MAIN_AGENT_USE_APIFY_CREATE` | (unset) | Set to `"1"` to use `apify create` for scaffolding |
| `APIFY_DISABLE_TELEMETRY` | (unset) | Set to `"1"` to prevent the Apify CLI from prompting for telemetry consent (required for CI/non-interactive use) |

### Full `.env.example`

```bash
# ── Required ──────────────────────────────────────────────────
APIFY_TOKEN=            # Your Apify API token

# ── AI Enrichment (at least one recommended) ──────────────────
OPENAI_API_KEY=         # OpenAI API key (used by OraclePilot for concept validation)
ANTHROPIC_API_KEY=      # Anthropic API key (alternative to OpenAI)

# ── Store Sync & Research ─────────────────────────────────────
GITHUB_TOKEN=           # GitHub PAT for public repo research (no scopes needed)
APIFY_UI_TOKEN=         # UI-level token for programmatic icon uploads

# ── Tuning (optional) ─────────────────────────────────────────
MAIN_AGENT_ACTORS_PER_RUN=5     # Actors to generate per run (default: 5)
MAIN_AGENT_MAX_ATTEMPTS=10      # PACT retry attempts (default: 10)
```
