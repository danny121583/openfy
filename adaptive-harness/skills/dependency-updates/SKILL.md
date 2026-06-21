---
name: dependency-updates
description: Safe dependency update recommendation and application skill. Checks for outdated packages, security advisories, and produces classified update recommendations.
---
# Dependency Updates
## Purpose
Identify outdated, vulnerable, or deprecated dependencies and produce safe update recommendations.
## Inputs
- Project profile (manifests, lockfiles, package manager)
- Safety policy
## Outputs
- List of outdated packages classified as patch/minor/major
- Security advisories
- Update recommendations (apply/review/skip)
## When To Use
- During daily update workflows
- When dependency audit is requested
- When security scan identifies vulnerable packages
## When Not To Use
- During read-only audit workflows
- When the project has no external dependencies
## Steps
1. Run package manager outdated check.
2. Run security audit.
3. Classify each update.
4. Apply safety policy filters.
5. Generate recommendations.
## Verification
- No breaking changes introduced by applied updates.
- Build and test pass after updates.
## Failure Modes
See [failure-modes.md](failure-modes.md).
## Safety Rules
- Default to recommendation-only.
- Never auto-apply major updates.
- Always run verification after applying updates.
