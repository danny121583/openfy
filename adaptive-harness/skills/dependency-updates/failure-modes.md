# Dependency Updates Failure Modes
## Package Manager Not Found
**Recovery**: Log warning. Skip outdated check. Report in findings.
## Network Timeout
**Recovery**: Retry once. If still failing, use cached registry data.
## Breaking Update Applied
**Recovery**: Revert changes. Record failure. Escalate to human.
## Conflicting Peer Dependencies
**Recovery**: Report conflict. Do not auto-resolve. Suggest manual resolution.
