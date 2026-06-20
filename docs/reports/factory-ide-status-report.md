# Factory IDE Status Report

This status report details the current development progress, system architecture, core goals, and upcoming implementation steps for **Factory**—a unified, high-performance agentic coder and desktop workspace platform.

---

## 1. Project Goal & Vision

**Factory** is built on the philosophy: *Build and Ship Without Limitations*. It is designed to combine the predictive code-editing efficiency of **Cursor** with the active execution autonomy of **Manus**, bypassing the resource limits and sandboxing constraints of standard IDE environments.

### Key Visual & Functional Pillars
1. **Bespoke Monaco Code Editor (Left)**: Multi-tab editor wrapper around Monaco. It avoids the licensing and weight overhead of a full VS Code fork, allowing glassmorphism blends and custom autocomplete models.
2. **AI Agent Composer (Middle)**: A task-based, self-healing planning agent loop that executes multi-step terminal, file-writing, and schema audits. Includes interactive multiple-choice Q&A prompts.
3. **Visual Renderer Panel (Right)**: An isolated local canvas to display PDFs, spreadsheets, and live iframe browser previews of hot-reloading dev ports without CORS or cloud limitations.
4. **App Builder Agent**: Generates complete full-stack apps (Next.js, FastAPI, Prisma) and deploys them to Vercel and the Apify Store with one click.
5. **Lightweight Desktop Core**: Tauri v2 + Rust client-side wrapping ensuring startup memory stays below 80MB (compared to Cursor's 1.5GB Electron framework).

---

## 2. Current Architecture & How it is Built

The workspace is structured into clean frontend and backend directories inside `factory-ide`:

```
factory-ide/
├── frontend/                 # React + Vite + TypeScript Client App
│   ├── src/
│   │   ├── components/       # Monaco Editor, Composer, Renderer Panels
│   │   ├── hooks/            # useTheme, useFileSystem, useAgent hooks
│   │   ├── App.tsx           # Coordinates three-panel workspace frame
│   │   ├── main.tsx          # App entry point
│   │   └── index.css         # Glassmorphic layout variables & CSS variables
│   ├── package.json          # Frontend build & scripts (Dev Port: 3000)
│   └── vite.config.ts        # Vite config with backend proxy setup
│
└── backend/                  # Node.js + Express Proxy
    ├── src/
    │   └── index.ts          # Safe file traversal walk, save handlers (Port: 3001)
    └── package.json          # Express service configuration
```

### Core Design Principles
* **Vanilla CSS Systems**: Strict HSL tokens mapped via CSS variables for themes (Glass, Solid Dark, Light, High Contrast). No heavy frameworks like Tailwind CSS are used.
* **Tauri-Ready API Abstraction**: Standard browser sandboxes prevent filesystem access. The frontend filesystem hook (`useFileSystem.ts`) abstracts this: it checks for Tauri context (`window.__TAURI__`). If present, it executes native Rust IPC commands; if not, it falls back to REST calls to the Express dev backend.

---

## 3. Progress Completed

We have successfully scaffolded, coded, and validated the core workspace layers:

### A. Bespoke Frontend Layout & Theme System
* Created a layout featuring translucent glassmorphic panel headers, accent states, and hover micro-animations.
* Implemented four distinct themes (Glass, Dark, Light, High Contrast) controlled via `useTheme` which swaps root `data-theme` values.

### B. Safe Local Filesystem Backend Proxy
* Built an Express server running on port `3001` that handles recursive folder walks while safely ignoring `.git` and `node_modules` to prevent directory traversal exploits.
* Wired it to Monaco Editor so double-clicking file tree nodes loads and edits them in real time.

### C. Layered Agentic Stack Integration
We have successfully documented and visualised the agentic architecture:
1. **Workspace Guidelines**: Appended the detailed **Layered Agentic Stack** specifications directly to `AGENTS.md`.
2. **Platform Design Plan**: Integrated the layered stack definition directly into `reports/factory-ide/factory-ide-design-plan.md`.
3. **Interactive UI Mode**: Added an interactive **"Agentic Stack"** mode inside the `RendererPanel` component. Users can click this mode to view an interactive flowchart of the loop, descriptions for each layer (Cognition, Expertise, Connection, Infrastructure), and a workflow overview.
4. **Compilation Verification**: Ran the TypeScript compiler checking suite (`npm run typecheck`) and resolved all warning issues. It now passes successfully.

---

## 4. The Layered Agentic Stack Specifications

In agentic software development, the structure of an AI system shifts from simple "text generation" to active "action execution."

```
[ User Prompt ] ──> [ Reasoning Engine ] ──> [ Tools Discovery ]
                            ▲                       │
                            │                       ▼
                    [ State Evaluator ] <─── [ Tool Execution (MCP) ]
```

### Stack Components

| Layer | Component | What it Handles | Examples |
| --- | --- | --- | --- |
| **Cognition** | Coding Agent / Host | Orchestration, parallel task planning, and user review loops. | Cursor Agent, Composer, Claude Code, Factory Core |
| **Expertise** | Agent Skills | Guardrails, best practices, framework rules, and logical flow. | `.cursorrules`, `.factoryrules`, DataRobot Skills, Confluent Agent Skills |
| **Connection** | MCP Connectors | Standardized API schemas, tool-calling definitions, and execution layers. | PostgreSQL MCP, GitHub/Linear MCP, Slack MCP, Local Factory MCP |
| **Infrastructure** | Target Environment | The actual systems being queried, modified, or deployed to. | Your database, local directory, cloud environment (Vercel, Apify) |

---

## 5. What is Missing & Next Steps

To move from a hot-reloaded Web UI prototype to a production-ready desktop tool, the following components are scheduled for implementation:

### Phase 1: Tauri Native Wrapper Packaging
* Initialize Tauri v2 (`npx tauri init`) inside the project folder.
* Configure native window configurations (`transparent: true`, `decorations: false`, and macOS visual effects vibrancy filters).
* Package Apple Silicon (`darwin-arm64`), Intel Mac (`darwin-x64`), and Windows (`x64` MSI) build configurations with a drag-to-applications DMG layout.

### Phase 2: Native Deep-Link Authentication
* Bind the custom scheme listener (`factory://auth/callback`) within Tauri Rust core.
* Link browser-based logins (Google, GitHub, Email) on the web to deep-link tokens back into the desktop app's native keychain.

### Phase 3: Local MCP Client Manager
* Implement a settings panel manager to add local MCP servers via standard I/O (Stdio child processes) or Remote SSE URLs.
* Wire the AI Composer's reasoning loop to automatically discover, list, and call these MCP tools.

### Phase 4: Direct Cloud SaaS Deployers
* Integrate direct API upload functions for Vercel (`POST /v13/deployments`) and the Apify Console.
* Support instant shipping of built applications in-memory, bypassing local terminal CLI dependencies.

### Phase 5: Rich Document Converters
* Add libraries to client-side renders (like converting DOCX or PPTX files directly into PDF Canvas previews) to completely remove cloud file viewing limitations.
