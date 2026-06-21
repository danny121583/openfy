# Openfy — Open Source Apify Alternative

Openfy is an open-source factory suite designed for building, testing, auditing, and publishing premium, monetizable Apify Actors. It provides an automated development workflow to programmatically validate, package, monetize, and deploy scrapers, AI agents, and integration workflows.

---

## 📦 Features

- **Automated Actor Creator Factory**: Scaffold, run PACT tests, audit schemas, and deploy actors programmatically.
- **Pay-Per-Event (PPE) Orchestration**: Out-of-the-box configuration helpers for monetization.
- **True PNG App Icon Pipeline**: Standardize and generate premium App Store style PNG icons using anti-aliasing masks.
- **Open-Source Sanitization & Push (OSS-Push)**: A project-agnostic auditing framework to scan repositories, sanitize secrets, enforce portable paths, and output clean documentation.

---

## 🗂 Repository Structure

```
├── creator-factory/       # Core App/API for generating, testing, & syncing actors
│   ├── src/               # Main logic, CLI scripts, and local MCP server
│   ├── templates/         # Actor boilerplate templates (ts-beeai-agent, etc.)
│   └── package.json       # Dependencies & runner scripts
├── open-source-push/      # Project-agnostic repository sanitization framework
│   ├── README.md          # OSS-Push guides & best practices
│   └── CHANGELOG.md       # OSS-Push version history
├── .gitignore             # Production exclusions (ignores generated runs & harness artifacts)
├── README.md              # Root repository documentation (this file)
└── CHANGELOG.md           # Repository-wide changelog
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **Apify CLI** (for local actor testing and pushing)
  ```bash
  npm install -g apify-cli
  ```

### 2. Install Dependencies
Initialize and install packages for the creator factory:
```bash
cd creator-factory
npm install
```

### 3. Configure Environment
Copy the example environment file and update it with your credentials:
```bash
cp .env.example .env
```
Ensure you have the required variables configured (e.g. `APIFY_TOKEN`, `OPENAI_API_KEY`).

### 4. Run the Main Agent
To run the automated agent pipeline that designs, tests, and prepares actors in sequence:
```bash
npm run main-agent
```

### 5. Synchronize the Store
To programmatically apply store configurations, event pricing, categories, and sync assets:
```bash
npm run sync-store
```

---

## 🔒 Open Source Sanitization (OSS-Push)

Openfy includes the `open-source-push` tool suite. Before publishing your code or forks, use the framework in `open-source-push/` to audit and clean your files:
1. **Sweep Secrets**: Run regex or string sweeps to ensure no private tokens or local directories (e.g. `/Users/...`) are exposed.
2. **Review Gitignore**: Enforce exclusions for local SQLite databases, run reports, and package builds.

For detailed auditing guidelines and setup, see [open-source-push/README.md](file:///Users/danny/Desktop/apify/open-source-push/README.md).

---

## 📜 License

This project is open-source. For license details, please see the respective folders.
