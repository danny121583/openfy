#!/usr/bin/env python3
from datetime import datetime, timezone
from pathlib import Path
import argparse
import json


def bullet(items, empty="- None."):
    if not items:
        return empty
    return "\n".join(f"- {item}" for item in items)


def write_migration(data):
    timestamp = data.get("timestamp") or datetime.now(timezone.utc).isoformat()
    project = data["project"]
    target = data.get("target", project)
    output = data.get("staged_dir", "<unknown>")
    modified = "yes" if data.get("source_modified") else "no"
    inventory = [
        f"`{item['path']}`: {item['title']} ({item.get('kind', 'concept')})"
        for item in data.get("inventory", [])
    ]
    declared = [
        f"`{r['source']}` {r['type']} `{r['target']}`: {r.get('note', '')}".rstrip(": ")
        for r in data.get("declared_relations", [])
    ]
    inferred = [
        f"`{r['source']}` {r['type']} `{r['target']}`: {r.get('note', '')}".rstrip(": ")
        for r in data.get("inferred_relations", [])
    ]
    levels = [
        f"`{item['path']}`: Level {item['level']} - {item.get('notes', 'No notes')}"
        for item in data.get("compliance", [])
    ]
    gaps = data.get("gaps") or [
        "Descriptions marked `<needs author input>` require source-backed author review.",
        "Relation targets marked `<needs author mapping>` require mapping to concrete Cairn concept paths.",
        "Ownership needs confirmation unless a CODEOWNERS concept was detected.",
        "Hashes should be added after staged concepts are reviewed and stable.",
    ]
    roadmap = data.get("roadmap") or [
        "Review staged concept titles and descriptions. Rationale: prevent fabricated knowledge. Benefit: trustworthy concepts. Risk: low. Complexity: low.",
        "Resolve inferred relation targets. Rationale: relation evidence exists but Cairn targets need stable paths. Benefit: queryable graph. Risk: medium. Complexity: medium.",
        "Add missing schema-specific contracts if the project needs specialized concept types. Rationale: keep core minimal while making validation sharper. Benefit: better per-concept checks. Risk: low. Complexity: medium.",
        "Run validation and audit after merging approved concepts. Rationale: verify conformance per concept. Benefit: measurable Cairn maturity. Risk: low. Complexity: low.",
    ]
    return f"""---
type: schemas/migration-report.md
title: Cairn Migration Report for {project}
description: Read-only Cairn migration analysis for {target}.
status: active
tags: [migration, report, cairn-proposed]
timestamp: {timestamp}
---

# Cairn Migration Report for {project}

## Current State

Scanned `{target}` read-only. Generated staged Cairn concepts in `{output}`.

Source modified: {modified}.

## Knowledge Inventory

{bullet(inventory, "- No concepts detected.")}

## Relationship Inventory

### Declared

{bullet(declared)}

### Inferred

{bullet(inferred, "- No inferred relations detected.")}

## Per-Concept Compliance Levels

{bullet(levels, "- No concepts scored.")}

## Gaps

{bullet(gaps)}

## Migration Roadmap

{bullet(roadmap)}
"""


def main():
    parser = argparse.ArgumentParser(description="Write a Cairn migration report from structured JSON.")
    parser.add_argument("input", help="JSON file containing report data")
    parser.add_argument("--output", default="reports", help="Output directory")
    args = parser.parse_args()
    data = json.loads(Path(args.input).read_text(encoding="utf-8"))
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out_dir / f"CAIRN_MIGRATION_{stamp}.md"
    path.write_text(write_migration(data), encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
