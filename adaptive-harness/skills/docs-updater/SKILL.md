---
name: docs-updater
description: Documentation sync and freshness checking skill. Verifies README, CHANGELOG, and API docs are complete, current, and consistent.
---
# Docs Updater
## Purpose
Check documentation completeness and freshness. Identify stale or missing docs.
## Inputs
- Project profile (docs list)
- Source code for cross-reference
## Outputs
- Documentation health report
- List of stale/missing docs
## When To Use
- During audit workflows
- After significant code changes
## When Not To Use
- During emergency fix workflows
## Steps
1. Enumerate all doc files from profile.
2. Check for required docs (README, CHANGELOG).
3. Cross-reference docs with source code.
4. Check for stale references.
5. Report findings.
## Verification
- All required docs exist.
- Docs reference current APIs/structures.
## Failure Modes
See [failure-modes.md](failure-modes.md).
## Safety Rules
- Never overwrite docs without backup.
- Flag changes for human review.
