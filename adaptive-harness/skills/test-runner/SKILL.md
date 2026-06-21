---
name: test-runner
description: Multi-framework test execution and result parsing skill. Runs test suites, captures results, and identifies failures across Node, Python, and custom test frameworks.
---
# Test Runner
## Purpose
Execute test suites and return structured pass/fail results.
## Inputs
- Project profile (test command, cwd)
## Outputs
- Test results with exit codes, stdout/stderr, duration
## When To Use
- During verification phases
- After applying fixes
- During audit workflows
## When Not To Use
- When no test command exists in the profile
## Steps
1. Identify test command from profile.
2. Execute test command.
3. Capture output and exit code.
4. Parse results.
5. Return structured verdict.
## Verification
- Test command exits cleanly with known exit code pattern.
## Failure Modes
See [failure-modes.md](failure-modes.md).
## Safety Rules
- Never modify test files during execution.
- Capture all output for diagnostic purposes.
