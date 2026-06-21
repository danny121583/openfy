# Test Runner Failure Modes
## No Test Command
**Recovery**: Skip test phase. Note in report.
## Test Timeout
**Recovery**: Kill process. Report timeout. Suggest increasing timeout.
## Flaky Tests
**Recovery**: Rerun once. If same result, report as genuine failure.
