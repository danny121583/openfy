---
name: workflow-synthesizer
description: Analyzes project structures to synthesize targeted repair/update plans.
---

# Workflow Synthesizer Skill

## Purpose
Enables analyzing repository files, entrypoints, and configurations to build multi-phase execution plans mapped to safety gate policies.

## Inputs
- `goal` (string): The target goal (e.g. "Full project audit" or "dependency update").
- `projectRoot` (string): Absolute path to target repository root.

## Outputs
- Structured JSON workflow plans listing phases, assigned agents, required skills, and rollback steps.

## When To Use
- At the start of any new automation task to plan sequential phases safely.
- When validating build pipelines and safety policies.

## When Not To Use
- During active filesystem writing or code compilation runs.

## Steps
1. Parse inputs (`goal`, `projectRoot`).
2. Run project analyzer to compile dependencies.
3. Build phase checklist.
4. Output phase definitions and rollback script.

## Verification
- Confirm that the synthesized plan output defines index phases and rollback steps.

## Safety Rules
- Strictly respect safety policies (e.g. deny auto-fixes for auth/payments if blocked).
- Redact local absolute path details from output summaries.
