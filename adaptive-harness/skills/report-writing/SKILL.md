---
name: report-writing
description: Structured timestamped report generation skill. Produces markdown reports with consistent sections for task, profile, workflow, verification, failures, fixes, safety gates, lessons, and recommendations.
---
# Report Writing
## Purpose
Generate consistent, timestamped markdown reports for every harness operation.
## Inputs
- HarnessReport data structure
- Optional custom suffix for filename
## Outputs
- Markdown report file at `reports/YYYY-MM-DD-HHMM-<suffix>.md`
## When To Use
- At the end of every workflow
- After self-healing attempts
- After daily update checks
## When Not To Use
- Never skip reporting
## Steps
1. Collect all workflow phase results.
2. Assemble HarnessReport structure.
3. Render markdown with standard sections.
4. Write to timestamped file.
## Verification
- Report file exists at expected path.
- All required sections present.
## Failure Modes
See [failure-modes.md](failure-modes.md).
## Safety Rules
- Never include actual secret values in reports.
- Truncate command output to prevent oversized reports.
