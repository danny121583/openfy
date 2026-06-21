# Openfy Troubleshooting Guide

Common failure modes with step-by-step diagnostics and fixes.

---

## Table of Contents

1. [Environment & Setup](#1-environment--setup)
2. [CLI Execution](#2-cli-execution)
3. [Schema Validation](#3-schema-validation)
4. [Platform-Specific Issues](#4-platform-specific-issues)
5. [Getting Help](#5-getting-help)

---

## 1. Environment & Setup

### ❌ `APIFY_TOKEN` is missing or invalid

**Symptom**: Running `npm run main-agent` or `apify push` exits immediately with an authentication error or "Actor push requires login" message.

**Diagnosis**:
```bash
echo $APIFY_TOKEN              # Should print your token (not empty)
apify info                     # Should show your logged-in account
```

**Fix**:
1. Go to [https://console.apify.com/account/integrations](https://console.apify.com/account/integrations)
2. Copy your **Personal API Token**
3. Open `creator-factory/.env` and add:
   ```
   APIFY_TOKEN=apify_api_xxxxxxxxxxxxxxxx
   ```
4. Alternatively, log in via CLI:
   ```bash
   apify login
   ```

---

### ❌ `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is missing

**Symptom**: Actor generation completes but AI-enriched content is generic/placeholder. The log shows:
```
AI analysis requested but no AI key is configured. Continuing with deterministic output.
```

**Note**: This is a **soft failure** — the actor will still generate and pass PACT tests without an AI key. AI enrichment is optional.

**Fix**: Add the relevant key to `creator-factory/.env`:
```
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

The `OraclePilot` concept validator uses whichever key is available. If neither is set, concept validation is skipped and deterministic output is used throughout.

---

### ❌ `GITHUB_TOKEN` is missing

**Symptom**: The main agent's store research step fails or returns empty results when trying to scan GitHub repositories for API coverage gaps.

**Fix**: Create a GitHub personal access token (no scopes required for public repo access):
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a new classic token with `public_repo` scope
3. Add to `creator-factory/.env`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
   ```

---

### ❌ Node modules not installed

**Symptom**: Running any `npm run` script in `creator-factory/` fails with:
```
Error: Cannot find module '...'
```

**Diagnosis**:
```bash
ls creator-factory/node_modules   # Should exist and contain packages
node --version                    # Must be v18.0.0 or higher
```

**Fix**:
```bash
cd creator-factory
npm install
```

If you see peer dependency conflicts:
```bash
npm install --legacy-peer-deps
```

---

### ❌ Node.js version too old

**Symptom**: `npm install` or `tsx` scripts fail with syntax errors or "ERR_UNSUPPORTED_ESM_URL_SCHEME".

**Diagnosis**:
```bash
node --version   # Must be >= 18.0.0
```

**Fix**: Install Node.js v20 LTS (recommended) via [https://nodejs.org](https://nodejs.org) or using a version manager:
```bash
# Using nvm
nvm install 20
nvm use 20

# Using fnm (faster)
fnm install 20
fnm use 20
```

---

## 2. CLI Execution

### ❌ `npm run main-agent` fails with a cryptic error

**Symptom**: The script crashes early with a TypeScript or module resolution error.

**Diagnosis steps**:
```bash
# Step 1: Verify TypeScript compiles cleanly
cd creator-factory
npm run typecheck:main-agent

# Step 2: Check the tsx version
npx tsx --version

# Step 3: Run with Node debug output
NODE_OPTIONS='--stack-trace-limit=50' npm run main-agent
```

**Common causes**:
- Missing `node_modules` → run `npm install`
- Wrong Node.js version → upgrade to v18+
- Corrupted lock file → delete and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

### ❌ `npm run main-agent` generates 0 actors

**Symptom**: The run completes but no folders appear in `generated-actors/`.

**Cause**: The `actorIdeaSelector` rejected all ideas as duplicates of existing actors in the registry.

**Diagnosis**:
```bash
cat creator-factory/reports/actor-registry.json | grep '"status"'
ls creator-factory/generated-actors/
cat creator-factory/reports/main-agent-runs/*/selected-actors.md 2>/dev/null | head -30
```

**Fix**: The selector avoids rebuilding actors already in the registry. To force fresh ideas, temporarily rename or empty the registry:
```bash
mv creator-factory/reports/actor-registry.json creator-factory/reports/actor-registry.json.bak
npm run main-agent
```

---

### ❌ `npm run sync-store` doesn't update the Apify Store

**Symptom**: Running sync-store exits with no errors but the Store listing looks unchanged.

**Common causes and fixes**:

| Cause | Diagnostic | Fix |
| --- | --- | --- |
| `APIFY_TOKEN` missing | `echo $APIFY_TOKEN` returns empty | Add token to `.env` |
| `APIFY_UI_TOKEN` missing (icon upload) | Log shows "Skipping icon upload" | Add `APIFY_UI_TOKEN` to `.env` |
| Actor not in registry | Registry `status` ≠ `"pushed"` | Push the actor first via `apify push` |
| Monthly pricing update limit | API returns 429 | Wait 30 days or skip pricing update |
| Daily publication limit (5/day) | API returns rate limit error | Wait 24h, then re-run `npm run sync-store` |

**Verbose run**:
```bash
cd creator-factory
DEBUG=* npm run sync-store 2>&1 | head -100
```

---

### ❌ PACT tests fail during actor generation

**What is PACT?** The PACT (Plan → Act → Check → Test) loop runs five commands against every generated actor:
1. `npm install`
2. `npm run build`
3. `npm test`
4. `npm run lint`
5. `apify run`

**Symptom**: The run log shows:
```
[main-agent] my-actor-slug: PACT failed
```
And a `pact-test-report.md` is written to `generated-actors/<slug>/reports/`.

**Diagnosis**:
```bash
cat creator-factory/generated-actors/<slug>/reports/pact-test-report.md
```

**Common PACT failures**:

| Failure | Cause | Fix |
| --- | --- | --- |
| `npm install` exits non-zero | Network issue or npm registry down | Retry; check network |
| `npm run build` fails | TypeScript error in generated code | Check `tsconfig.json` settings |
| `npm test` fails | Test assertion mismatch | Check `test/run-tests.js` output |
| `apify run` fails | Missing `storage/key_value_stores/default/INPUT.json` | Re-run the flow; file is auto-created |
| `apify run` fails | Apify CLI not installed | `npm install -g apify-cli` |

The main agent retries PACT up to 10 times (configurable via `MAIN_AGENT_MAX_ATTEMPTS`).

---

### ❌ MCP server fails to start

**Symptom**: `npm run mcp-start` exits immediately or hangs.

**Diagnosis**:
```bash
cd creator-factory
npm run typecheck:mcp    # Check for TypeScript errors first
npm run mcp-start        # Then try again
```

**Common causes**:
- Port already in use → kill the existing process:
  ```bash
  lsof -ti :3000 | xargs kill -9
  ```
- Missing `@modelcontextprotocol/sdk` → run `npm install`
- `APIFY_TOKEN` missing → the MCP server needs it to call Apify APIs

---

## 3. Schema Validation

### ❌ `apify validate-schema` fails

**Symptom**: Running schema validation returns errors like:
```
ValidationError: Property 'X' is missing required field 'editor'
```

**Always run with telemetry disabled** to prevent the CLI from hanging on stdin:
```bash
APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema
```

**Common schema errors and fixes**:

| Error | Cause | Fix |
| --- | --- | --- |
| Missing `editor` field | Every input property needs an `editor` | Add `"editor": "textfield"` (or appropriate type) |
| Wrong `editor` for type | `boolean` uses `"editor": "checkbox"` | Match editor to type (see table below) |
| `actorOutputSchemaVersion` missing | Output schema lacks version field | Add `"actorOutputSchemaVersion": 1` |
| `$schema` URL wrong | Outdated schema URL | Use `https://apify-projects.github.io/actor-json-schemas/output.json?v=0.3` |
| `required` array missing | Input schema has no `required` key | Add `"required": ["startUrls"]` (or whichever fields are required) |

**Editor type mapping**:

| JSON type | `editor` value |
| --- | --- |
| `string` (free text) | `"textfield"` |
| `string` (enum/dropdown) | `"select"` |
| `integer` / `number` | `"number"` |
| `boolean` | `"checkbox"` |
| `array` (start URLs) | `"requestListSources"` |
| `array` / `object` (other) | `"json"` |
| proxy config | `"proxy"` |

---

### ❌ `actor.json` is rejected on push

**Symptom**: `apify push` exits with a schema validation error about `actor.json`.

**Required fields in `.actor/actor.json`**:
```json
{
  "actorSpecification": 1,
  "name": "my-actor-slug",
  "title": "My Actor Title",
  "description": "Max 240 characters.",
  "version": "0.1",
  "dockerfile": "../Dockerfile",
  "dockerContextDir": "..",
  "input": "./input_schema.json",
  "output": "./output_schema.json"
}
```

**Common mistakes**:
- `description` exceeds 240 characters → truncate it
- `input`/`output` paths are relative to the `.actor/` folder — use `./` prefix
- `name` contains uppercase letters → must be all lowercase with hyphens

---

## 4. Platform-Specific Issues

### macOS

**Verify `sips` is available** (required for the icon pipeline):
```bash
which sips         # Should output: /usr/bin/sips
sips --version     # Should output version info
```

`sips` is a built-in macOS tool — it should always be available. If it's missing, your macOS installation may be damaged. Try:
```bash
xcode-select --install
```

**Permission denied on `npm install`**:
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

---

### Windows

The icon anti-aliasing pipeline uses `sips` by default, which is **not available on Windows**. You must install an alternative:

**Option 1: Install ImageMagick** (recommended):
```powershell
# Using winget
winget install ImageMagick.ImageMagick

# Verify installation
magick --version
```

**Option 2: Install via Chocolatey**:
```powershell
choco install imagemagick
```

After installation, set the environment variable:
```
USE_IMAGEMAGICK=1
```

**Node.js path issues on Windows**: Always run commands in a Git Bash or PowerShell terminal, not Command Prompt, to avoid path separator issues.

**`apify run` fails on Windows** with "ENOENT node":
```powershell
# Ensure Node.js is on PATH
node --version
# If not found, reinstall Node.js from https://nodejs.org
```

---

### Linux (Ubuntu/Debian)

**Install required dependencies**:
```bash
sudo apt-get update
sudo apt-get install -y imagemagick nodejs npm

# Verify
node --version    # >= 18.0.0
convert --version # ImageMagick
```

**If Node.js version from apt is too old** (common on Ubuntu 20.04):
```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Permission errors with `npm install -g`**:
```bash
# Option 1: Fix npm global prefix
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Use nvm (avoids global permission issues entirely)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
```

---

## 5. Getting Help

### Before Filing an Issue

1. Check this guide end-to-end
2. Search [existing GitHub Issues](https://github.com/ORIGINAL_OWNER/openfy/issues) for your error message
3. Check the run reports: `creator-factory/reports/main-agent-runs/<run-id>/`

### Filing a Bug Report

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

1. **Your exact error output** — copy the full terminal output, not a screenshot
2. **The run report** (if relevant):
   ```bash
   cat creator-factory/reports/main-agent-runs/*/main-run-report.md | tail -50
   ```
3. **Your environment**:
   ```bash
   node --version && npm --version && apify --version && uname -a
   ```
4. **Sanitized `.env`** — replace all real token values with `REDACTED`

### Debug Flags

Enable verbose output for any script:
```bash
# Main agent with max logging
MAIN_AGENT_MAX_ATTEMPTS=1 MAIN_AGENT_ACTORS_PER_RUN=1 npm run main-agent

# Sync store with verbose Apify API responses
DEBUG=apify:* npm run sync-store
```
