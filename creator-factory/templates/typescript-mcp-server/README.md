# {{actor-title}} — MCP Server Wrapper

This is a Model Context Protocol (MCP) server wrapper that enables AI assistants (such as Cursor or Claude Desktop) to invoke the **{{actor-title}}** Apify Actor natively as a tool.

It connects to the Apify platform via `apify-client` and executes the Actor using your configured `APIFY_TOKEN`.

---

## Prerequisites

1. **Apify API Token**: You will need an API token from your Apify account. Retrieve it from [Apify Console → Settings → Integrations](https://console.apify.com/account#/integrations).
2. **Node.js**: Make sure Node.js (v18+) is installed on your machine.

---

## Installation & Setup

### 1. Build the server
Navigate to this directory in your terminal and run:
```bash
npm install
npm run build
```

### 2. Configure environment variables
Create a `.env` file in this directory and add your Apify token:
```env
APIFY_TOKEN=your_apify_api_token_here
```

---

## Registering with AI Assistants

### A. Cursor IDE
To add this tool to Cursor:
1. Open Cursor and go to **Settings** → **Features** → **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the configuration:
   - **Name**: `{{actor-slug}}-mcp`
   - **Type**: `command`
   - **Command**: `node /absolute/path/to/this/directory/dist/index.js`
4. Click **Save**.

### B. Claude Desktop
To add this tool to Claude Desktop, edit your config file (on macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "{{actor-slug}}-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/this/directory/dist/index.js"
      ],
      "env": {
        "APIFY_TOKEN": "YOUR_APIFY_TOKEN"
      }
    }
  }
}
```

Replace `/absolute/path/to/this/directory/` with the actual absolute path to this `.mcp-wrapper` folder.

---

## Available Tools

### `run_{{actor-tool-name}}`
Executes the Actor run on Apify and returns the resulting structured items from the dataset.

**Inputs**: Mapped dynamically from the Actor's input schema (e.g. `startUrls`, `maxItems`, etc.).
