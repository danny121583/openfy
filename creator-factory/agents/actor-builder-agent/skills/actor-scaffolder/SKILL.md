---
name: actor-scaffolder
description: Scaffolds generated Apify Actors under generated-actors/ using standard templates.
---

# Actor Scaffolder Skill

## Purpose
Enables the generation of boilerplate directories and configuration files for new Apify Actor projects under the `generated-actors/` workspace.

## Inputs
- `slug` (string): Machine-friendly name of the actor (e.g. `trend-pilot-tiktok-scraper`).
- `name` (string): Branded outcome-specific title (e.g. `TrendPilot — TikTok Scraper & Creator Leads`).
- `prompt` (string): Raw user query or business value statement.
- `template` (string): Target runtime template (`ts-beeai-agent` | `project-langgraph-agent-javascript` | `python-langgraph`).

## Outputs
- Scaffolded folder structures under `generated-actors/{slug}/` containing starting files (such as `package.json`, `.actor/actor.json`, `main.js`, and `README.md`).

## When To Use
- When a new actor concept and specification have been validated and are ready to be built.
- When resetting or initializing a fresh actor workspace.

## When Not To Use
- When modifying/editing code inside an existing actor (use specific code-editing tools instead).

## Steps
1. Parse inputs (`slug`, `name`, `prompt`, `template`).
2. Create the target directory under `generated-actors/{slug}/`.
3. Write initial files (`package.json`, tsconfig, docker context files).
4. Create the `.actor/` subdirectory and initialize schema files.
5. Create MCP wrapper structures under `.mcp-wrapper/`.

## Verification
- Verify the target folder exists and contains valid JSON schema files and entrypoints.
- Run typecheck checks against the scaffolded TS structure.

## Safety Rules
- Never overwrite an existing actor subdirectory unless explicit force parameters are supplied.
- Never write credentials or hardcoded API keys into configuration templates or environment examples.
