---
name: apify-adapter
description: Audits actor directory schemas and verifies platform parameters.
---

# Apify Adapter Skill

## Purpose
Enables reviewing actor directories to verify that platform-specific parameters (such as `input_schema.json` and `output_schema.json`) conform to target specifications.

## Inputs
- `actorDir` (string): Absolute path to the actor project directory.

## Outputs
- Adaptation logs outlining schema verification results.

## When To Use
- When prepping or validating an actor configuration package before publishing.

## When Not To Use
- For generic node package checks that do not declare Apify specifications.

## Steps
1. Parse inputs (`actorDir`).
2. Verify the existence of `.actor/input_schema.json`.
3. Read schema configuration to verify standard formats.
4. Output status.

## Verification
- Confirm that the validator logs correct status indicators on schema presence.

## Safety Rules
- Do not modify files directly; only report status.
- Do not output personal keys or settings.
