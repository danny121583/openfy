---
name: repo-ingester
description: Crawls and analyzes GitHub repositories for B2B actor development insights.
---

# Repo Ingester Skill

## Purpose
Enables downloading and analyzing open-source repositories to inspect dependencies, codebase architecture, and check licenses to prevent importing restrictive software into monetized packages.

## Inputs
- `url` (string): The public GitHub repository URL.
- `slug` (string): The slug identifier for the actor report output.

## Outputs
- Ingestion and license compliance reports written to the workspace reports directory.

## When To Use
- When planning actor development based on existing open-source SDKs, cookbooks, or wrappers.
- During security or compliance audits of external source materials.

## When Not To Use
- When working with authorized commercial/internal codebases that do not require licensing audits.

## Steps
1. Parse inputs (`url`, `slug`).
2. Scan root license patterns for MIT, Apache-2.0, BSD, or ISC.
3. Identify dependencies in files (e.g. `package.json`, `requirements.txt`).
4. Generate and write `github-ingest-report.md` to `reports/{slug}/`.

## Verification
- Confirm that the output files exist in the reports directory.
- Verify that restrictive license flags are correctly recorded.

## Safety Rules
- Flag copyleft (GPL, AGPL) licenses and block automation if found.
- Do not store or log personal github access tokens.
