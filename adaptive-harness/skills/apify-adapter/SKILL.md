---
name: apify-adapter
description: Apify actor and agent marketplace adapter skill. Analyzes and validates Apify actors, input/output schemas, SDK usage, proxy configuration, storage patterns, and deployment readiness without hardcoding Apify into the core harness.
---
# Apify Adapter Skill

## Purpose
Analyze and improve Apify actors without hardcoding Apify into the core harness. This is a pluggable adapter skill that activates only when the project analyzer detects Apify signals.

## Inputs
- Project profile with Apify detection signals
- Actor directory paths
- Actor configuration files

## Outputs
- Per-actor analysis with issues list
- Schema validation results
- Marketplace readiness assessment
- Adapter-specific recommendations

## When To Use
- When project analyzer detects Apify signals (actor.json, .actor/, Apify SDK, Crawlee)
- When user requests Apify-specific audit or review
- When marketplace readiness assessment is needed

## When Not To Use
- When no Apify signals are detected
- For non-Apify Node.js projects

## Detect
- actor.json configuration files
- .actor/ directories
- Input schemas (input_schema.json, INPUT_SCHEMA.json)
- Output schemas (output_schema.json)
- Apify SDK usage in package.json and source files
- Crawlee framework usage
- Proxy configuration (ProxyConfiguration, useApifyProxy)
- Dataset usage (Actor.pushData, Dataset.open)
- Key-value store usage (Actor.getValue, Actor.setValue)
- Request queue usage (RequestQueue, RequestList)
- Storage directories (apify_storage/, storage/)
- Monetization/pricing metadata in actor.json
- Actor registry files

## Verify
- `npm install` succeeds
- `npm run build` succeeds (if available)
- `npm test` succeeds (if available)
- Input schema has valid structure (title, type, properties, schemaVersion)
- Input schema properties have editor fields
- Output schema conforms to Apify v1 format
- `APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema` passes
- Local actor run (`apify run`) succeeds (if safe)
- No secrets exposed in source code
- No destructive storage changes
- README exists and is comprehensive
- Dockerfile exists and is valid
- Icon exists at .actor/icon.png

## Safety
- Do not publish actor automatically.
- Do not change pricing automatically.
- Do not change secrets.
- Do not delete storage.
- Do not modify production credentials.
- Do not run actor in production mode.
- Require explicit approval for `apify push`.
- Require explicit approval for store publication.

## Failure Modes
See [failure-modes.md](failure-modes.md).
