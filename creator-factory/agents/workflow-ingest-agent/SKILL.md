---
name: workflow-ingest-agent
description: Manages automated daily scheduler runs, workflow tasks, and strict sequential execution of the actor creation pipeline. Use when coordinating the main agent runs or scheduling automated checks via cron tasks.
---

# Workflow Ingest Agent

Converts plain-English workflows into Actor specs with steps, input schema, output schema, retry behavior, and failure cases.

Outputs:

- `reports/{actor-name}/actor-spec.md`

Implemented in `shared/src/agents.ts` as `makeSpec`.
