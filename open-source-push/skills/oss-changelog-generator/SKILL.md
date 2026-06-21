---
name: oss-changelog-generator
description: Generates, formats, and updates semantic changelogs (CHANGELOG.md) for open-source projects using Keep a Changelog standards.
---

# Open Source Changelog Generator

## Purpose
Establishes clear, readable, and structured version changelogs following Keep a Changelog standards and semantic versioning (SemVer) guidelines.

## Inputs
- `version`: The release version number (e.g. `1.0.0`).
- `releaseDate`: The date of release (defaults to today).
- `changes`: Categories of updates:
  - `Added` (new features)
  - `Changed` (changes in existing behavior)
  - `Deprecated` (soon-to-be-removed features)
  - `Removed` (removed features)
  - `Fixed` (bug fixes)
  - `Security` (vulnerability fixes)

## Outputs
- `CHANGELOG.md` file updated in place.

## When To Use
- Right before tagging a new release.
- During release audits when updating documentation across actors or packages.

## Steps
1. **Initialize Format**: Ensure the file contains:
   - `# Changelog` heading.
   - An explanation of the standard used (e.g. "All notable changes to this project will be documented...").
2. **Version Section Scaffolding**: Add/update the version entry:
   - `## [version] - YYYY-MM-DD`
3. **Change Classification**: Sort and format the inputs into bullet lists under the categories (Added, Changed, Fixed, etc.).
4. **Platform Syncing**: If deploying to platforms like Apify or NPM, copy `CHANGELOG.md` to `.actor/CHANGELOG.md` or equivalent destination paths to keep platforms in sync.

## Safety Rules
- Do not list private issue numbers or internal branch names in public changelogs; summarize changes in user-centric language.
