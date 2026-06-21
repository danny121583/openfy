---
name: task-execution
description: Executes safe command operations and dependency installations.
---

# Task Execution Skill

## Purpose
Enables running command instructions and file edits safely, filtering out harmful operations and respecting safety guidelines.

## Inputs
- `command` (string): The shell command to execute.
- `project` (string): Target working directory for execution.

## Outputs
- Subprocess execution stdout/stderr logs and command status.

## When To Use
- When executing safe dependency installations or clean builds.
- When running validation checks.

## When Not To Use
- For unchecked manual refactoring sweeps or running arbitrary remote URLs.

## Steps
1. Parse inputs (`command`, `project`).
2. Run safety filters to check for harmful operations (e.g. root removals).
3. Execute command subprocess.
4. Output status and return exit code.

## Verification
- Confirm target commands complete with success codes.

## Safety Rules
- Strictly abort dangerous shell operations (e.g. `rm -rf /` or credential dumps).
- Redact credentials from shell outputs.
