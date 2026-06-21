---
name: code-quality-checker-skill
description: Assesses a TypeScript/JavaScript project for linting, test presence, and TypeScript strict mode compliance.
license: Apache-2.0
metadata:
  author: Danny
  version: "0.1"
---

# Code Quality Checker Skill

**Purpose**: Evaluate the codebase for quality signals required by the repository quality standard.

## Inputs
- `repo_path` (string): Absolute path to the cloned repository.
- `project_type` (string, optional): e.g., `ts`, `js`. Determines which checks to run.

## Outputs
- `has_eslint` (boolean)
- `has_prettier` (boolean)
- `ts_strict` (boolean) – true if `tsconfig.json` enables `strict`.
- `test_count` (number) – number of test files detected (files matching `*.test.*`).
- `issues` (array of strings) – any detected problems.

## When To Use
- After the repository is cloned and a manifest is available.
- As part of the repo‑quality audit pipeline.

## When Not To Use
- For non‑JavaScript/TypeScript projects.

## Steps
1. Detect `package.json`. If missing, add issue.
2. Look for `eslint` and `prettier` config files (`.eslintrc`, `prettier.config.js`, etc.).
3. Parse `tsconfig.json` (if present) and check the `strict` flag.
4. Search for test files (`**/*.test.*` or `**/__tests__/**`). Count them.
5. Populate output fields and list any missing expectations.

## Verification
- Returns `true` for each flag only when the condition is satisfied.
- `issues` contains human‑readable messages for any failures.

## Safety Rules
- Do not execute arbitrary code; only read configuration files.
- Limit file scanning depth to 10 levels to avoid pathological repos.
