---
name: repo-sanitizer
description: Scans and redacts credentials and home paths from codebases before open-sourcing.
---

# Repo Sanitizer Skill

## Purpose
Enables checking and redacting credential strings, active tokens, and localized personal paths from file directories to prepare code for open-source publications safely.

## Inputs
- `repoPath` (string): Absolute path to the repository directory to clean.

## Outputs
- In-place file edits replacing credentials with `<YOUR_API_KEY>` templates, and logs reporting modified items.

## When To Use
- Right before initiating public repository structures or pushing commits to public branches.

## When Not To Use
- Inside active development configurations where API keys and local settings are actively needed for local tests.

## Steps
1. Parse inputs (`repoPath`).
2. Run regex checks for tokens, passwords, and user home directory strings (`/Users/`).
3. Replace matches with standard generic placeholders.
4. Clean cache folders (`.DS_Store`) and log entries (`*.log`).
5. Write sanitization report.

## Verification
- Confirm that a follow-up grep check returns zero matches for the flagged credential strings.

## Safety Rules
- Backup files before writing modifications.
- Do not modify source code logic files (only environment/config setups).
