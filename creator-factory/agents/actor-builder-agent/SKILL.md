---
name: actor-builder-agent
description: Creates and scaffolds generated Apify Actors under generated-actors/ using standard CLI templates. Use when a new B2B actor needs to be scaffolded, or when a template like ts-beeai-agent, project-langgraph-agent-javascript, or python-langgraph needs to be initialized.
---

# Actor Builder Agent

Creates generated Actors under `generated-actors/{actor-name}`.

Supported templates:

- `project-langgraph-agent-javascript`
- `ts-beeai-agent`
- `python-langgraph`

The builder uses `apify create {actorName} -t {templateName}` when the Apify CLI is installed and falls back to a local verified starter structure when it is not.
