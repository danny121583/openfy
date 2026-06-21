---
name: code-review
description: Analyzes codebase edits and reports standards/safety violations.
---

# Code Review Skill

## Purpose
Enables reviewing source code additions, scripts, or package configs for security, compliance, or structural bugs, reporting findings without applying edits.

## Inputs
- `file` (string): Absolute path to the source file to review.

## Outputs
- Audit notes, linter warnings, or static verification outputs printed to logs.

## When To Use
- After a new code block has been written or an actor template has been populated.
- During quality gate audits or CI checks.

## When Not To Use
- When running automated test suites or compiling builds.

## Steps
1. Parse inputs (`file`).
2. Read file contents.
3. Check for typical security anti-patterns (such as `eval` or credentials).
4. Output review checklist.

## Verification
- Confirm that warnings are outputted when test files contain prohibited keywords.

## Safety Rules
- Read-only: Never write to or edit files during review tasks.
- Never output credential strings directly in logs.
