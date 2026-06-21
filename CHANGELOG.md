# Changelog — Openfy

All notable changes to the Openfy suite will be documented in this file.

## [1.1.0] — 2026-06-21

### Added
- **LICENSE**: Added MIT License (`LICENSE`) with copyright holder Daniel Lozano.
- **CONTRIBUTING.md**: Contribution guidelines covering fork/branch workflow, conventional commits, code quality standards (TypeScript strict, JSDoc), and areas open for community contribution.
- **ARCHITECTURE.md**: Full system architecture guide with ASCII diagram, workspace structure breakdown, PACT loop explanation, quality gate details, OraclePilot/MCP server descriptions, and extension points for new templates, audit rules, and LLM providers.
- **TROUBLESHOOTING.md**: Comprehensive troubleshooting reference covering 12+ failure modes across environment setup, CLI execution, schema validation, and platform-specific issues (macOS, Windows, Linux).
- **creator-factory/CLI_REFERENCE.md**: Full CLI reference for all `npm run` scripts (`main-agent`, `sync-store`, `mcp-start`, `dev`, `test`, `typecheck`) including all environment variable toggles and `.env` documentation.
- **creator-factory/MIGRATION_GUIDE.md**: Step-by-step guide for migrating vanilla Apify actors to Openfy's Pilot Family structure, with before/after code examples, schema migration patterns, and 7 documented common pitfalls.
- **creator-factory/PPE_MONETIZATION_GUIDE.md**: Pay-Per-Event cost modeling guide with a revenue calculator table, 4 pricing strategies, sync-store PPE configuration documentation, and FAQ.
- **.github/ISSUE_TEMPLATE/bug_report.md**: GitHub bug report template with environment fields, log collection instructions, and `.env` safety guidance.
- **.github/ISSUE_TEMPLATE/feature_request.md**: GitHub feature request template with problem statement, proposed solution, use case table, and implementation ideas sections.

### Changed
- **README.md**: Added Supported Platforms section (macOS, Windows, Linux), CLI quick-reference table, License section with link to `LICENSE`, and links to all new documentation files.

## [1.0.0] — 2026-06-20

### Added
- **Openfy Creator Factory**: Integrated core platform for generating, building, local PACT testing, and programmatically syncing/monetizing Apify Actors.
- **True PNG App Icon Pipeline**: Standardized and processed premium App Store style PNG icons using macOS `sips` and anti-aliasing masks.
- **Open-Source Sanitization (OSS-Push)**: Integrated project-agnostic framework inside `open-source-push/` to audit and package repos securely before publishing to GitHub.
- **Root Documentation**: Added root `README.md` and `CHANGELOG.md` describing project setup and instructions.
- **Gitignore Policies**: Configured root gitignore to exclude private actor runs, local database files, logs, and development harness directories.
