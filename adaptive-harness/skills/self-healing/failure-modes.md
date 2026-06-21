# Self-Healing Failure Modes

## Unclassifiable Error
**Symptom**: Error doesn't match any known pattern.
**Recovery**: Classify as runtime_failure. Escalate to human. Record raw error.

## Fix Introduces New Failures
**Symptom**: Verification passes for original but fails on new check.
**Recovery**: Revert fix. Record as lesson. Escalate.

## Fix Not Safe
**Symptom**: Proposed fix touches sensitive files.
**Recovery**: Write recommendation report. Do not apply. Await approval.

## Circular Failure
**Symptom**: Same failure recurs after fix.
**Recovery**: Stop after second attempt. Write detailed diagnostic report.

## Missing Context
**Symptom**: Cannot determine cause without additional files or logs.
**Recovery**: Request additional inspection. Expand file inspection scope.
