---
name: workflow-synthesis
description: Dynamic workflow generation skill. Takes a user goal, project profile, available skills, and safety policy to produce a structured multi-phase execution plan.
---

# Workflow Synthesis

## Purpose
Generate actionable, phase-ordered workflow plans tailored to a specific project and goal.

## Inputs
- User goal (natural language)
- Project profile
- Available skills list
- Safety policy

## Outputs
- WorkflowPlan with phases, agents, skills, verification commands, rollback plan

## When To Use
- When a user requests a task that requires multiple steps
- When generating audit, update, or healing workflows

## When Not To Use
- For single-command operations
- When a workflow plan already exists and is still valid

## Steps
1. Parse user goal to identify intent category.
2. Select matching phase templates.
3. Populate phase details from project profile.
4. Assign agents and skills to each phase.
5. Set verification commands.
6. Add safety gates where needed.
7. Generate rollback plan.
8. Return structured workflow plan.

## Verification
- Plan must have at least 2 phases (analysis + report).
- Each phase must have at least one agent assigned.
- Verification commands must come from the project profile.

## Failure Modes
See [failure-modes.md](failure-modes.md).

## Safety Rules
- Never generate phases that skip safety gates.
- Always include a final report phase.
- Never generate phases that edit files without verification.
