# Openfy Architecture

**How the packages, data flows, and automation pipeline fit together.**

---

## Table of Contents

1. [High-Level Design](#1-high-level-design)
2. [Creator Factory Deep Dive](#2-creator-factory-deep-dive)
3. [Open Source Push Deep Dive](#3-open-source-push-deep-dive)
4. [Extension Points](#4-extension-points)

---

## 1. High-Level Design

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Openfy Repository                        │
│                                                                 │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │     creator-factory/     │   │    open-source-push/     │   │
│  │                          │   │                          │   │
│  │  ┌────────────────────┐  │   │  ┌────────────────────┐  │   │
│  │  │   npm run          │  │   │  │  Secret Sweeper    │  │   │
│  │  │   main-agent       │  │   │  │  Gitignore Auditor │  │   │
│  │  │                    │  │   │  │  Path Sanitizer    │  │   │
│  │  │  1. Research Store │  │   │  └────────────────────┘  │   │
│  │  │  2. Select Ideas   │  │   │                          │   │
│  │  │  3. Generate Code  │  │   │  Runs before any public  │   │
│  │  │  4. PACT Tests     │  │   │  GitHub push to clean    │   │
│  │  │  5. Quality Gate   │  │   │  sensitive data          │   │
│  │  │  6. apify push     │  │   └──────────────────────────┘   │
│  │  └────────┬───────────┘  │                                  │
│  │           │              │                                  │
│  │  ┌────────▼───────────┐  │                                  │
│  │  │   npm run          │  │                                  │
│  │  │   sync-store       │  │                                  │
│  │  │                    │  │                                  │
│  │  │  Apply metadata,   │  │                                  │
│  │  │  PPE pricing,      │  │                                  │
│  │  │  categories, icons │  │                                  │
│  │  └────────┬───────────┘  │                                  │
│  └───────────┼──────────────┘                                  │
└──────────────┼──────────────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐        ┌──────────────────────┐
    │    Apify CLI        │───────▶│    Apify Store       │
    │  (apify push)       │        │  (public listing)    │
    └─────────────────────┘        └──────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │   Apify Console     │
    │  (actor runtime,    │
    │   dataset results,  │
    │   billing)          │
    └─────────────────────┘
```

### Why Two Packages?

| Package | Responsibility | Who Uses It |
| --- | --- | --- |
| `creator-factory/` | Builds, tests, and deploys actors to Apify | The factory owner (you) |
| `open-source-push/` | Audits and cleans repos before public sharing | Any developer before open-sourcing |

The packages are **independent** — `open-source-push` has no dependency on `creator-factory`. They share a common git repository for convenience, but each can be used in complete isolation.

---

## 2. Creator Factory Deep Dive

### Workspace Structure

`creator-factory/` is a **npm workspace** monorepo containing three packages:

```
creator-factory/
├── apps/
│   ├── api/          # @creator-factory/api  — Express REST API (port 3001)
│   └── web/          # @creator-factory/web  — Vite + React dashboard (port 5173)
├── shared/           # @creator-factory/shared — Shared types, pipeline, DB utils
├── src/
│   ├── main-agent/   # CLI pipeline: research → generate → test → push
│   └── mcp/          # Local MCP server exposing factory tools to AI agents
├── scripts/          # Entrypoint scripts (run-main-agent.ts, sync-all-actors-store.ts)
├── templates/        # Actor boilerplate templates
│   ├── typescript-beeai/
│   ├── typescript-mcp-server/
│   ├── javascript-langgraph/
│   └── python-langgraph/
├── generated-actors/ # Output: one folder per generated actor (gitignored)
└── reports/          # Run reports and actor registry (gitignored)
```

### How Templates Are Loaded and Customized

When `mainFlow.ts` calls `implementActor()`, it generates actor files **deterministically** from TypeScript functions rather than copying a template directly. Key generators:

| Function | Output File | Location |
| --- | --- | --- |
| `packageJson()` | `package.json` | `mainFlow.ts` |
| `inputSchema()` | `.actor/input_schema.json` | `mainFlow.ts` |
| `outputSchema()` | `.actor/output_schema.json` | `mainFlow.ts` |
| `mainJs()` | `main.js` | `mainFlow.ts` |
| `testJs()` | `test/run-tests.js` | `mainFlow.ts` |
| `writeDocs()` | `README.md`, `ACTOR.md`, `EXAMPLES.md`, `CHANGELOG.md` | `mainFlow.ts` |

The **MCP wrapper** is the one component that uses a real template directory: `generateMcpWrapper()` reads from `templates/typescript-mcp-server/` and hydrates `{{actor-slug}}`, `{{actor-title}}`, and `{{actor-tool-name}}` placeholders before writing to `generated-actors/<slug>/.mcp-wrapper/`.

### The PACT Loop

PACT (Plan → Act → Check → Test) runs five commands against every generated actor in sequence:

```
npm install          → installs dependencies
npm run build        → TypeScript type check (tsc --noEmit)
npm test             → runs test/run-tests.js assertions
npm run lint         → same as build (tsc --noEmit, catches type errors)
apify run            → local actor execution with INPUT.json
```

If any command exits non-zero, the loop retries up to `MAIN_AGENT_MAX_ATTEMPTS` times (default: 10). On each retry, the actor's deterministic structure is re-applied. The main agent logs all failures to `reports/main-agent-runs/<run-id>/<slug>-pact-test-report.md`.

**PACT is strict sequential**: an actor must pass PACT before proceeding to the quality gate. If PACT fails after all retries, the run halts on that actor.

### The Quality Gate

`qualityGate.ts` runs a post-PACT checklist:

- Output dataset contains at least one JSON item
- No secrets in generated files (regex scan for tokens, API keys, local paths)
- `.actor/actor.json` has all required fields
- `README.md` is present and non-empty
- Icon file is a valid PNG (checks magic bytes)

Results are written to `reports/quality-gate.md` inside the actor folder.

### The OraclePilot (AI Concept Validator)

`oraclePilot.ts` wraps OpenAI or Anthropic to validate two things before code generation:

1. **Concept approval**: Is the actor idea non-duplicate, monetizable, and buyer-facing?
2. **Spec approval**: Does `SPEC.md` describe a complete, testable actor?

If concept approval fails and the actor name is missing "Pilot", the main agent self-heals by prepending a Pilot-family prefix and retrying once.

### The Actor Registry

`reports/actor-registry.json` is the source of truth for `sync-store`. Each entry tracks:

```json
{
  "actorName": "SitePilot — AI Website Readiness Auditor",
  "slug": "site-pilot-ai-website-auditor",
  "status": "pushed",
  "createdAt": "2026-06-21T10:00:00.000Z",
  "sourceRunId": "run-2026-06-21T10-00-00-000Z",
  "apifyActorUrl": "https://console.apify.com/actors/abc123",
  "ideaSummary": "..."
}
```

Only actors with `status: "pushed"` are processed by `sync-store`.

### The MCP Server

`src/mcp/local-mcp-server.ts` implements the [Model Context Protocol](https://modelcontextprotocol.io) over stdio. It exposes factory tools as JSON-RPC endpoints so AI agents (e.g., Claude Desktop via MCP config) can:

- List generated actors
- Trigger PACT tests
- Validate schemas
- Run store sync
- Create new actors end-to-end

The server uses `@modelcontextprotocol/sdk` and communicates via `StdioServerTransport`. It has no HTTP port — it's a process-level integration.

### The Web Dashboard

`apps/web/` is a Vite + React dashboard for visualizing run status, actor registry, and pipeline progress. `apps/api/` is the Express backend serving run data from the `shared` package's database utilities. Both are secondary to the CLI pipeline and are started with `npm run dev`.

---

## 3. Open Source Push Deep Dive

`open-source-push/` is a **project-agnostic** auditing framework. It has no dependency on Apify or the creator-factory.

### What It Does

```
open-source-push/
├── README.md         # Usage guide
├── CHANGELOG.md      # Version history
└── skills/           # Modular audit skill definitions (agentskills.io format)
    └── oss-changelog-generator/
        └── SKILL.md
```

### Secret Sweep Patterns

The sweep catches patterns commonly found in leaked credentials:

| Pattern | Example Match |
| --- | --- |
| Apify tokens | `apify_api_[A-Za-z0-9]{32,}` |
| OpenAI keys | `sk-[A-Za-z0-9]{32,}` |
| Anthropic keys | `sk-ant-[A-Za-z0-9]{32,}` |
| GitHub tokens | `ghp_[A-Za-z0-9]{36}` |
| Local absolute paths | `/Users/danny/...` |
| Hardcoded `.env` values | `SOME_KEY=actual_value` (not a placeholder) |

### Gitignore Validation

The framework checks that common sensitive paths are in `.gitignore`:
- `node_modules/`
- `.env` (but not `.env.example`)
- `dist/`, `build/`, `out/`
- `*.log`
- Generated output folders (e.g., `generated-actors/`, `reports/`)

### Output Format

The audit outputs a structured Markdown report listing:
1. Files scanned
2. Secrets found (with line numbers, redacted values)
3. Missing gitignore patterns
4. Portable path violations
5. Pass/fail verdict

---

## 4. Extension Points

### Adding a New Actor Template

1. Create `creator-factory/templates/<template-name>/` with the standard file layout:
   ```
   templates/my-template/
   ├── package.json
   ├── tsconfig.json
   ├── Dockerfile
   ├── src/
   │   └── index.ts     # Main entrypoint (use {{actor-slug}} etc. for hydration)
   └── README.md
   ```
2. Add `"my-template"` to the `ActorTemplate` union type in `src/main-agent/types.ts`
3. Update `actorIdeaSelector.ts` to assign the template when ideas match its use case
4. Update `generateMcpWrapper()` in `mainFlow.ts` if the template needs a different wrapper
5. Document the template in [`CLI_REFERENCE.md`](./CLI_REFERENCE.md)

### Adding New Audit Rules to OSS-Push

1. Add a new regex or file-check function to the relevant audit module in `open-source-push/`
2. Add a test case covering the new pattern
3. Document the new rule in `open-source-push/README.md`
4. Update `open-source-push/CHANGELOG.md`

### Integrating a Different LLM

The `OraclePilot` (`src/main-agent/oraclePilot.ts`) checks `OPENAI_API_KEY` first, then falls back to `ANTHROPIC_API_KEY`. To add a third provider (e.g., Google Gemini):

1. Add `GEMINI_API_KEY` to `.env.example`
2. Add a new branch in `OraclePilot.callLLM()` that initializes the Gemini client when `process.env.GEMINI_API_KEY` is set
3. Map the response format to the existing `ConceptApproval` and `SpecApproval` types
4. Add the variable to the [CLI Reference environment table](./CLI_REFERENCE.md#6-environment-variables-reference)

### Adding New MCP Tools

To expose a new factory capability via the MCP server:

1. Open `src/mcp/local-mcp-server.ts`
2. Add a new tool definition in the `server.setRequestHandler(ListToolsRequestSchema, ...)` handler
3. Add the corresponding case in `server.setRequestHandler(CallToolRequestSchema, ...)` handler
4. Run `npm run typecheck:mcp` to verify types
5. Document the tool in the [CLI Reference MCP section](./CLI_REFERENCE.md#3-npm-run-mcp-start)
