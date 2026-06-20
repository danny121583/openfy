# Cairn Report Standard

## Purpose

Cairn reports are decision artifacts. They tell a human what was scanned, what was staged, what evidence supports it, what is still unresolved, and what should happen next.

## Frontmatter Contract

Every report is a Cairn concept with YAML frontmatter:

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

For audit reports, use `type: schemas/audit-report.md` and tags `[audit, report]`.

## Migration Report Sections

### Current State

State:

- target path or project identity
- scan mode, especially read-only status
- staged output directory
- report timestamp
- whether source files were modified

### Knowledge Inventory

List staged concepts as:

```markdown
- `modules/example.md`: Example Module (module)
```

Use one item per concept. Do not summarize away concept paths.

### Relationship Inventory

Split into:

```markdown
### Declared

### Inferred
```

If none exist, write `- None.`

Each inferred relation must preserve the evidence note:

```markdown
- `docs/example.md` references `<needs author mapping>`: Inferred from import 'apify_client' in example/README.md:121.
```

### Per-Concept Compliance Levels

Report each concept independently:

```markdown
- `modules/example.md`: Level 1 - Description needs author input.; No relations inferred; ...
```

Never compute a repository-wide or bundle-wide score.

### Gaps

Call out unresolved work plainly:

- descriptions marked `<needs author input>`
- relation targets marked `<needs author mapping>`
- missing ownership
- missing hashes
- concepts that should become aliases instead of separate files
- broken or ambiguous relations

### Migration Roadmap

Each item should include rationale, benefit, risk, and rough complexity.

Use concise bullets:

```markdown
- Resolve inferred relation targets. Rationale: relation evidence exists but Cairn targets need stable paths. Benefit: queryable graph. Risk: medium. Complexity: medium.
```

## Audit Report Sections

Audit reports should include:

- audit scope
- methodology or rubric reference
- per-concept findings
- validation failures
- gaps
- next actions

## Quality Bar

A good Cairn report is:

- timestamped
- traceable to staged files
- explicit about source modification status
- clear about what is human-confirmed versus inferred
- free of fabricated descriptions
- practical enough to act on immediately
