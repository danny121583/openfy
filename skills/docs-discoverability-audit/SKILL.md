---
name: docs-discoverability-audit
description: Use this skill to audit any software repository for documentation and discoverability gaps. Checks for the presence and quality of LICENSE, CONTRIBUTING.md, ARCHITECTURE.md, TROUBLESHOOTING.md, CLI reference, migration guide, monetization docs, and GitHub community health files. Produces a structured, prioritized audit report with severity ratings, a file checklist, and concrete recommendations. Use this before open-sourcing a project, before a launch, after a major feature addition, or whenever a project's documentation health is unknown.
metadata:
  author: Daniel Lozano
  version: "1.0"
---

# Docs & Discoverability Audit Skill

## Purpose

Systematically audit a software repository's documentation and discoverability posture. Produces a human-readable report that identifies gaps, assigns severity, and provides prioritized, actionable recommendations — similar to a security audit but for project health and developer experience.

## Inputs

- **Repository path or name**: The local path or GitHub URL of the project to audit
- **Project type** (optional): `library`, `cli-tool`, `web-app`, `api`, `agent-framework` — adjusts which files are considered required vs. optional
- **Audience** (optional): `open-source`, `internal`, `commercial` — adjusts scoring weights (e.g. LICENSE is Critical for open-source, Low for internal tools)

## Outputs

A Markdown audit report saved as `AUDIT_REPORT_<YYYY-MM-DD>.md` in the repository root (or a specified output path), containing:
1. Executive Summary
2. Current State Assessment (Strengths + Gaps)
3. Detailed Findings per category
4. Prioritized Recommendations (P1/P2/P3)
5. Stakeholder Questions
6. File Checklist (checked/missing)

## When To Use

- Before open-sourcing a private project
- Before a public product launch or blog post
- After adding a major feature or CLI command
- When onboarding a new contributor who reports confusion
- As part of a quarterly project health review
- When a project has been "heads-down" for a long time without doc updates

## When Not To Use

- For auditing code quality, security vulnerabilities, or performance (use dedicated tools)
- For auditing a single file's content quality (this audits presence + structural completeness, not prose quality)
- For projects with fewer than 3 files (not enough surface area to be useful)

## Steps

### 1. Gather Project Context

Read the following before starting the audit:
- Root `README.md` (if exists)
- `package.json` / `pyproject.toml` / `Cargo.toml` (to understand project type and scripts)
- `.gitignore` (to understand what is intentionally excluded)
- Top-level directory listing

Determine:
- Project type (library, CLI, web app, etc.)
- Primary language(s)
- Whether it's public/private/open-source

### 2. Run the File Checklist

Check for every file in `references/CHECKLIST.md`. For each file:
- ✅ **Present** — file exists and is non-empty (>10 lines)
- ⚠️ **Stub** — file exists but is essentially empty or has only placeholder content
- ❌ **Missing** — file does not exist

### 3. Assess Quality of Present Files

For files marked ✅ or ⚠️, check the quality criteria in `references/CHECKLIST.md`. Common checks:
- Does `README.md` have a Quick Start section?
- Does `README.md` document all CLI commands?
- Does `CONTRIBUTING.md` have branch naming and commit conventions?
- Does `LICENSE` have a copyright year and holder?
- Does `ARCHITECTURE.md` have at least one diagram (ASCII or otherwise)?

### 4. Score Each Gap

Use this severity scale:

| Severity | Criteria | Examples |
| --- | --- | --- |
| **Critical** | Blocks adoption, legal risk, or active confusion for new users | Missing LICENSE, no README Quick Start, no install instructions |
| **High** | Causes significant friction; users must read source code to proceed | No CLI docs, no troubleshooting guide, no environment variable docs |
| **Medium** | Reduces confidence or slows contributors; workarounds exist | No CONTRIBUTING.md, no architecture overview, no migration path |
| **Low** | Polish and completeness; minor friction only | No CHANGELOG, no issue templates, no versioning policy |

### 5. Write the Audit Report

Use the format in `references/REPORT_STANDARD.md`. Required sections in order:
1. Header (title, date, reviewer, status)
2. Executive Summary (2–4 sentences)
3. Current State Assessment
   - Strengths (what's already good — always include at least 2)
   - Gaps (numbered list with severity)
4. Detailed Findings (one subsection per gap category)
5. Prioritized Recommendations
   - P1: Critical/High — must fix before launch
   - P2: Medium — fix within first month
   - P3: Low — nice to have
6. Stakeholder Questions (unresolved decisions that block implementation)
7. Appendix: File Checklist

### 6. Save and Present

- Save the report as `AUDIT_REPORT_<YYYY-MM-DD>.md` in the project root
- State the output path clearly
- List the top 3 P1 items that need immediate attention
- Do **not** implement any fixes — this skill only audits; implementation is a separate step

## Verification

The audit is complete and correct when:
- [ ] Every file in the checklist has a ✅/⚠️/❌ status
- [ ] Every ❌ gap has a severity rating
- [ ] At least 2 strengths are identified (avoids demoralizing reports)
- [ ] P1 recommendations have effort estimates
- [ ] Stakeholder questions are phrased as decisions, not as observations
- [ ] The report is saved to disk and the path is stated

## Safety Rules

- **Never implement fixes during the audit** — only report findings
- **Never assign Critical severity to stylistic issues** — reserve Critical for blockers
- **Never omit strengths** — one-sided reports are less trusted and less acted on
- **Never expose secrets** — if you read a `.env` file during context gathering, do not include any values in the report
- **Keep the report factual** — base findings on what you can observe in the repo, not assumptions about the team's intentions
- **Flag uncertainty** — if you cannot determine whether a file is present (e.g., gitignored), mark it as ⚠️ Unknown rather than ❌ Missing
