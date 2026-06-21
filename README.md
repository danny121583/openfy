# Openfy — Open Source Apify Creator Suite

Openfy is an open-source factory suite designed for building, testing, auditing, and publishing premium, monetizable Apify Actors. It provides an automated development workflow to programmatically validate, package, monetize, and deploy scrapers, AI agents, and integration workflows.

---

## 📦 Features

- **Automated Actor Creator Factory**: Scaffold, run PACT tests, audit schemas, and deploy actors programmatically.
- **Pay-Per-Event (PPE) Orchestration**: Out-of-the-box configuration helpers for monetization.
- **True PNG App Icon Pipeline**: Standardize and generate premium App Store style PNG icons using anti-aliasing masks.
- **Open-Source Sanitization & Push (OSS-Push)**: A project-agnostic auditing framework to scan repositories, sanitize secrets, enforce portable paths, and output clean documentation.

---

## 🗂 Repository Structure

```
├── creator-factory/       # Core factory for generating, testing, & syncing actors
│   ├── src/               # Main logic, CLI scripts, and local MCP server
│   ├── templates/         # Actor boilerplate templates (ts-beeai-agent, etc.)
│   ├── agents/            # Real agents (actor-builder, deploy, docs, etc.) following standard structure
│   └── package.json       # Dependencies & runner scripts
├── adaptive-harness/      # Self-healing test harness executing autonomous agents (planner, verifier, etc.)
├── agents/                # Root real agents (docs auditor, quality audit, cairn report writer)
├── skills/                # Centralized, reusable skill packages for root agents (agentskills.io format)
├── open-source-push/      # Project-agnostic repository sanitization framework
│   ├── agents/            # Sanitization and packaging agents
│   └── skills/            # Cleaning and packaging skills
├── docs/                  # System documentation & guidelines
├── LICENSE                # MIT License
├── README.md              # Root repository documentation (this file)
└── CHANGELOG.md           # Repository-wide changelog
```

---

## 🤖 Agent Architecture & Standardization

All agents and skills in this repository conform strictly to the [agentskills.io](https://agentskills.io) specification. Each agent is structured as an autonomous directory package:

```
agent-name/
├── AGENT.md               # Global agent system prompt, definition, and personality
└── skills/
    └── skill-name/
        ├── SKILL.md       # Skill triggers, input/output schemas, and safety policies
        ├── scripts/
        │   └── run.ts     # Executable TypeScript/Node logic (run via tsx/node)
        └── references/    # Data schemas, validation models, or style templates
```

This structure ensures that agent capabilities are highly discoverable, portable, and cleanly decoupled from the orchestration loop.

---

## 🖥 Supported Platforms

| Platform | Support | Notes |
| --- | --- | --- |
| **macOS** (x64 & arm64) | ✅ Full | `sips` built-in — no extra dependencies |
| **Windows 10+** | ⚠️ Partial | Requires [ImageMagick](https://imagemagick.org) for icon pipeline (`winget install ImageMagick.ImageMagick`) |
| **Linux** (Ubuntu 20.04+) | ✅ Full | Requires `imagemagick` (`sudo apt-get install imagemagick`) |

**Node.js**: v18.0.0 minimum, v20 LTS recommended  
**Apify CLI**: v1.6.2+ (`npm install -g apify-cli`)

> See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for platform-specific setup steps and common issues.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **Apify CLI**: `npm install -g apify-cli`

### 2. Install Dependencies
```bash
cd creator-factory
npm install
```

### 3. Configure Environment
```bash
cp creator-factory/.env.example creator-factory/.env
# Then edit .env with your credentials
```

Required variables:

| Variable | Required | Description |
| --- | --- | --- |
| `APIFY_TOKEN` | ✅ Yes | Your Apify API token |
| `OPENAI_API_KEY` | ⚠️ Recommended | For AI-powered concept validation |
| `ANTHROPIC_API_KEY` | ⚠️ Alternative | Alternative to OpenAI |
| `GITHUB_TOKEN` | ⚠️ Recommended | For Apify Store gap research |

Full variable reference: [creator-factory/CLI_REFERENCE.md](./creator-factory/CLI_REFERENCE.md#6-environment-variables-reference)

### 4. Run the Main Agent
```bash
cd creator-factory
npm run main-agent
```

### 5. Synchronize the Store
```bash
npm run sync-store
```

---

## 📋 CLI Quick Reference

| Script | Purpose | Key Env Vars |
| --- | --- | --- |
| `npm run main-agent` | Generate, test & deploy actors end-to-end | `MAIN_AGENT_ACTORS_PER_RUN`, `MAIN_AGENT_MAX_ATTEMPTS` |
| `npm run sync-store` | Push metadata, pricing & icons to Apify Store | `APIFY_TOKEN`, `APIFY_UI_TOKEN` |
| `npm run mcp-start` | Start local MCP server for AI agent integration | `APIFY_TOKEN` |
| `npm run dev` | Start web dashboard + API in dev mode | — |
| `npm test` | Run shared package unit tests | — |
| `npm run typecheck` | TypeScript strict check across all workspaces | — |

Full reference: [creator-factory/CLI_REFERENCE.md](./creator-factory/CLI_REFERENCE.md)

---

## 📚 Documentation

| Document | Location | Description |
| --- | --- | --- |
| Architecture Guide | [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flows, extension points |
| Migration Guide | [creator-factory/MIGRATION_GUIDE.md](./creator-factory/MIGRATION_GUIDE.md) | Moving from vanilla Apify to Openfy |
| CLI Reference | [creator-factory/CLI_REFERENCE.md](./creator-factory/CLI_REFERENCE.md) | All scripts, flags, and env variables |
| Troubleshooting | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common failures and platform-specific fixes |
| PPE Monetization | [creator-factory/PPE_MONETIZATION_GUIDE.md](./creator-factory/PPE_MONETIZATION_GUIDE.md) | Cost modeling and pricing strategies |
| Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute code and docs |

---

## 📢 Configuring Public Actor Tasks (SEO & AI Traffic)

Actor Tasks are pre-configured inputs for your Actors. Publishing them creates public landing pages (visible on search engines and AI agents) that display specific use-case configurations for your Actor, driving discovery and monetization.

### Automated Task Publication Script

Openfy includes an automated task generator and publisher that creates up to 50 diverse task configurations per Actor (e.g., distinct locations, SaaS platforms, or target directories):

1. **Configure credentials**: Add your Apify tokens to your environment or `creator-factory/.env`:
   - `APIFY_TOKEN`: Required for task creation.
   - `APIFY_UI_TOKEN` (Optional): Required for automatic publication. If not supplied, tasks are created privately on your account, and can be published manually via the Console UI.
2. **Run the script**:
   ```bash
   cd creator-factory
   # Run for all actors
   npx tsx scripts/publish-tasks.ts --limit=50
   
   # Run for a specific actor slug
   npx tsx scripts/publish-tasks.ts --slug="google-maps-lead-quality-agent" --limit=50
   
   # Re-generate and clean existing tasks first
   npx tsx scripts/publish-tasks.ts --slug="google-maps-lead-quality-agent" --limit=50 --clean
   ```

*Note: In accordance with repository privacy standards, generated task specifications and credentials must reside in ignored files (e.g., under `danny-agents/` or local `.env`) and will not be pushed to GitHub.*

---

## 🔒 Open Source Sanitization (OSS-Push)

Before publishing forks or derivative work, use `open-source-push/` to audit and clean your files:
1. **Sweep Secrets**: Regex sweeps to ensure no private tokens or local paths are exposed.
2. **Review Gitignore**: Enforce exclusions for local databases, run reports, and builds.

See [open-source-push/README.md](./open-source-push/README.md) for full details.

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

The `open-source-push/` subpackage is also released under the MIT License.
