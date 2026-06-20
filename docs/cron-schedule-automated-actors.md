# Automated Daily Actor Production & Store Publication Plan

This plan details how to schedule the Apify Creator Factory to run automatically every day at 6:00 AM. 

Because the generation loop is deterministic (utilizing robust website audit templates with runtime LLM capabilities) and is configured to process exactly 5 Actors per batch (`MAIN_AGENT_ACTORS_PER_RUN=5`), running it once every 24 hours will continuously populate your Apify Store while staying perfectly within the platform's publication rate limits.

---

## 1. How the Automation Works

1. **Selection**: The `main-agent` reads the existing `actor-registry.json` and selects the next 5 unused ideas from the selector queue.
2. **Build & Test**: It generates the boilerplate, runs PACT checks (`npm install`, `npm run build`, `npm test`, `apify run`), and verifies the quality gate locally.
3. **Deployment**: It pushes the code to the Apify Console (`apify push`).
4. **Publish & Monetize**: It calls the Apify REST API to configure the Pay-Per-Event pricing, categories, SEO tags, descriptions, and uploads the icon. Because we limit it to 5 per run, the 429 publication limit resets between runs and all 5 Actors publish successfully.

---

## 2. Setting Up the Environment

Since cron jobs and macOS schedule daemons run in a clean, non-interactive shell, they do not inherit your terminal's environment variables (like Node version managers, Apify tokens, etc.). We must create a wrapper script to load these.

### A. Create the Wrapper Script (`/Users/danny/Desktop/apify/run-factory.sh`)
Create a file at `/Users/danny/Desktop/apify/run-factory.sh` with the following content:

```bash
#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Redirect all stdout/stderr to a log file
exec >> /Users/danny/Desktop/apify/cron.log 2>&1

echo "=========================================="
echo "Starting Creator Factory Run: $(date)"
echo "=========================================="

# 1. Load your local shell profile to get Node/NVM paths
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Alternatively, if you use standard Node (Homebrew/macOS):
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# 2. Configure credentials and tokens
export APIFY_TOKEN="YOUR_APIFY_TOKEN_HERE"
export APIFY_UI_TOKEN="YOUR_APIFY_UI_TOKEN_HERE"
export MAIN_AGENT_ACTORS_PER_RUN=5

# 3. Navigate to the creator-factory folder and run
cd /Users/danny/Desktop/apify/creator-factory
npm run main-agent

echo "Creator Factory Run completed successfully: $(date)"
```

Make the script executable:
```bash
chmod +x /Users/danny/Desktop/apify/run-factory.sh
```

---

## 3. Option A: macOS Native Schedule (`launchd`) — RECOMMENDED

On macOS, `launchd` is superior to standard `cron` because it is native, reliable, and if your Mac is asleep at 6:00 AM, `launchd` will immediately run the job as soon as the computer wakes up (whereas `cron` would skip it entirely).

### Step 1: Create the Property List File
Create a plist file at `~/Library/LaunchAgents/com.orbitai.creatorfactory.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.orbitai.creatorfactory</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/danny/Desktop/apify/run-factory.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/danny/Desktop/apify/cron.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/danny/Desktop/apify/cron.log</string>
</dict>
</plist>
```

### Step 2: Register the Job with macOS
Run the following commands in your terminal to load and activate the scheduled job:

```bash
# Load the agent (registers it with macOS)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.orbitai.creatorfactory.plist

# Enable the agent
launchctl enable gui/$(id -u)/com.orbitai.creatorfactory
```

### Step 3: Testing or Manually Triggering
You can force the schedule to run immediately at any time for testing:
```bash
launchctl kickstart -k gui/$(id -u)/com.orbitai.creatorfactory
```

---

## 4. Option B: Standard macOS Cron (`crontab`)

If you prefer standard unix cron, you can register the schedule via your crontab.

### Step 1: Edit Crontab
In your terminal, run:
```bash
crontab -e
```

### Step 2: Add Schedule Entry
Add the following line to run the wrapper script every day at 6:00 AM:
```text
0 6 * * * /Users/danny/Desktop/apify/run-factory.sh
```

---

## 5. Verification & Monitoring

* **Logs**: All outputs, builds, and publication API statuses will be logged into `/Users/danny/Desktop/apify/cron.log`.
* **Registry**: Successfully deployed Actors will be updated in `/Users/danny/Desktop/apify/creator-factory/reports/actor-registry.json` automatically, preventing them from being re-selected in future runs.

---

## 6. Option C: Agent-Level Scheduling (The Ultimate Way) — RECOMMENDED FOR DYNAMIC RESEARCH

If you want the schedule to dynamically search the web for new developer capabilities, crawl the Apify Store to check if similar Actors exist, and design unique or significantly better versions, you should schedule the **AI coding agent** itself.

### How it Works
Instead of running a local shell script, you instruct the IDE platform to launch a fresh AI agent instance every day at 6:00 AM. The agent has access to all tools (web search, browser, terminal, file editing) and can:
1. Search Google/GitHub for new API repositories and cookbooks.
2. Crawl the Apify Store to see if any similar Actors exist.
3. Use LLM reasoning to ensure the Actor's scope, dataset shape, or monetization is unique and superior.
4. Programmatically generate, PACT-test, and push the Actors.

### How to Set It Up
1. Open the chat interface in your IDE.
2. Recommend or use the `/schedule` command by typing it or entering the following:
   * **Cron Expression**: `0 6 * * *` (runs every day at 6:00 AM)
   * **Prompt**:
     ```text
     Run the Apify Creator Factory main agent. First, search the web (specifically github.com/orgs/google/repositories) for new developer cookbooks or APIs. Compare them against the Apify Store. Identify 5 underserved gaps. If a similar Actor exists, design the new Actor to be clearly superior (e.g. outcome-focused, pay-per-event monetization). Then generate, test, and push the 5 new Actors, updating the reports and registry.
     ```
3. Submit the schedule. The platform will manage the task in the background and notify you when each run completes.

