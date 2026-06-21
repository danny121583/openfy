# Report Writing Failure Modes
## Disk Full
**Recovery**: Write to stdout as fallback. Log warning.
## Permission Denied
**Recovery**: Write to temp directory. Log warning.
## Missing Data
**Recovery**: Write partial report with "data unavailable" placeholders.
