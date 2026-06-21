---
name: cairn-report-writer
description: Formats repository audit findings into Cairn-compliant markdown reports.
---

# Cairn Report Writer Skill

## Purpose
Enables formatting findings from repository analyses, checklist audits, or dependency scans into Cairn-compliant schemas with standardized YAML metadata.

## Inputs
- `slug` (string): The slug identifier for the report title and file name.

## Outputs
- Cairn-compliant report markdown stored in `reports/CAIRN_REPORT_<slug>.md`.

## When To Use
- When preparing structured architectural transition summaries or audit deliverables.
- When generating reports designed for long-term machine indexing and documentation search.

## When Not To Use
- During direct filesystem modification tasks where reporting is unnecessary.

## Steps
1. Parse inputs (`slug`).
2. Read analysis data.
3. Formulate YAML header.
4. Construct compliant sections (Executive Summary, Findings).
5. Save markdown output.

## Verification
- Confirm that the output file begins with a valid YAML metadata block.
- Verify that standard sections are present.

## Safety Rules
- Do not output credentials in report text.
- Do not publish reports directly to remote hosts without review.
