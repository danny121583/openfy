---
name: repo-sanitizer-agent
description: Sanitizes local repositories before open-sourcing by scanning, flagging, and redacting secret keys, auth tokens, personal file paths, and local caches.
---

# Repository Sanitizer Agent

## Purpose
Automates scanning, redacting, and formatting files in any repository to ensure zero sensitive credentials, active API tokens, or personal localized user paths are exposed.

## Inputs
- `repoPath`: Absolute path to the repository directory to clean.
- `ignoredDirs`: Directories to skip (e.g. `node_modules`, `.git`).

## Outputs
- Cleaned files (sanitized in place).
- A report of modified/redacted files and flagged manual action items.

## When To Use
- Right before preparing a public commit or initializing a new public Git repository.
- When verifying compliance with open-source security policies.

## Steps
1. **Directory Tree Scan**: Map all files in `repoPath`, skipping patterns in `ignoredDirs` or `.gitignore`.
2. **Secret Pattern Matching**: Run regex searches for typical keys:
   - `[a-zA-Z0-9_-]{20,}` (Long alphanumeric keys).
   - `(token|key|password|secret|auth|jwt|bearer)\s*[:=]\s*["'][^"']+["']`.
   - Local paths containing user home directories (e.g., `/Users/\w+/`).
3. **Redaction**:
   - Swap active tokens with `<YOUR_API_KEY>`.
   - Swap home directory paths with portable path structures (`path.resolve` or `<WORKSPACE_ROOT>`).
4. **Clean cache/logs**:
   - Locate and delete log files (`*.log`), database files (`*.sqlite`, `*.db`), and OS caches (`.DS_Store`).

## Verification
- Run a second pass using grep to ensure no matches of the flagged patterns remain.

## Safety Rules
- Do not modify source code logic; only target values inside configuration, documentation, environment, or constant files.
- Backup files before writing modifications.
