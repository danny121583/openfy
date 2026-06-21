---
name: repo-analysis
description: Filesystem scanning and project detection skill. Inspects repository structure to identify language, framework, package manager, test/build commands, CI configuration, risk areas, and adapter applicability.
---

# Repository Analysis

## Purpose
Detect and profile any repository's structure, stack, and operational characteristics without making assumptions about the technology.

## Inputs
- Repository root path
- Optional depth limit for tree scanning

## Outputs
- Project profile with detected type, languages, frameworks, commands, manifests, lockfiles, CI files, env files, docs, entrypoints, risk areas, and applicable adapters

## When To Use
- At the start of any harness operation
- When a new project is first analyzed
- When the project structure may have changed

## When Not To Use
- When a recent profile exists and the project hasn't changed
- During verification-only runs

## Steps
1. Collect directory tree up to configured depth (default: 3 levels).
2. Skip excluded directories (node_modules, .git, dist, build, __pycache__).
3. Flatten the tree into a file list.
4. Detect languages from file extensions.
5. Detect package manager from lockfile presence.
6. Detect frameworks from dependency manifests.
7. Extract commands from package.json scripts or Makefile.
8. Identify CI/CD configuration files.
9. Identify environment files and risk areas.
10. Detect applicable adapters based on signal strength.
11. Build and save the project profile.

## Verification
- Profile must have a non-empty name and root.
- Profile type must be one of: node, python, monorepo, apify, unknown.
- At least one language should be detected (unless the project is empty).
- Commands should be populated if package.json or Makefile exists.

## Failure Modes
See [failure-modes.md](failure-modes.md).

## Safety Rules
- Read-only operation — never modify files during analysis.
- Do not follow symlinks outside the repository.
- Do not read file contents unless necessary for detection (e.g., package.json).
- Respect depth limits to avoid scanning enormous trees.
