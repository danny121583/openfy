---
name: cairn-report-writing
description: Use this skill when writing, rewriting, standardizing, or reviewing Cairn reports, especially migration reports, audit findings, project analysis reports, staged concept summaries, and reports under reports/CAIRN_*.md. Produces Cairn-concept frontmatter, required sections, per-concept scoring, explicit gaps, and a practical roadmap without whole-bundle compliance scores.
---

# Cairn Report Writing

## Core Rule

Write every report as a Cairn concept: YAML frontmatter first, then clear Markdown sections. Reports must be inspectable, timestamped, evidence-based, and useful to a human deciding what to merge next.

## Default Workflow

1. Read the raw findings, staged concepts, validator output, auditor output, or migration run summary.
2. Use `references/REPORT_STANDARD.md` as the report contract.
3. If generating a report from structured input, run:

   ```sh
   python3 scripts/write_cairn_report.py input.json --output reports
   ```

4. Verify the report includes all required sections for its report type.
5. Keep compliance per concept. Never produce a whole-bundle score.
6. Mention unresolved placeholders such as `<needs author input>` or `<needs author mapping>` as gaps, not failures.

## Required Migration Report Shape

Use this section order for migration reports:

1. Current State
2. Knowledge Inventory
3. Relationship Inventory
4. Per-Concept Compliance Levels
5. Gaps
6. Migration Roadmap

The report must include frontmatter:

```yaml
---
type: schemas/migration-report.md
title: Cairn Migration Report for <project>
description: Read-only Cairn migration analysis for <target>.
status: active
tags: [migration, report, cairn-proposed]
timestamp: <ISO 8601>
---
```

## Writing Rules

- State whether the source project was modified.
- Link or name the staged concept directory.
- Split relationships by `declared` and `inferred`.
- For inferred relations, include the evidence note as written.
- Use `<needs author input>` when a claim lacks source support.
- Use `<needs author mapping>` when a relation target cannot be resolved yet.
- Make roadmap items concrete and reviewable: rationale, benefit, risk, and complexity.

Read `references/REPORT_STANDARD.md` before changing the format, adding a new report type, or reviewing a report for compliance.
