---
name: security-review
description: Secret scanning, environment file auditing, and vulnerability checking skill. Scans source code for exposed credentials and checks dependencies for known CVEs.
---
# Security Review
## Purpose
Identify exposed secrets, misconfigured environment files, and vulnerable dependencies.
## Inputs
- Project profile (env files, risk areas, manifests)
## Outputs
- List of potential secret exposures
- Environment file audit results
- Vulnerability scan results
## When To Use
- During audit workflows
- When security review is explicitly requested
- As part of daily update checks
## When Not To Use
- During build-only verification
## Steps
1. Scan source files for hardcoded secrets (API keys, tokens, passwords).
2. Audit .env files for proper gitignore coverage.
3. Check for secrets in git history (if available).
4. Run dependency vulnerability scan.
5. Report findings with severity ratings.
## Verification
- No false negatives on known secret patterns.
- All .env files properly gitignored.
## Failure Modes
See [failure-modes.md](failure-modes.md).
## Safety Rules
- Never log or display actual secret values.
- Report only the file, line, and pattern type.
- Never modify .env files automatically.
