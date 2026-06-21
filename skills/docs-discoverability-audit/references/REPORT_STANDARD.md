# Audit Report Standard

This document defines the canonical structure for reports produced by the `docs-discoverability-audit` skill.

---

## File Naming

```
AUDIT_REPORT_<YYYY-MM-DD>.md
```

Saved in the root of the audited repository (or a specified output path).

---

## Required Report Structure

```markdown
# <Project Name> Documentation & Discoverability Audit Report
**Date**: <Month DD, YYYY>
**Reviewer**: <Agent name or human name>
**Scope**: <what was audited — e.g., "root documentation and GitHub community health files">
**Status**: Findings & Recommendations (No Implementation Plan)

---

## Executive Summary

2–4 sentences. State: (1) what the project is, (2) the overall documentation health verdict, 
(3) the most critical gap, and (4) what resolving it would unlock.

---

## Current State Assessment

### Strengths
- **<Strength 1>**: Brief explanation of what's already good.
- **<Strength 2>**: Brief explanation.
(minimum 2 strengths required)

### Gaps
1. **<Gap title> (Severity: <Critical|High|Medium|Low>)**: One-line description.
2. ...
(number all gaps; this list is referenced in Detailed Findings and Recommendations)

---

## Detailed Findings

One subsection per gap category (not per file). Group related gaps together.

### 1. <Category Name>
- **Current**: What exists now.
- **Missing**: What is absent or insufficient.
- **Impact**: What breaks or is blocked without this.

### 2. <Category Name>
...

---

## Prioritized Recommendations

### Priority 1 (Critical — fix before launch or open-sourcing)
- **Recommendation**: Specific action to take.
  - **Rationale**: Why this is P1.
  - **Effort**: <Low|Medium|High> (~X hours)
  - **Owner**: <root|package-name|person>

### Priority 2 (High — fix within first month)
...

### Priority 3 (Medium/Low — nice to have)
...

---

## Questions for Stakeholder

Numbered list of decisions that are unresolved and block implementation. 
Phrased as questions, not observations.

1. **<Topic>**: <Question>?
2. ...

---

## Appendix: File Checklist

| File | Status | Notes |
| --- | --- | --- |
| `LICENSE` | ✅ Present / ⚠️ Stub / ❌ Missing / ⚠️ Unknown | |
| `README.md` | | |
| `CONTRIBUTING.md` | | |
| `CHANGELOG.md` | | |
| `ARCHITECTURE.md` | | |
| `TROUBLESHOOTING.md` | | |
| `.env.example` | | |
| `.gitignore` | | |
| `.github/ISSUE_TEMPLATE/bug_report.md` | | |
| `.github/ISSUE_TEMPLATE/feature_request.md` | | |
| CLI Reference | | |
| Migration Guide | | |
| Examples | | |
```

---

## Tone Guidelines

- **Factual, not editorial**: State what is present or missing. Avoid words like "terrible", "completely broken", "perfect".
- **Strengths are mandatory**: Always open with what works. One-sided negative reports are ignored.
- **Concrete over vague**: "Missing LICENSE" is correct. "Legal issues" is vague. "No Quick Start section in README.md" is correct. "README needs work" is vague.
- **Questions, not demands**: Stakeholder questions should feel like decisions to be made, not criticism.

---

## Status Values

| Status | Meaning |
| --- | --- |
| `Findings & Recommendations (No Implementation Plan)` | Default. Audit complete; no fixes applied. |
| `Implementation In Progress` | Fixes are being applied based on this report. |
| `Resolved` | All P1 and P2 items addressed; report archived. |
