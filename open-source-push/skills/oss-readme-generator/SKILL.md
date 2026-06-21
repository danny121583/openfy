---
name: oss-readme-generator
description: Generates high-quality, buyer-facing, and project-agnostic README documentation for open-source projects.
---

# Open Source README Generator

## Purpose
Scaffolds and writes standardized, professional, outcome-oriented README.md files for open-source repositories.

## Inputs
- `projectName`: Branded name of the project.
- `problemSolved`: Descriptive text summarizing the value proposition.
- `inputSchema`: Struct/schema of inputs.
- `outputSchema`: Struct/schema of outputs.

## Outputs
- `README.md` containing formatted markdown.

## When To Use
- When documenting a new open-source repository for initial release.
- When revising existing README files to align with professional documentation standards.

## Steps
1. **Scaffold Structure**: Apply the standardized sections:
   - `# Project Name`
   - `## Overview` (What it does, who it is for, why it is useful)
   - `## Installation` (Commands to install dependencies)
   - `## Configuration` (Environment variables required)
   - `## Usage` (Run commands)
   - `## Inputs & Outputs` (JSON configurations and descriptions)
   - `## Limitations` (Legal disclaimers, scoping limitations)
2. **Outcome-Oriented Focus**:
   - Write clear business outcomes (e.g. "Save time by generating...").
   - Do NOT include pricing or monetization sections (pricing is set on the distribution console, not inside open-source code).
3. **Review**:
   - Verify code blocks compile/render correctly.
   - Use absolute file references relatively (avoid hardcoded local filesystem paths).

## Safety Rules
- Redact credentials, API keys, or private names in example outputs.
