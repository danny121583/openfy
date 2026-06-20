# Apify Creator Factory

## Project Goal
This project exists to help the user become a top Apify creator by repeatedly creating useful, monetizable, tested Apify Actors.

## Command: "run main agent"
When the user says "run main agent", this means:
1. Research Apify.com and the Apify Store to understand what Actors already exist.
2. Identify underserved monetizable gaps.
3. Select 5 Actor ideas that are not obvious duplicates.
4. Generate 5 new Apify Actors inside `/generated-actors`.
5. Use the best available Apify template:
   - Prefer `ts-beeai-agent`
   - Use `project-langgraph-agent-javascript` when better suited
   - Use `python-langgraph` only when necessary
6. Run each Actor locally with `apify run`.
7. Run the PACT loop for each Actor.
8. Fix any failing Actor until it passes or reaches max attempts.
9. Generate README, examples, input schema, reports, and monetization notes.
10. Run the Apify quality gate.
11. Push each passing Actor with `apify push`.
12. Save final reports in `/reports/main-agent-runs`.
13. Never push failed Actors.
14. Never expose secrets.
15. Never claim an Actor was pushed unless `apify push` actually succeeded.
16. Never use browser agent unless user explicitly asks for it.
17. If store publication fails due to the daily rate-limit (5 Actor publications per 24 hours), log a warning, mark the Actor as `pushed` in the registry, and proceed sequentially (do not halt the entire batch). The publication can be finalized later by running `npm run sync-store` once the limit resets.

The main agent must run Actors one by one in strict sequence. It must not start Actor 2 until Actor 1 has passed PACT, passed the quality gate, and pushed successfully. If any Actor fails, stop the run on that Actor, write reports, and do not continue to the next Actor until the failed Actor is fixed and passes.
The expected result of a fully successful run is 5 generated Actor folders in `/generated-actors`, plus reports showing build/test/deploy status.

## Command: "sync apify"
When the user says "sync apify", this means:
1. Navigate to the `creator-factory` directory.
2. Run the synchronization script:
   ```bash
   npm run sync-store
   ```
3. This will programmatically apply the pricing model, event-level prices, categories, SEO titles, descriptions, and upload the PNG icons for all pushed Actors in the registry, and publish them to the Store (bypassing monthly limitations for correct pricings).

## Safety Rules
- Do not hardcode tokens.
- Do not copy restricted or unclear-license code.
- Do not push broken Actors.
- Do not make fake marketplace claims.
- Do not claim tests passed unless they actually ran.
- Do not claim deployment succeeded unless `apify push` succeeded.
- Do not use browser UI testing unless specifically requested.
- Do not change unrelated files.

## Strategic Publishing Rules
- The goal is to publish Actors that make money from end users, agencies, operators, marketers, sales teams, recruiters, ecommerce teams, support teams, or business owners.
- Do not publish Actors whose main value is helping other Apify creators compete with this project unless the user explicitly asks for that.
- Keep these as private/internal factory tools by default:
  - repo-to-Actor generators
  - Apify Store gap finders
  - Actor README or Store listing optimizers
  - open-source license-to-monetization auditors
  - Actor idea generators for creators
  - skill converters that mainly help other agent/Actor builders
- Public Actor ideas should package useful business outcomes, not Creator Factory internals. Prefer lead qualification, sales intelligence, website audits, AI readiness, support/RAG preparation, reputation opportunities, competitor monitoring, ecommerce monitoring, hiring signals, and customer research.

## Actor Naming Rules
- Actor display titles must be clear, buyer-facing, outcome-specific, and branded using the premium **"Pilot Family" suite naming convention** (e.g. `TrendPilot — TikTok Scraper & Creator Leads`, `SitePilot — AI Website Sales Readiness Auditor`, `LeadPilot — Google Maps Lead Quality Agent`).
- Each Actor gets a memorable brand prefix ending with "Pilot" (like TrendPilot, SitePilot, AdPilot, BriefPilot) followed by an outcome-specific descriptive subtitle.
- Do not use internal project names, factory codenames, or vague agent names (e.g., `Main Agent`, `Workflow Agent`) as the public title.
- Keep the Actor slug/name stable and machine-friendly (e.g., `trend-pilot-tiktok-scraper`), but set the `.actor/actor.json` `title`, README H1, and Store publication title to the branded display title.
- After `apify push`, verify the Apify Console header uses the same branded display title. If the build metadata changed but the existing Actor record still shows an old title, update the Actor record metadata through the Apify API before claiming the title is fixed.

## Duplicate And Overlap Check
Before selecting or building a new Actor, check for duplicates in all of these places:

```bash
find creator-factory/generated-actors -maxdepth 2 -type f \( -name README.md -o -name SPEC.md -o -path '*/.actor/actor.json' \) -print
sed -n '1,240p' creator-factory/reports/actor-registry.json 2>/dev/null || true
find creator-factory/reports/main-agent-runs -name '*deploy-report.md' -o -name '*store-publication-report.md' 2>/dev/null
```

Also research Apify Store for similar public Actors before building. Compare:
- actor name and slug
- buyer / target user
- input source
- output dataset shape
- business decision the Actor enables
- monetization angle

Do not build a new Actor if it is only a renamed version of an existing generated, pushed, or published Actor. If an idea is close, either improve the existing Actor or make the new Actor clearly distinct by data source, audience, output, or workflow. Never claim an Actor is new or published without checking local reports and Apify push/publication evidence.

## Actor PNG Icon Workflow
- Every generated Actor must have a high-quality, standardized premium PNG app icon at `.actor/icon.png` meeting the true PNG format rules:
  1. **True Transparent Corners & Resolution**: Icons must be exactly `1024x1024` resolution, in `RGBA` mode, with a corner radius of `200` and fully transparent corners `(0, 0, 0, 0)`.
  2. **Clean Anti-Aliased Edges (Supersampling)**: Jagged or pixelated edges on the rounded rectangle transparency boundaries are unacceptable. The mask must be drawn at 4x resolution (`4096x4096` with `radius = 800`) and downsampled using `LANCZOS` interpolation to `1024x1024` to create perfectly smooth, clean edges.
  3. **No Outer Borders, Frames, or Shadows**: Icons must focus entirely on the central logo composition (e.g., the glass rounded square). Any outer dark frames, solid background borders, or blending shadows must be cropped out.
  4. **Symmetric Cropping with Offset**: If the source icon has border padding, detect it by comparing edge pixels against the corner color. Crop the image symmetrically on all 4 sides using the maximum detected padding (from the left and right center lines) plus an extra `4px` inner offset to completely discard border shadows, glows, and white edges.
- The icon design must look like a premium app logo from the App Store. It should consist of a rounded-square composition with a sleek background, a stylized central brand logo/symbol, and the Actor's brand name (e.g. 'AgentPilot') in clean, modern text underneath the symbol.
- Do not use official/trademarked third-party logos (like Google, TikTok, Instagram, etc.) unless explicitly authorized.
- Prefer the built-in image generation tool for actor icons. It saves generated PNGs under `/Users/danny/.codex/generated_images/...`; copy the chosen PNG into the Actor folder as `.actor/icon.png` and leave the original generated file in place.
- If using the local `imagegen` skill CLI, remember it requires `OPENAI_API_KEY`. If missing, use the built-in tool.
- Prompt for app-icon quality: 1024x1024 or larger, premium App Store style app icon, rounded-square shape with subtle glossy glass finish, modern gradient background, sleek stylized brand symbol in the center, and the Actor brand name written in clean, elegant modern text below the symbol.
- After copying, use macOS `sips` to convert the generated image format into a true PNG (e.g. `sips -s format png .actor/icon.png --out .actor/icon.png`), and verify with `file .actor/icon.png` that it is a real PNG. Store upload code should treat it as `image/png`.
- **Centralized Icons Access**: Once icons are generated/updated under their respective actor folders, gather and format all icons into the centralized root directory `/Users/danny/Desktop/apify/generated-icons` by running:
  ```bash
  cd creator-factory
  npx tsx scripts/gather-icons.ts
  ```
  This script will automatically copy all `.actor/icon.png` files to `generated-icons/[actor-slug].png` (naming them exactly after the stable actor slug) and ensure they are converted to true PNGs, making them easily accessible for manual console uploads.



## Actor Documentation Update Workflow
- Every Actor documentation update must keep the root docs and Apify build docs in sync:
  - Root authoring files: `README.md`, `CHANGELOG.md`, `ACTOR.md`, `EXAMPLES.md`, `SPEC.md`.
  - Apify-rendered files: `.actor/README.md` and `.actor/CHANGELOG.md`.
- All `README.md` and `.actor/README.md` files must include a clear, step-by-step **"How It Works" section** outlining the precise data sources, crawling sequences, and processing logic (e.g. query searching -> profile scraping -> deep homepage enrichment).
- Treat the root `README.md` and `CHANGELOG.md` as the source of truth while editing, then copy them into `.actor/README.md` and `.actor/CHANGELOG.md` before testing or pushing:

```bash
cp README.md .actor/README.md
cp CHANGELOG.md .actor/CHANGELOG.md
cmp README.md .actor/README.md
cmp CHANGELOG.md .actor/CHANGELOG.md
```

- Do not set `.actor/actor.json` fields like `"readme": "./README.md"` or `"changelog": "./CHANGELOG.md"` unless you have verified the exact Apify CLI behavior for that Actor. A bad path can cause Apify Console to show the literal string `./README.md` instead of rendering the README.
- Prefer the documented Apify lookup files `.actor/README.md` and `.actor/CHANGELOG.md`. During `apify push`, the logs must include:
  - `Extracting Actor documentation from .actor/README.md`
  - `Extracting Actor changelog from .actor/CHANGELOG.md`
- If an Actor has tests, add or keep assertions that `.actor/README.md` matches `README.md` and `.actor/CHANGELOG.md` matches `CHANGELOG.md`.
- Before claiming documentation is fixed, push and verify the remote Actor directly:

```bash
apify push --force --wait-for-finish 300
apify actors info USERNAME/ACTOR-NAME --readme | sed -n '1,24p'
apify actors info USERNAME/ACTOR-NAME --json
```

- The remote README verification must show real markdown beginning with the buyer-facing title, not a path string and not `No README found for this Actor`.
- If Apify Console still shows stale documentation after the CLI verification passes, hard-refresh the browser before doing anything else.

## Actor Schema Validation Workflow
To avoid deployment failures, always validate input and output schemas before pushing:
1. **Input Schema Requirements (`.actor/input_schema.json`)**:
   - Every input property must define an `"editor"` field appropriate to its type:
     - Use `"editor": "checkbox"` for `boolean` types.
     - Use `"editor": "number"` for `integer` and `number` types.
     - Use `"editor": "textfield"` for simple `string` types.
     - Use `"editor": "select"` for `string` types that define `enum` values.
     - Use `"editor": "json"` for arrays (except start URLs) and objects.
     - Use `"editor": "requestListSources"` for `startUrls` array.
     - Use `"editor": "proxy"` for proxy configurations.
2. **Output Schema Requirements (`.actor/output_schema.json`)**:
   - Output schemas must conform to the standard Apify Output Schema version 1 formatting.
   - The root object must define:
     ```json
     {
       "$schema": "https://apify-projects.github.io/actor-json-schemas/output.json?v=0.3",
       "actorOutputSchemaVersion": 1,
       "title": "Actor Outcome Display Title",
       "description": "Structured description of output dataset.",
       "properties": {
         "results": {
           "type": "string",
           "title": "Results",
           "description": "Link to output dataset items.",
           "template": "{{links.apiDefaultDatasetUrl}}/items"
         }
       }
     }
     ```
3. **Local Validation Command**:
   - Run local schema checks with anonymous telemetry disabled to prevent CLI prompts from hanging on stdin:
     ```bash
     APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema
     ```
   - Make sure this command passes with zero errors before calling `apify push`.

## Store Publication & Monetization Rules
- **Automatic Configuration**: Store publication, category selection, and monetization configuration are managed programmatically via the Apify API (`PUT /v2/actors/{actorId}`).
- **Daily Publication Limit**: Apify limits new Actor publications to **5 per 24 hours**. 
  - To prevent rate-limit blocks from halting a run of 5 Actors, the main agent logs a warning on publication errors, marks the Actor as `pushed` (since the code upload succeeded), and proceeds sequentially.
  - To finalize publication for these rate-limited Actors, run `npm run sync-store` after the 24-hour limit resets, or publish them manually via the Apify Console.
- **Pay-Per-Event (PPE) Configuration**:
  - **Start Event**: `apify-actor-start` (Primary event, Title: `Actor Start`, Description: `Charged when the Actor starts running.`, Infrequent/One-time: `true`, Price: `$0.10005`).
  - **Result Event**: `apify-default-dataset-item` (Title: `result`, Description: `Single result in the default dataset.`, Infrequent/One-time: `false`, Price: `$0.10001` which corresponds to `$100.01 per 1,000`).
  - **Platform Usage Costs**: Set `"isPPEPlatformUsagePaidByUser": false`.
- **Pricing Bypasses**: The Apify API only allows pricing changes once a month per Actor. To prevent updates to other metadata (e.g. categories, descriptions) from failing due to this rule, the agent first fetches the existing Actor configuration and omits the `pricingInfos` field from the update payload if the pricing is already correct.
- **Categories Mapping**: The expected categories are mapped programmatically to uppercase API tags (e.g. `SEO_TOOLS`, `LEAD_GENERATION`, `ECOMMERCE`, `DEVELOPER_TOOLS`, `AI`, `AGENTS`). To maximize visibility and ensure the Actor shows up in more sections of the Store, the publication flow **must populate exactly 3 categories** (filling any remaining slots using the general default tags: `AUTOMATION`, `AI`, `AGENTS`, and `DEVELOPER_TOOLS`).
- **PNG Icon Upload**: The UI upload of `.actor/icon.png` is handled programmatically using `APIFY_UI_TOKEN` via `console-backend.apify.com`. If the token is not configured, it will skip icon upload and log a warning.

- **Synchronization Command**: To force-sync all pushed Actor listings in the registry with their latest categories and monetization settings, run:
  ```bash
  npm run sync-store
  ```

## Scheduled Automation (/dailyschedule)
A daily recurring scheduler task has been configured on the system to run every day at 6:00 AM (cron expression: `0 6 * * *`). 
- **Purpose**: Dynamically searches the web (e.g. `github.com/orgs/google/repositories`) for new developer cookbooks or APIs, matches them against the Apify Store, filters out duplicates, designs 5 unique/superior outcome-oriented B2B Actors, runs the local PACT testing loop, and pushes/publishes them.
- **Reference**: Configured in the background scheduler as the daily task (referenced as `/dailyschedule`).

## Current Implementation
The runnable implementation lives in `creator-factory/src/main-agent` and is launched from `creator-factory` with:

```bash
npm run main-agent
```

If the user asks from the workspace root, run:

```bash
cd creator-factory
npm run main-agent
```

## Model Context Protocol (MCP) Developer Server
A local developer MCP server is implemented in the codebase at `creator-factory/src/mcp/local-mcp-server.ts`.
- **Purpose**: Exposes the Creator Factory's core functionalities (listing actors, PACT testing, schema audit, store sync, icon copy/conversion, and actor creation) as standard, type-safe JSON-RPC tools for local AI agents.
- **Run Command**:
  ```bash
  npm run mcp-start
  ```
- **Typecheck Command**:
  ```bash
  npm run typecheck:mcp
  ```
- **Exposed Tools**:
  1. `list_factory_actors` (Lists actors from B2B registry `reports/actor-registry.json` and active DB runs).
  2. `run_pact_test` (Runs local PACT test for an actor slug).
  3. `validate_actor_schema` (Performs schema audits on an actor directory).
  4. `sync_store` (Runs the store sync script).
  5. `copy_and_convert_icon` (Copies and converts source images to `.actor/icon.png` using macOS `sips`).
  6. `create_actor` (Runs the full pipeline to scaffold, build, and test a new B2B actor).

## Agent Skills Standard Format (agentskills.io)
All project skills in this project and the wider Antigravity IDE ecosystem must strictly conform to the `agentskills.io` standard format.

### 1. Directory Structure
Each skill must reside in its own folder and have the following layout:
```
skill-name/
├── SKILL.md          # Required: YAML metadata + instructions
├── scripts/          # Optional: executable code (JS, Python, Bash)
├── references/       # Optional: documentation (e.g. REFERENCE.md, configurations)
├── assets/           # Optional: templates, assets, or static datasets
```

### 2. `SKILL.md` File Layout
The `SKILL.md` file must contain YAML frontmatter, followed by Markdown instructions:
```markdown
---
name: skill-name
description: A clear, keyword-rich description (max 1024 chars) explaining what the skill does and when the agent should use it.
license: Apache-2.0 (optional)
metadata:
  author: OrbitAI (optional)
  version: "1.0" (optional)
---

# Skill Title

Instructions, step-by-step guidelines, edge cases, and usage examples.
```

### 3. Naming Rules and Constraints
- The `name` in YAML frontmatter must match the parent directory name exactly.
- The `name` must be 1-64 characters, lowercase letters, numbers, and hyphens (`-`) only. It must not start/end with a hyphen, nor contain consecutive hyphens.
- Keep the `SKILL.md` file short (under 500 lines). Offload detailed references to `references/` or `assets/` and use relative links (e.g., `[reference](references/REFERENCE.md)`).

## The Layered Agentic Stack
In agentic software development, the structure of an AI system shifts from simple "text generation" to active "action execution." In tools like [Cursor](https://cursor.com/) and similar environments, the agentic architecture relies on a clear, layered stack consisting of the **Agent Core**, **Skills**, and **MCP Connectors**.

### 1. The Core Agentic Architecture
At the top level sits the **Host/Agent Loop** (e.g., Cursor's Composer or Agent mode, or Factory's autonomous loops). It doesn't just predict the next token; it operates on a continuous, autonomous loop:

```
[ User Prompt ] ──> [ Reasoning Engine ] ──> [ Tools Discovery ]
                            ▲                       │
                            │                       ▼
                    [ State Evaluator ] <─── [ Tool Execution (MCP) ]
```

- **Reasoning Engine:** Powered by frontier long-context or reasoning models, the engine decides *how* to approach a problem. Instead of outputting code immediately, it generates a task plan.
- **The Autonomy Slider:** Modern architectures allow you to control the level of independence given to the agent. It can range from low autonomy (inline `Cmd+K` tab completion) to high autonomy (**Cursor Agent mode** or **Factory Autonomy mode**), where the agent operates asynchronously, running parallel sub-agents to solve complex tasks.

### 2. Agent Skills (The Domain Knowledge)
While an agent has access to raw tools, it often lacks the strategic expertise to use them safely or efficiently. **Agent Skills** bridge that gap. They are pre-packaged plugins or modules containing **specialized domain knowledge, guardrails, and guided workflows**.

- **What they do:** Skills tell the agent *how* to reason about a platform. For example, a Confluent Kafka Skill teaches the agent streaming best practices, while a DataRobot Skill teaches it how to execute feature engineering and model training cleanly.
- **Why they matter:** Without skills, an LLM might attempt to brute-force a problem with generic Python code. With skills, the agent adopts platform-specific frameworks and structural rules (like `cursorrules` or `factoryrules`) instantly, preventing hallucinations and breaking the task into logical, predictable chunks.

### 3. MCP Connectors (The "USB" Interface for AI)
The **Model Context Protocol (MCP)**, originally introduced by Anthropic, is an open standard built on JSON-RPC 2.0. It solves the "$M \times N$ problem"—the inefficiency of writing unique API wrappers for every combination of AI model ($M$) and development tool ($SaaS/DBs$).

MCP treats tools like hardware peripherals. The IDE acts as the **MCP Host**, and external systems run as **MCP Servers**.

#### How MCP Connectors Bridge the Gap
An MCP connector exposes three main primitives to the AI agent:
1. **Tools:** Executable functions the agent can invoke (e.g., `run_sql_query`, `create_linear_ticket`, `trigger_github_pr`, `run_pact_test`).
2. **Resources:** Static or dynamic data files the agent can read for context (e.g., database schemas, API logs, local filesystem paths).
3. **Prompts:** Pre-defined templates provided by the server to help the user guide the agent effectively.

#### Real-World Execution Types
When you plug an MCP server into your local environment (configured via `.cursor/mcp.json` or `.factory/mcp.json`), the connection typically operates through two transport mechanisms:
- **`stdio` (Standard Input/Output):** The MCP server runs locally as a child process on your computer. Factory talks to it over command-line streams. This is common for local databases, local filesystems, or CLI tools.
- **Streamable HTTP/SSE:** The server runs independently on a remote host or cloud container, communicating via web protocols. This is ideal for team environments or secure corporate platforms.

### 4. Mapping the Entire Agentic Stack

| Layer | Component | What it Handles | Examples |
| --- | --- | --- | --- |
| **Cognition** | Coding Agent / Host | Orchestration, parallel task planning, and user review loops. | Cursor Agent, Composer, Claude Code, Factory Core |
| **Expertise** | Agent Skills | Guardrails, best practices, framework rules, and logical flow. | `.cursorrules`, `.factoryrules`, DataRobot Skills, Confluent Agent Skills |
| **Connection** | MCP Connectors | Standardized API schemas, tool-calling definitions, and execution layers. | PostgreSQL MCP, GitHub/Linear MCP, Slack MCP, Local Factory MCP |
| **Infrastructure** | Target Environment | The actual systems being queried, modified, or deployed to. | Your database, local directory, cloud environment (Vercel, Apify) |

**The Resulting Workflow:** Instead of copying and pasting code snippets, logs, and database definitions back and forth, you prompt the agent: *"Fix the broken data pipeline and alert the team."* The **Agent** creates a plan; uses its **Skills** to know how data schemas should format; invokes the PostgreSQL and Slack **MCP Connectors** to query the live DB and post the notification; and executes the entire cycle natively from your workspace.

## Local Actor Run Guidelines (Interactive Prompting)
Whenever running actors locally, the following operational rules must be strictly followed:
1. **No Dummy Defaults**: Never run actors with static/mock projects or dummy data (like "health-erecords") by default. The agent must interactively ask the user which project they want to run or pitch.
2. **Project Codebase Study**: The target project must exist locally on the machine. The agent must read and study the actual codebase, package files, and documents of that project to understand what it does, how it works, and extract real features and pain points to compose an accurate B2B pitch.
3. **Dynamic VC Discovery**: Do not rely on hardcoded investor lists. The agent must dynamically discover VCs using real-time search engine queries, online trends, X (Twitter) posts, Facebook, Google, and other web data.
4. **Agent LLM Capabilities**: For AI/LLM operations (such as drafting personalized pitches), the agent must utilize its own LLM capabilities (e.g. Antigravity or Windsurf coding agent's models) rather than requiring an external OpenAI API key, since the user already pays for agent usage.
5. **Interactive Console CLI**: Whenever starting a local actor run, the agent must ask the user questions to configure all parameters, simulating the interactive experience of the Apify Console's UI/input form inside the terminal/chat interface.

## Cairn Report Writing Agent

Use the local Cairn report-writing agent whenever writing, rewriting, reviewing, or standardizing reports for this workspace, especially Cairn migration reports, audit findings, staged concept summaries, and files named `reports/CAIRN_*.md`.

Local files:
- Agent contract: `agents/cairn-report-writing-agent.md`
- Agent Skill: `skills/cairn-report-writing/SKILL.md`
- Report standard: `skills/cairn-report-writing/references/REPORT_STANDARD.md`
- Writer script: `skills/cairn-report-writing/scripts/write_cairn_report.py`

Report rules:
- Write every report as a Cairn concept with YAML frontmatter.
- Use timestamped filenames under `reports/`.
- Preserve staged concept paths exactly.
- Include sections in this order for migration reports: Current State, Knowledge Inventory, Relationship Inventory, Per-Concept Compliance Levels, Gaps, Migration Roadmap.
- Split relationships into `Declared` and `Inferred`.
- Preserve evidence notes for inferred relations.
- Never compute a whole-bundle compliance score; compliance is per concept only.
- Treat `<needs author input>` and `<needs author mapping>` as explicit gaps requiring human review.
- Roadmap items must include rationale, benefit, risk, and rough complexity.

