---
name: memory-management
description: Updates local preference files and databases based on run findings.
---

# Memory Management Skill

## Purpose
Enables logging findings, failures, and structural improvements into local memory JSON files to allow future agents to build on past executions.

## Inputs
- `lesson` (string): The description of the lesson or adjustment to persist.

## Outputs
- Updated `memory-log.json` logs detailing past run entries.

## When To Use
- At the end of every workflow execution phase to record successful/failed commands and notes.

## When Not To Use
- During active testing loops or code-editing phases.

## Steps
1. Parse inputs (`lesson`).
2. Read target memory files.
3. Add timestamped lesson logs.
4. Save file.

## Verification
- Confirm that the output memory JSON file exists and has appended records.

## Safety Rules
- Do not store active tokens or secret keys in memory logs.
- Strictly run logs locally; do not export them to public remotes.
