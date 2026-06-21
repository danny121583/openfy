# Universal Documentation Checklist

This checklist is used by the `docs-discoverability-audit` skill. Files are weighted by project type and audience.

---

## Legend

| Symbol | Meaning |
| --- | --- |
| 🔴 Critical | Required for any public/open-source project |
| 🟠 High | Required for any project with external contributors or users |
| 🟡 Medium | Strongly recommended; skipping causes friction |
| 🟢 Low | Nice to have; polish and completeness |
| `[OSS]` | Weighted higher for open-source audience |
| `[CLI]` | Weighted higher for CLI tools |
| `[API]` | Weighted higher for APIs/SDKs |

---

## Root-Level Files

| File | Severity | Quality Criteria |
| --- | --- | --- |
| `README.md` | 🔴 Critical | Must have: project description, install steps, at least one usage example, link to docs |
| `LICENSE` | 🔴 Critical `[OSS]` | Must be a recognized SPDX license with a copyright year and holder name |
| `CONTRIBUTING.md` | 🟠 High `[OSS]` | Must have: branch naming, commit format, how to run tests, PR process |
| `CHANGELOG.md` | 🟡 Medium | Must use Keep a Changelog or Conventional Commits format; must not be empty |
| `ARCHITECTURE.md` | 🟡 Medium | Must have at least one diagram (ASCII or image) and describe top-level component relationships |
| `TROUBLESHOOTING.md` | 🟠 High | Must document at least 5 concrete failure modes with diagnostic steps and solutions |
| `SECURITY.md` | 🟡 Medium `[OSS]` | Should describe how to report vulnerabilities and expected response time |
| `.env.example` | 🟠 High | Must list every environment variable with a description; must not contain real values |
| `.gitignore` | 🟠 High | Must exclude `node_modules`, `.env`, `dist`, `build`, `*.log` at minimum |

---

## GitHub Community Health Files

| File | Severity | Quality Criteria |
| --- | --- | --- |
| `.github/ISSUE_TEMPLATE/bug_report.md` | 🟡 Medium `[OSS]` | Must ask for: steps to reproduce, expected vs actual, environment info |
| `.github/ISSUE_TEMPLATE/feature_request.md` | 🟡 Medium `[OSS]` | Must ask for: problem statement, proposed solution, alternatives |
| `.github/PULL_REQUEST_TEMPLATE.md` | 🟢 Low | Should ask for: what changed, how tested, checklist |
| `.github/CODEOWNERS` | 🟢 Low | Useful when project has distinct module owners |

---

## CLI / Script Documentation

| File / Section | Severity | Quality Criteria |
| --- | --- | --- |
| CLI reference (any name) | 🟠 High `[CLI]` | Every runnable command must be documented with: purpose, flags, env vars, example invocation |
| `README.md` Quick Start | 🔴 Critical | Must show the exact commands to go from clone → working output |
| `README.md` environment variable table | 🟠 High | Must list: variable name, required/optional, description, example value |
| `README.md` CLI table | 🟡 Medium `[CLI]` | Summary table of all scripts with purpose and key flags |

---

## API / SDK Documentation

| File / Section | Severity | Quality Criteria |
| --- | --- | --- |
| API reference | 🟠 High `[API]` | All public endpoints/methods documented with: input types, output types, example request/response |
| Authentication docs | 🔴 Critical `[API]` | Must explain how to obtain credentials and pass them in requests |
| Rate limiting docs | 🟡 Medium `[API]` | Must describe limits and what happens when exceeded |
| Error codes reference | 🟡 Medium `[API]` | Must list common error codes with causes and remediation |

---

## Migration & Onboarding

| File | Severity | Quality Criteria |
| --- | --- | --- |
| Migration guide | 🟡 Medium | Required if the project is a successor to or replacement for another tool; must show before/after |
| Getting started guide | 🟡 Medium | Step-by-step for new users; distinct from Quick Start (more detailed) |
| Examples directory / file | 🟡 Medium | At least 3 concrete, runnable examples |

---

## Monetization / Pricing (for commercial tools)

| File | Severity | Quality Criteria |
| --- | --- | --- |
| Pricing documentation | 🟡 Medium | Must explain: billing model, what triggers charges, how to estimate costs |
| Cost modeling guide | 🟢 Low | Nice to have: worked examples with numbers users can adapt |

---

## Quality Criteria for README.md (detailed)

A `README.md` passes if it contains all of:
- [ ] A one-sentence project description (what it does + who it's for)
- [ ] Badges (optional but signals maturity): CI status, license, npm/pip version
- [ ] **Prerequisites** section: exact versions of required runtimes/tools
- [ ] **Install** section: exact commands, for all supported platforms if they differ
- [ ] **Quick Start** section: from zero to working output in ≤5 commands
- [ ] **Configuration** section: all environment variables or config files
- [ ] **Usage** section: at least one full example with input and output
- [ ] **Contributing** link or inline guidance
- [ ] **License** statement with link to `LICENSE` file

A `README.md` is marked ⚠️ Stub if it exists but is missing more than 3 of the above items.
