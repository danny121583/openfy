# Adaptive Harness

A **project-agnostic adaptive agent harness** that can analyze any software repository, detect its stack, synthesize dynamic workflows, and produce structured reports. It learns from successes and failures, self-heals broken workflows, checks for updates, and continuously improves its knowledge.

Apify is the first supported adapter — but the harness is designed to work with **any project type**.

---

## Why Project-Agnostic?

The harness does not assume:
- A specific language (supports Node.js, Python, Go, Rust, etc.)
- A specific framework (detects React, Vue, Angular, Express, Django, FastAPI, Crawlee, etc.)
- A specific package manager (npm, pnpm, yarn, bun, pip, poetry, uv)
- A specific deployment model (Docker, serverless, Apify actors, etc.)

Instead, it **detects everything at runtime** by scanning the repository and building a normalized profile.

---

## Architecture

```
Any Project
  ↓
Project Analyzer
  ↓
Project Profile
  ↓
Adapter Selection
  ↓
Dynamic Workflow
  ↓
Specialized Agents
  ↓
Verification
  ↓
Memory Update
  ↓
Report
```

---

## How It Works

### 1. Project Analysis
The analyzer scans a target directory (up to 3 levels deep) and detects:
- **Languages** from file extensions
- **Package manager** from lockfile presence
- **Frameworks** from dependency manifests
- **Commands** (build, test, lint, typecheck, dev, start) from package.json scripts
- **CI/CD** configuration files
- **Environment** files
- **Risk areas** (auth, payments, security, env, deployment, database)
- **Adapter applicability** with confidence scores

### 2. Adapters
Adapters are pluggable modules that add project-type-specific knowledge:

| Adapter | Detects | Provides |
|---------|---------|----------|
| `generic-node` | package.json, JS/TS files | npm commands, Node conventions |
| `generic-python` | requirements.txt, pyproject.toml | pip/poetry commands, Python conventions |
| `generic-monorepo` | workspaces, Nx, Turborepo, Lerna | Sub-package mapping, workspace commands |
| `apify` | .actor/, actor.json, Apify SDK, Crawlee | Schema validation, actor analysis, safety rules |

### 3. Apify Adapter
When Apify signals are detected, the adapter activates and provides:
- Deep actor directory analysis
- Input/output schema validation against Apify standards
- SDK and Crawlee usage pattern checking
- Proxy, dataset, key-value store, request queue detection
- Marketplace readiness assessment
- Safety rules (no auto-publish, no auto-pricing, no auto-secrets)

### 4. Skills
Skills are self-contained knowledge modules following the [agentskills.io](https://agentskills.io) standard:

| Skill | Purpose |
|-------|---------|
| `repo-analysis` | Filesystem scanning and detection |
| `workflow-synthesis` | Dynamic workflow generation |
| `self-healing` | Failure classification and remediation |
| `dependency-updates` | Safe update recommendations |
| `security-review` | Secret scanning and vulnerability checks |
| `test-runner` | Test execution and result parsing |
| `docs-updater` | Documentation completeness checking |
| `report-writing` | Structured report generation |
| `apify-adapter` | Apify-specific patterns and validation |

### 5. Workflows
Workflows are multi-phase execution plans:
- **analyze-project** — Profile a repository
- **daily-update** — Check for outdated packages and security advisories
- **self-heal** — Diagnose and fix failures
- **repo-audit** — Full repository structure and quality audit
- **dependency-review** — Deep dependency analysis
- **apify-actor-review** — Apify marketplace readiness assessment

### 6. Memory
The harness maintains append-only JSONL logs:
- `lessons.jsonl` — What the harness learned from each run
- `failures.jsonl` — Failures encountered with classification
- `successful-workflows.jsonl` — Workflows that completed successfully
- `update-history.jsonl` — Dependency update checks and results
- `project-profiles.jsonl` — Historical project profiles

### 7. Safety Gates
All operations are governed by `config/safety-policy.json`:
- Default mode: **recommendation-only**
- Auto-fix allowed for safe patterns (e.g., lint --fix)
- Auto dependency patches **disabled by default**
- Approval required for: auth, payments, database, migrations, security, deployment, env, secrets, pricing, publishing
- Never auto-change: .env files, secrets, credentials, payment/pricing logic, production configs

### 8. Reports
Every run produces a timestamped markdown report at:
```
reports/YYYY-MM-DD-HHMM-<type>.md
```

Reports include: task, date, project profile, detected adapter, workflow used, agents used, skills used, files inspected/changed, commands run, verification result, failures, fixes, safety gates, lessons, and recommendations.

---

## Commands

```bash
# Install dependencies
cd adaptive-harness && npm install

# Analyze a project (defaults to parent directory)
npm run harness:analyze

# Analyze a specific project
npm run harness:analyze -- --root=/path/to/project

# Run daily update check
npm run harness:daily-update

# Self-heal a known error
npm run harness:self-heal -- --error="build failed: cannot find module"

# Synthesize a workflow for a custom goal
npm run harness:workflow -- "your task here"

# List available skills
npm run harness:workflow -- "list available skills"

# TypeScript compilation check
npm run typecheck
```

---

## Adding a New Adapter

1. Create `adapters/your-adapter.ts`
2. Export `ADAPTER_NAME`, `isApplicable(profile)`, `enhanceProfile(profile)`, `getVerificationCommands(profile)`
3. Add detection signals in `core/project-analyzer.ts` under `detectAdapters()`
4. Create a matching skill at `skills/your-adapter/SKILL.md`

## Adding a New Skill

1. Create `skills/your-skill/SKILL.md` with YAML frontmatter (name, description)
2. Add `skills/your-skill/checklist.md` and `skills/your-skill/failure-modes.md`
3. Include sections: Purpose, Inputs, Outputs, When To Use, When Not To Use, Steps, Verification, Failure Modes, Safety Rules
4. The skill will be auto-discovered by the skill registry

---

## Directory Structure

```
adaptive-harness/
├── README.md                          # This file
├── AGENTS.md                          # AI agent operating rules
├── package.json                       # Standalone package
├── tsconfig.json                      # TypeScript config
├── config/
│   ├── harness.config.example.json    # Configuration template
│   └── safety-policy.json             # Safety rules
├── core/                              # Core engine modules
├── agents/                            # Agent specification docs
├── skills/                            # Skill modules (9 directories)
├── adapters/                          # Project-type adapters
├── workflows/                         # Workflow implementations
├── memory/                            # JSONL memory store
├── reports/                           # Generated reports
└── scripts/                           # CLI entry points
```

---

## License

Private. Part of the Apify Creator Factory project.
