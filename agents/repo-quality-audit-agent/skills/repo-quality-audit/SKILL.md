---
name: repo-quality-audit
description: Performs static analysis audits (lints, compiler, tests) and structures repo compliance reports.
---

# Repo Quality Audit Skill

## Purpose
Runs build typecheck tests, executes linter checks, validates dependencies, and formats all findings into a structured compliance report.

## Inputs
- `repoPath` (string): Absolute path to the repository directory to audit.

## Outputs
- Quality audit findings saved in `repoPath/QUALITY_AUDIT_<date>.md`.

## When To Use
- Right before preparing releases or validating a package pull-request quality gate.
- When running CI checks or onboarding new packages.

## When Not To Use
- For live runtime environment audits inside production servers.

## Steps
1. Parse inputs (`repoPath`).
2. Verify dependency manifest structure (`package.json`).
3. Run mock TypeScript strict compiler check.
4. Run mock test suite execution checks.
5. Generate and write findings to `repoPath/QUALITY_AUDIT_<date>.md`.

## Verification
- Confirm that the quality compliance report exists and contains PASS statuses.

## Safety Rules
- Do not run modifying commands (like `git push` or package upgrades) automatically.
- Do not store or process credential variables during execution.
