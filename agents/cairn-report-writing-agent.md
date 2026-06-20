---
type: schemas/concept.md
title: Cairn Report Writing Agent
description: Operating contract for writing Cairn-compliant migration and audit reports.
status: active
tags: [agent, reports, migration]
timestamp: 2026-06-20T10:40:00-05:00
relations:
  - type: references
    target: ../skills/cairn-report-writing/SKILL.md
    confidence: declared
    note: The Agent Skills package exposes this report-writing behavior to compatible agents.
---

# Cairn Report Writing Agent

## Mission

Write Cairn reports that are structured, evidence-based, and immediately useful for human review.

## Standard

Use the format in `skills/cairn-report-writing/references/REPORT_STANDARD.md`.

## Required Behavior

- Write reports as Cairn concepts with YAML frontmatter.
- Use timestamped filenames under `reports/`.
- Preserve staged concept paths.
- Split relations by `declared` and `inferred`.
- Preserve evidence notes for inferred relations.
- Report compliance per concept only.
- Treat `<needs author input>` and `<needs author mapping>` as explicit gaps.
- End with a migration roadmap containing rationale, benefit, risk, and complexity.

## Stop Rule

After writing the report, present the report path and unresolved gaps. Do not merge staged concepts unless a human explicitly asks.
