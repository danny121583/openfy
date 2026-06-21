# OSS-Push — Open Source Preparation & Sanitization Framework

OSS-Push is a project-agnostic framework designed to help developers and AI agents safely audit, sanitize, document, and package software repositories for public open-source publication on platforms like GitHub.

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [How to Use the Framework](#how-to-use-the-framework)
4. [Auditing Guide (Personal vs. Public Files)](#auditing-guide-personal-vs-public-files)
5. [Writing Clean Documentation](#writing-clean-documentation)
6. [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)

---

## Overview

When open-sourcing a project, there is a high risk of exposing credentials, localized paths, or internal testing histories. This framework isolates these risks by defining:
- **Sanitization Agents**: Autonomously sweeps files to strip keys and local folders.
- **Gitignore Generator**: Ensures sensitive logs and local files are never tracked.
- **Outcome-Oriented Documentation Rules**: Creates professional READMEs without platform-specific monetization references.

---

## Prerequisites

To use this framework with an AI coding assistant (like Antigravity or Cline) or run the checks manually:
1. Copy the `open-source-push/` directory into the root of your project.
2. Standard Unix tools (`grep`, `find`, `sed`) or Python 3.x should be available for executing sweeps.

---

## How to Use the Framework

### 1. Repository Sanitization (Sweep Secrets & Local Paths)
Run a recursive search command to verify no sensitive usernames, localized paths, or keys remain in the repository:
```bash
grep -rn "your-secret-key" ./ --exclude-dir=node_modules --exclude-dir=.git
```

### 2. Gitignore Enforcement
Create a `.gitignore` at the repository root containing at minimum:
```gitignore
# Local Secrets & Tokens
.env
.env.*
auth.json
*.pem
*.key

# Large Builds & Packages
node_modules/
dist/
build/
target/

# OS-Specific
.DS_Store
Thumbs.db
```

---

## Auditing Guide (Personal vs. Public Files)

Before publishing, separate your code into what is public-facing and what is private:

| Directory/File | Destination / Status | Rationale |
| :--- | :--- | :--- |
| `/src/` | **Push** | Core logic, libraries, and utilities. |
| `/tests/` | **Push** | Unit and integration tests (ensure no mock credentials are baked in). |
| `package.json` | **Push** | Standard dependency lists. |
| `.env` | **Ignore** | Live API keys, payment configurations, and server passwords. |
| `reports/`, `logs/` | **Ignore** | Contains local execution summaries and runtime traces. |
| `*.db`, `*.sqlite` | **Ignore** | Local databases populated with user or test data. |

---

## Writing Clean Documentation

A clean, user-facing README should satisfy these constraints:
1. **Outcome-First Description**: Focus on the business value and what target users achieve (not creator-only setup features).
2. **How It Works Flow**: Step-by-step sequential overview of data/processing pipeline.
3. **No Monetization/Pricing References**: Pricing or platform-specific charges must be managed via the storefront/host console and redacted from open-source codebase READMEs.

---

## Frequently Asked Questions (FAQ)

#### Q: How do I handle localized file paths (e.g. `/Users/danny/Desktop/...`)?
**A**: Never hardcode absolute user paths. Always resolve paths relative to the project root using standard path libraries (e.g. `path.resolve(__dirname, ...)` in Node.js, or `os.path.abspath` in Python).

#### Q: What if I need to provide an example API token or email in documentation?
**A**: Use standard generic placeholders:
- Email: `user@example.com` or `your-email@gmail.com`
- Token: `<YOUR_API_KEY>` or `abc123xyz`

#### Q: How can I verify that my `.gitignore` is working correctly?
**A**: Run `git status --ignored` in your shell to see exactly which files Git is ignoring vs. tracking before you run `git add`.
