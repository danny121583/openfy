---
name: pact-runner
description: Executes the local validation loop and performs self-healing schema/test code repairs.
---

# Pact Runner Skill

## Purpose
Governs running local testing suites and schema checks inside an actor project directory, parsing logs, and applying self-healing code edits until compilation/run checks succeed.

## Inputs
- `slug` (string): The slug of the actor directory to test.
- `maxAttempts` (number): Maximum recovery iterations.

## Outputs
- Testing loop verdicts (passed/failed), failure traces, and lists of automated repairs applied.

## When To Use
- Right after an actor project has been scaffolded or code updates have been generated.
- Before running quality gates or pushing changes to the Apify store.

## When Not To Use
- When analyzing market opportunities or writing initial spec documents.

## Steps
1. Parse inputs (`slug`, `maxAttempts`).
2. Navigate to target actor directories and run `npm install`.
3. Run `npm test` or `apify run`.
4. If failures occur, parse standard error logs for patterns (like missing input schema editors).
5. Apply specific automated repairs and rerun the checks.
6. Return the pact verdict.

## Verification
- Run local validation test suites on sample actors.
- Verify that fixes like input editor insertion are correctly applied to schemas.

## Safety Rules
- Limit the healing loop execution to prevent runaway compile/dependency loops.
- Do not bypass schema tests; keep telemetry disabled.
