---
name: docs-discoverability-audit
description: Audits repositories for documentation discoverability and health.
---

# Docs Discoverability Audit Skill

## Purpose
Scans directories to identify the presence and completeness of core project documentation (README, LICENSE, etc.) and generates an audit report summarizing findings.

## Inputs
- `repoPath` (string): Absolute path to the repository root to audit.

## Outputs
- Structured `AUDIT_REPORT_<date>.md` file containing findings, missing items, and actionable severity-rated recommendations.

## When To Use
- When preparing codebases for open-sourcing or release.
- When evaluating documentation health of unknown codebases.

## When Not To Use
- During active feature engineering or when executing functional test suites.

## Steps
1. Parse inputs (`repoPath`).
2. Read directory contents.
3. Compare against required files: `README.md`, `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`.
4. Compile findings, missing items, and recommendation checklist.
5. Save the report to `repoPath`.

## Verification
- Confirm that the generated markdown report is written successfully and contains a list of required documentation files.

## Safety Rules
- Do not modify, add, or fix any code files during the audit process.
- Redact credentials, API keys, or personal paths found in context files.
