---
name: docs-generator
description: Generates and synchronizes actor markdown documentation.
---

# Docs Generator Skill

## Purpose
Creates clear, buyer-facing markdown documentation and ensures root-level and `.actor/` directories contain identical synchronized files before deployment.

## Inputs
- `slug` (string): Slug of the actor whose docs need to be generated.

## Outputs
- Synchronized documentation files (`README.md`, `.actor/README.md`, `ACTOR.md`, `EXAMPLES.md`, `CHANGELOG.md`, `.actor/CHANGELOG.md`) in the actor's directory.

## When To Use
- When scaffolding or finalising an actor for release to explain input schemas, outputs, and usage guidelines.
- Whenever code changes modify the input parameters or output shape.

## When Not To Use
- When documenting non-actor internal factory processes or writing reports.

## Steps
1. Parse inputs (`slug`).
2. Read the actor's concept and specifications.
3. Write `README.md`, `ACTOR.md`, `EXAMPLES.md`, and `CHANGELOG.md` to the actor root.
4. Copy `README.md` and `CHANGELOG.md` to the `.actor/` subfolder.
5. Verify the files are identical using file-content comparisons.

## Verification
- Run file comparison check between root files and `.actor/` files.
- Verify markdown syntax is valid and contains required sections like "How It Works".

## Safety Rules
- Never expose API tokens, cookies, or secrets in example payloads.
- Do not include pricing or monetization structures directly in user-facing documents.
