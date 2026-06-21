---
name: dependency-updates
description: Checks for outdated packages and deprecations.
---

# Dependency Updates Skill

## Purpose
Enables scanning package manifests and executing package manager checks to detect security advisories or outdated packages requiring version updates.

## Inputs
- `project` (string): Absolute path to package target directory to scan.

## Outputs
- Standard output logs and `dependency-watch-report.md` reports summarizing outdated libraries.

## When To Use
- During scheduled automated health checks or CI builds to verify dependency safety.

## When Not To Use
- When debugging local run scripts or writing documentation guides.

## Steps
1. Parse inputs (`project`).
2. Run standard CLI tools (`npm outdated`).
3. Compile security advisories and outdated versions.
4. Save report.

## Verification
- Confirm that outdated packages (if any) are outputted in a report.

## Safety Rules
- Do not apply version upgrades or command writes automatically (run scans only).
- Never modify lockfiles directly without safety test evaluations.
