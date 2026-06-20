# Apify Creator Factory

Production workflow for creating, testing, polishing, monetizing, and deploying Apify Actors.

## Quick Start

```bash
npm install
npm run dev
```

The API runs on `http://localhost:4310` and the web app runs on `http://localhost:5173`.

## Agent Skill

Use the local Codex skill at `~/.codex/skills/apify-creator-factory` for Apify-specific implementation, testing, deployment, and handoff rules. The skill includes a sparse checkout of `apify/apify-docs` so agents can search official docs before changing Actor, CLI, input schema, Store, or deployment behavior.

## Main Agent

When the user says `run main agent`, run:

```bash
npm run main-agent
```

This researches Apify Store categories, selects five non-duplicate monetizable Actor ideas, creates Actor folders in `generated-actors`, runs PACT and the quality gate, pushes only passing Actors, and writes reports under `reports/main-agent-runs/{runId}`.

The main agent runs Actors one by one. It stops on the first Actor that does not pass and push successfully, so the failed Actor can be fixed before the next one starts.

The shared pipeline test path uses fast npm smoke tests by default. Set `PACT_USE_APIFY_RUN=1` only when you explicitly want the shared pipeline to require a real local `apify run`; the main agent always runs real Actor validation during its own flow.

## Apify CLI Workflows

Install the Apify CLI:

```bash
curl -fsSL https://apify.com/install-cli.sh | bash
brew install apify-cli
npm install -g apify-cli
```

Windows:

```powershell
irm https://apify.com/install-cli.ps1 | iex
```

Supported Actor templates:

```bash
apify create my-actor -t project-langgraph-agent-javascript
apify create my-actor -t ts-beeai-agent
apify create my-actor -t python-langgraph
```

Local and deploy flow:

```bash
cd generated-actors/my-actor
apify run
apify login
apify push
```

Secrets are read from environment variables only. Never place real tokens in generated Actors, reports, screenshots, or docs.
