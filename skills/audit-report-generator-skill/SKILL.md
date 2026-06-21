---
name: audit-report-generator-skill
description: Generates a comprehensive markdown report summarizing findings from repository audit skills, including compliance status, missing items, and prioritized remediation actions.
license: Apache-2.0
metadata:
  author: Danny
  version: "0.1"
---

# Audit Report Generator Skill

> [!NOTE]
> This skill is **developer‑facing** and produces a markdown report that can be displayed in CI logs or saved to a file. It does not push the report anywhere.

## Purpose
Consume the output objects from the other audit skills and render a human‑readable audit report that:
- Highlights ✅ passes, ❌ failures, and ⚠️ warnings.
- Provides actionable remediation suggestions.
- Includes a table of contents and sections for each audit area.

## Inputs
| Name | Type | Description |
|------|------|-------------|
| `repoName` | `string` | Human‑readable name of the repository being audited. |
| `auditData` | `object` | Aggregated audit results from other skills. Expected format: `{repoAnalyzer: {...}, contentEvaluator: {...}, codeQualityChecker: {...}, githubScanner: {...}}` |

## Outputs
| Name | Type | Description |
|------|------|-------------|
| `markdownReport` | `string` | Full markdown report ready to be written to a file or displayed. |

## When To Use
- At the end of a repository quality audit pipeline to present results.
- In CI to fail a job based on report contents.

## When Not To Use
- When you need a JSON‑only report; use a custom formatter instead.

## Steps
1. Validate the presence of required sections in `auditData`.
2. For each skill result, create a markdown subsection with a summary table.
3. Compile a **Summary** section with overall pass/fail status.
4. Append a **Remediation** checklist with prioritized actions.
5. Return the concatenated markdown string.

## Verification
- Run the skill with mock data where all checks pass and verify the `✅` symbols appear.
- Run with a missing `CODEOWNERS` entry and verify a ❌ entry appears in the GitHub scan section.

## Safety Rules
- Do not write any files; output is returned as a string.
- Do not disclose any sensitive tokens present in the input data.
