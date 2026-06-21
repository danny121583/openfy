---
name: test-runner
description: Runs build checks, lints, and test suites to verify stability.
---

# Test Runner Skill

## Purpose
Enables executing build scripts, unit tests, and compiler checks to verify that codebase commits conform to stable guidelines.

## Inputs
- `project` (string): Absolute path to the repository directory to test.

## Outputs
- Testing execution summaries and exit codes detailing test counts and failure traces.

## When To Use
- Right after applying changes or package updates to verify code compatibility.
- During quality gate validation before pushing commits.

## When Not To Use
- When planning feature workflows or estimating prices.

## Steps
1. Parse inputs (`project`).
2. Run standard testing commands (`npm test`).
3. Extract failure codes.
4. Output results logs.

## Verification
- Confirm test runs complete with valid output.

## Safety Rules
- Read-only on codebase logic: Do not modify source files during test execution.
- Redact credential settings during tests.
