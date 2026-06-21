---
name: spec-writer
description: Analyzes business workflow descriptions and writes structured developer specifications.
---

# Spec Writer Skill

## Purpose
Converts unstructured business workflow descriptions into precise developer-facing execution specifications containing retry thresholds, schemas, and crawl phases.

## Inputs
- `prompt` (string): Plain-English description of the desired business workflow automation.

## Outputs
- Structured JSON or markdown specification containing validation steps, schema definitions, failure modes, and retry guidelines.

## When To Use
- When planning the code implementation of a new actor, before scaffolding files.
- When drafting technical architectures for B2B tasks.

## When Not To Use
- When writing customer-facing store documentations (use docs-generator skills instead) or checking deployment quality gates.

## Steps
1. Parse inputs (`prompt`).
2. Run spec builder LLM to structure input/output properties.
3. Classify potential failure modes (e.g. timeout, CAPTCHA).
4. Output the spec object.

## Verification
- Confirm that the output specifications define all properties from the original user concept.
- Verify that retry behaviors are defined with exponential backoffs.

## Safety Rules
- Do not store or process proprietary target database credentials inside specifications.
- Redact competitor names or references from specifications.
