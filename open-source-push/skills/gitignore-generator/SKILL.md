---
name: gitignore-generator
description: Analyzes repository directories and generates clean, standard, project-agnostic gitignore configuration files.
---

# Gitignore Generator

## Purpose
Scaffolds and builds customized `.gitignore` configurations for any repository based on its languages and runtime environment.

## Inputs
- `projectLanguages`: List of languages used (e.g. `javascript`, `python`, `rust`).
- `customExclusions`: Custom paths/files to ignore.

## Outputs
- `.gitignore` file.

## When To Use
- During initial project scaffolding or open-source preparation audits.

## Steps
1. **Identify Environments**: Detect key ecosystems:
   - Node.js (`node_modules`, package-lock/npm-debug)
   - Python (`__pycache__`, `.venv`, `.pyc`)
   - Rust (`target/`, Cargo.lock if app-specific)
   - OS-specific (`.DS_Store`, `Thumbs.db`)
2. **Secrets & Configurations**: Always add patterns for credentials:
   - `.env`
   - `.env.*`
   - `*.pem`
   - `*.key`
   - `auth.json`
3. **Assemble Files**: Combine standard templates with `customExclusions`.
4. **Write Output**: Save `.gitignore` to the project root.

## Verification
- Run `git status --ignored` to check what files will be tracked vs. ignored before committing.
