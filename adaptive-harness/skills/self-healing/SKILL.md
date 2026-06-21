---
name: self-healing
description: Failure classification and minimal-patch remediation skill. Diagnoses build, test, lint, type, runtime, and dependency failures and proposes safe fixes.
---

# Self-Healing

## Purpose
Automatically diagnose and remediate common project failures with minimal, safe patches.

## Inputs
- Failed verification results (command, exit code, stdout/stderr)
- Error messages or stack traces
- Project profile

## Outputs
- Failure classification (type, cause, relevant files)
- Proposed fix
- Safety assessment (safe to auto-fix or requires approval)
- Lesson learned

## When To Use
- When a verification command fails
- When a build, test, or deployment step fails
- When self-heal workflow is triggered

## When Not To Use
- When all verifications pass
- For proactive improvements (use audit workflow instead)

## Steps
1. Classify the failure type from command output.
2. Identify likely root cause.
3. List relevant files to inspect.
4. Propose the smallest possible fix.
5. Assess if fix is safe to auto-apply.
6. Apply fix if safe, or escalate.
7. Rerun verification.
8. Record lesson.

## Verification
- Fix must resolve the original failure.
- No new failures introduced by the fix.
- Fix is minimal (smallest change possible).

## Failure Modes
See [failure-modes.md](failure-modes.md).

## Safety Rules
- Never fix files in the never-auto-change list.
- Never fix auth/payments/security without approval.
- Prefer rollback over untested fixes.
- Stop after one failed fix attempt.
