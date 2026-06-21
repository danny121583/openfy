---
name: github-ecosystem-scanner-skill
description: Scans a repository's GitHub configuration (issues, PR templates, actions, workflows, security policies) and reports compliance with the repository quality standard.
license: Apache-2.0
metadata:
  author: Danny
  version: "0.1"
---

# GitHub Ecosystem Scanner Skill

> [!NOTE]
> This skill is **developer‑facing** and intended to be used locally within any project. It does not publish or push anything to GitHub.

## Purpose
Analyzes the GitHub metadata of a repository to ensure it meets the quality baseline:
- Presence of issue and PR templates.
- Configured branch protection rules.
- Use of required status checks and CODEOWNERS.
- CI workflow files adhere to naming conventions.
- Security policies (e.g., `SECURITY.md`).

## Inputs
| Name | Type | Description |
|------|------|-------------|
| `repoPath` | `string` | Local filesystem path to the repository root. |
| `githubToken` | `string` (optional) | Personal Access Token with `repo` scope, used only for API queries (e.g., branch protection). |

## Outputs
| Name | Type | Description |
|------|------|-------------|
| `report` | `object` | Structured audit data containing `missing`, `warnings`, and `passes` arrays. |

## When To Use
- As part of a repository quality audit pipeline.
- In CI before merging a PR to validate repository configuration.

## When Not To Use
- For public repositories where you lack a token to query protected settings.
- When you only need code‑level linting; use `code-quality-checker-skill` instead.

## Steps
1. Locate `.github/` directory and enumerate relevant files.
2. If `githubToken` provided, query GitHub API for branch protection rules.
3. Validate presence of required files (`ISSUE_TEMPLATE`, `PULL_REQUEST_TEMPLATE`, `CODEOWNERS`, `SECURITY.md`).
4. Parse workflow YAML files to ensure they reference required actions (e.g., lint, test).
5. Assemble findings into the `report` object.

## Verification
- Run the skill against a known good repository and confirm `passes` includes all items.
- Run against a repository missing a template and verify it appears in `missing`.

## Safety Rules
- Do **not** modify any repository files; this skill is read‑only.
- Do **not** expose the `githubToken` in logs.
- Ensure any network calls respect rate limits.
