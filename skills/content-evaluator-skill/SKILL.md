---
name: content-evaluator-skill
description: Parses markdown files and validates the presence of required sections and content completeness for the repository quality audit.
license: Apache-2.0
metadata:
  author: Danny
  version: "0.1"
---

# Content Evaluator Skill

**Purpose**: Examine markdown documents (e.g., README.md, ARCHITECTURE.md) and verify that mandatory sections exist and meet minimal content criteria.

## Inputs
- `file_path` (string): Absolute path to the markdown file to evaluate.
- `required_sections` (array of strings): List of section headings that must be present (e.g., `["## License", "## Quick Start"]`).
- `min_word_counts` (object, optional): Mapping of section heading to minimal word count, e.g., `{"## Quick Start": 50}`.

## Outputs
- `missing_sections` (array of strings): Sections that were not found.
- `incomplete_sections` (array of strings): Sections that exist but fall below the word count threshold.
- `section_word_counts` (object): Actual word counts per evaluated section.

## When To Use
- Validating documentation completeness during a repo audit.
- Enforcing documentation standards on PRs.

## When Not To Use
- Non‑markdown files (use other tooling).

## Steps
1. Read the file content.
2. Parse headings (lines starting with `#`).
3. For each `required_section`, check existence.
4. If `min_word_counts` supplied, compute word count for the section body.
5. Populate output structures.

## Verification
- The skill returns an empty `missing_sections` array only when every required heading exists.
- Word count thresholds are enforced precisely.

## Safety Rules
- Do not read files larger than 5 MiB (abort with an error).
- Ensure the file encoding is UTF‑8.
