# Openfy Documentation & Discoverability Audit Report
**Date**: June 21, 2026
**Reviewer**: Agent Analysis
**Status**: Findings & Recommendations (No Implementation Plan)

## Executive Summary
An audit of the Openfy repository reveals a highly functional underlying suite with clean code separation, but significant discoverability and usability gaps for new adopters. The primary deficiencies are a complete absence of license clarity, missing migration and architecture guides, undocumented CLI options, and a lack of troubleshooting references. Resolving these documentation gaps is critical for enabling developers to adopt and contribute to Openfy.

---

## Current State Assessment

### Strengths
- **Clean Structure**: The root `README.md` clearly outlines the project structure and explains the difference between the `creator-factory` and the `open-source-push` folders.
- **Easy Quick Start**: Step-by-step installation instructions and CLI execution scripts are documented with exact shell commands.
- **Project-Agnostic Audit Foundation**: The `open-source-push` folder has its own `README.md` that clearly defines personal vs. public file separations.
- **Comprehensive Inline Types**: Code modules in the shared package and main-agent directory have strong TypeScript types, serving as implicit documentation for developers.

### Gaps
1. **Missing Root License (Severity: High)**: No license file exists at the root, creating legal ambiguity for open-source reuse.
2. **Missing Architecture Guide (Severity: Medium)**: Lack of structural documentation on how the packages communicate via workspaces and MCP.
3. **No Troubleshooting Reference (Severity: High)**: Common execution hurdles (e.g., CLI rate-limits, missing PACT tools) are undocumented.
4. **No CLI Help / Usage Flags (Severity: Medium)**: CLI tools do not support `--help` or parameter explanation outputs.
5. **No Migration Pathway Guide (Severity: High)**: Lack of details on how a traditional Apify user transitions to using Openfy's Pilot templates.
6. **Undocumented Template Customization (Severity: Medium)**: No guidance on how to extend the factory with new custom templates.
7. **No Pay-Per-Event (PPE) Cost-Modeling Docs (Severity: High)**: Event monetization setup lacks cost/revenue estimation templates.
8. **Missing Contribution Guidelines (Severity: Medium)**: No guidelines exist for branch naming, testing, or submitting pull requests.
9. **Missing Release & Versioning Policy (Severity: Low)**: Breaking change policies and version schemas are undocumented.
10. **Cryptic Schema Auditing Rules (Severity: Low)**: No documentation explains the requirements for input/output schema validation.

---

## Detailed Findings

### 1. README Completeness
- **Current**: The root README provides basic structure definitions, prerequisites, quick-start commands, and a high-level overview of the sanitization features.
- **Missing**: Detailed prerequisites (e.g., required Node versions for dependencies, macOS tools like `sips` for PNG conversions) and explanations of the configuration parameters in `.env.example`.
- **Impact**: Developers starting on non-macOS platforms or without all environment keys set will face silent build failures or cryptic errors during tool execution.

### 2. Architecture & Design Transparency
- **Current**: The repository organizes directories into `creator-factory` (for building actors) and `open-source-push` (for cleaning repositories).
- **Missing**: A dedicated `ARCHITECTURE.md` describing how the shared workspace compiles and exports code, why the repository is split, and how local tools communicate with the MCP server.
- **Impact**: High learning curve for developers wanting to modify creator-factory core logic, leading to duplicate code implementations.

### 3. Onboarding & Migration
- **Current**: Adopters are instructed to clone the repo, install dependencies, and run scripts.
- **Missing**: A step-by-step guide explaining how developers migrate existing Apify Console Actors into Openfy, and how the Openfy templates align with vanilla Apify SDK structures.
- **Impact**: Apify developers cannot easily migrate legacy setups to the "Pilot Family" design format, limiting platform transition.

### 4. API / CLI Documentation
- **Current**: Quick start points users to `npm run main-agent` and `npm run sync-store`.
- **Missing**: Documentation of supported options, environment toggles (e.g., `USE_APIFY_CREATE`, `PACT_USE_APIFY_RUN`), and CLI help outputs.
- **Impact**: Users must read source code files in `src/main-agent/mainFlow.ts` to discover configurable parameters and feature boundaries.

### 5. Examples & Recipes
- **Current**: The code scaffolding generates default reports and basic inputs inside generated actors.
- **Missing**: Real-world walkthroughs of deploying an Actor to production, setting up pay-per-event pricing in Apify, and integrating the resulting MCP server with Claude Desktop.
- **Impact**: Developers understand how to generate code but cannot confidently configure store metadata or connect it to external AI agents.

### 6. Ecosystem Maturity Signals
- **Current**: A basic repository-wide CHANGELOG with placeholder entries exists.
- **Missing**: A standard `LICENSE` file, `CONTRIBUTING.md`, issue templates, and a documented breaking-change policy.
- **Impact**: Enterprise users and open-source contributors cannot verify compliance or follow standard contribution pathways, hindering community growth.

---

## Prioritized Recommendations

### Priority 1 (Critical for discoverability)
- **Recommendation**: Create a root-level `LICENSE` file and establish explicit licensing terms.
- **Rationale**: Unblocks commercial and open-source adoption by resolving intellectual property ambiguity.
- **Effort**: Low (1 hour)
- **Owner**: root

- **Recommendation**: Create a `MIGRATION_GUIDE.md` detailing step-by-step how to move existing vanilla Apify scripts into Openfy’s templates.
- **Rationale**: Decreases user onboarding friction and demonstrates immediate utility for active Apify users.
- **Effort**: Medium (4-6 hours)
- **Owner**: creator-factory

### Priority 2 (Improves usability)
- **Recommendation**: Create a `TROUBLESHOOTING.md` guide that documents how to diagnose compilation issues, handle Apify Store rate limits, and resolve missing environment keys.
- **Rationale**: Empowers developers to self-solve common environment/execution failures.
- **Effort**: Medium (3-5 hours)
- **Owner**: root

- **Recommendation**: Document the Pay-Per-Event (PPE) monetization scheme and provide a basic sheet for cost modeling.
- **Rationale**: Helps developers calculate platform markup and price their tools sustainably.
- **Effort**: Medium (4 hours)
- **Owner**: creator-factory

### Priority 3 (Nice to have)
- **Recommendation**: Write a detailed `ARCHITECTURE.md` outlining the workspace package relationships and the role of the MCP wrapper templates.
- **Rationale**: Helps external contributors understand the system design and extend the Model Context Protocol features.
- **Effort**: Medium (5-8 hours)
- **Owner**: root

- **Recommendation**: Add standard issue templates (bug reports, feature requests) and a `CONTRIBUTING.md` outline.
- **Rationale**: Implements open-source standards to foster community participation.
- **Effort**: Low (2 hours)
- **Owner**: root

---

## Questions for Stakeholder
1. **Target License**: What specific open-source license (e.g., MIT, Apache-2.0, GPL-3.0) should be applied to the root repository, and do sub-packages require separate licenses?
2. **Compatibility Policy**: What is the minimum supported Node.js version, and are there dependencies (like macOS `sips` for anti-aliasing) that restrict deployment to specific operating systems?
3. **Monetization Scope**: Should Openfy include automated pricing calculators/estimations in the store-sync flow, or is cost management intended to remain external to the code?

---

## Appendix: File Checklist
- [ ] LICENSE (root level) — **MISSING**
- [ ] CONTRIBUTING.md — **MISSING**
- [ ] ARCHITECTURE.md — **MISSING**
- [ ] TROUBLESHOOTING.md — **MISSING**
- [ ] EXAMPLES.md (root level) — **MISSING** (only exists inside generated actor subfolders)
- [ ] CLI_REFERENCE.md — **MISSING**
- [ ] MIGRATION_GUIDE.md — **MISSING**
