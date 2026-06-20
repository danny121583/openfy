---
name: danny-agent
description: Custom agent manager for the danny-actors workspace. Handles local preference learning, self-healing code loops, PACT validation, and direct email pitching.
license: Apache-2.0
metadata:
  author: DannyAgent
  version: "1.0"
---

# Danny Agent Skill

This skill governs how local B2B actors are configured, studied, validated, and run on the user's local machine.

## 1. Codebase Study & Learning
Before executing a pitch, the agent must check the target project codebase:
1. Parse the project root directory path.
2. Read the project's `package.json` to identify dependencies, frameworks, and setup.
3. Read the project's `README.md` and docs to understand the core features, value proposition, and user pain points.
4. Extract metadata to construct a highly personalized pitch (avoiding generic descriptions).

## 2. Preference Persistence (Self-Learning)
The agent stores learned preferences (such as target emails, default projects, and niches) inside `/danny-actors/reports/preferences.json` to inherit them in future runs without re-prompting.

## 3. Self-Healing & PACT Loop
If local execution or validation fails:
1. Capture stdout/stderr logs.
2. Analyze CLI validation or compiler errors.
3. Apply programmatic fixes to code or schema files.
4. Rerun `npx apify validate-schema` and local tests until they pass.

## 4. Email Outreach
- If a target recipient email is supplied (e.g. `apd1034@gmail.com`), compile the pitch and use the local system `mail` utility to send it directly.
