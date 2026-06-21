---
name: self-healing
description: Classifies build/compilation errors and generates safe automated corrections.
---

# Self Healing Skill

## Purpose
Enables diagnosing standard error logs and compiling precise recovery tasks (like missing module installs) to recover builds automatically.

## Inputs
- `errorText` (string): The terminal stderr log content.

## Outputs
- Structured recovery task sequences and safety gate compliance states.

## When To Use
- Right after linter or compiler verification commands fail in execution pipelines.

## When Not To Use
- For initial planning tasks or when pushing healthy releases.

## Steps
1. Parse inputs (`errorText`).
2. Run parser to classify error codes.
3. Formulate recovery checklist.
4. Output steps.

## Verification
- Verify that standard dependency package missing warnings compile proper recovery installations.

## Safety Rules
- Strictly reject executing edits on protected modules or payments directories.
- Do not run commands that bypass test validation sweeps.
