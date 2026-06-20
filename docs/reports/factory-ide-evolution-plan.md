# Factory IDE — Evolution Plan
### From VSCode Clone → Cursor/Claude Desktop-Grade AI IDE

> **Report Date:** 2026-06-18  
> **Status:** Planning Phase  
> **Author:** Antigravity (AI Architect)

---

## 1. Executive Summary

We have successfully built a **functional Tauri + React foundation** with Monaco editor, AI Composer, multi-panel renderer, file tree, and glassmorphic theming. However, compared to Cursor desktop and Claude desktop, there are critical gaps across four dimensions:

1. **Visual/UX polish** — our current UI reads as a prototype, not a premium product
2. **Missing VSCode-grade features** — no LSP/IntelliSense, no git integration, no extensions, no search, no debugging
3. **Missing Cursor-grade AI UX** — no agent task queue/sidebar, no diff editor, no inline edits, no code suggestions
4. **Missing Claude Desktop DNA** — no clean chat-first entry, no session persistence, no project memory

**Recommendation:** Yes, bring Creator Factory into the IDE — it's the killer differentiator. No other IDE has a native Apify Actor pipeline built in. But first, fix the visual foundation so the product doesn't look half-built.

---

## 2. What We Have vs. What VSCode Has

### ✅ What Factory IDE Has
| Feature | Status |
|---|---|
| Monaco Editor (multi-tab) | ✅ Working |
| File tree (open, rename, delete, create) | ✅ Working |
| Glassmorphic theme system (4 themes) | ✅ Working |
| AI Composer panel (chat + agent steps) | ✅ Working |
| Renderer panel (terminal, browser, datasets) | ✅ Working |
| Tauri v2 native wrapper | ✅ Working |
| Express backend proxy (port 3001) | ✅ Working |
| Status bar (line/col, git branch, errors) | ✅ Working |
| macOS window controls (traffic lights) | ✅ Working |
| Resize handles between panels | ✅ Working |
| Model selector + auth accounts dropdown | ✅ Working |

### ❌ What VSCode Has That We're Missing
| Feature | Priority | Complexity |
|---|---|---|
| **Language Server Protocol (LSP)** — IntelliSense, autocomplete, type hints, go-to-definition | 🔴 Critical | High |
| **Full-text workspace search** (Cmd+Shift+F) | 🔴 Critical | Medium |
| **Quick open file** (Cmd+P fuzzy search) | 🔴 Critical | Low |
| **Command palette** (Cmd+Shift+P) | 🔴 Critical | Low |
| **Integrated terminal** (real PTY shell via node-pty) | 🔴 Critical | High |
| **Git integration panel** — diff viewer, stage, commit, push/pull | 🟠 High | High |
| **Problem panel** — real compiler errors from LSP, not fake counts | 🟠 High | Medium |
| **Breadcrumb navigation** (file path clickable above editor) | 🟡 Medium | Low |
| **Split editor** (vertical/horizontal panes) | 🟡 Medium | Medium |
| **Extension/Plugin system** | 🟡 Medium | Very High |
| **Keybinding customization** | 🟡 Medium | Low |
| **Find & Replace in file** (Ctrl+H) | 🔴 Critical | Low (Monaco built-in) |
| **Multi-cursor editing** | ✅ Monaco built-in | — |
| **Code folding** | ✅ Monaco built-in | — |
| **Minimap** | ✅ Monaco built-in | — |
| **Peek Definition / Go to References** | Needs LSP | High |
| **Debug adapter protocol (DAP)** | 🟠 High | Very High |
| **Settings/config sync** | 🟡 Medium | Medium |
| **Snippets** | 🟡 Medium | Low |
| **Workspace trust** | 🟡 Medium | Low |
| **Multi-root workspaces** | 🟡 Medium | Medium |
| **Output channel panel** | 🟡 Medium | Low |
| **Notifications system** | 🟡 Medium | Low |

---

## 3. What Cursor Has That We're Missing

Cursor's differentiator is its **deep AI-native UX** — every standard IDE feature is augmented with AI context.

### 3A. Cursor's Left Sidebar (Agent Task Queue)
Cursor has a dedicated left panel showing:
- **IN PROGRESS** tasks with animated status (e.g., "Fetching data", "Generating plan")
- **READY FOR REVIEW** tasks with file diff previews
- **Completed** tasks with timestamps

Our IDE has no persistent task queue. The Composer panel shows one conversation at a time with no history.

**Fix:** Add a `TaskQueuePanel` as a left sidebar tab with multi-agent session management.

### 3B. Cursor's "Background Agents" System
Cursor 2.5 runs multiple agents in parallel asynchronously. Our agent runs synchronously (one at a time, blocks UI).

**Fix:** Implement parallel agent worker pool (Web Workers or Tauri async commands).

### 3C. Cursor's Diff Editor
When an agent edits files, Cursor shows a side-by-side diff (`before | after`) inside Monaco with **Accept / Reject** buttons per change block.

We apply changes silently with no visual diff confirmation.

**Fix:** Use Monaco's `createDiffEditor()` API; intercept all agent file writes to show diff first.

### 3D. Inline Code Suggestions (Cmd+K)
Cursor's Cmd+K opens an inline AI prompt overlay inside the editor. We only have the side panel.

**Fix:** Add floating prompt overlay triggered by Cmd+K that patches the selected code range.

### 3E. Model Context (@ mentions)
Cursor lets you type `@filename`, `@codebase`, `@web`, `@docs` to inject context. We have no mention system.

**Fix:** Add `@` mention tokenizer in ComposerPanel textarea that opens a context picker.

### 3F. Composer Plans vs. Background Execution
Cursor's Composer 2.5 generates a **Plan** first, shows it, lets you approve, then executes. We go straight to execution.

**Fix:** Add a "Planning" mode to useAgent hook — show the step plan, await user confirmation, then execute.

---

## 4. What Claude Desktop Has That We're Missing

Claude Desktop's appeal is its **clean, warm, focused UX** — it feels like a premium consumer app, not a dev tool.

### 4A. Warm Welcome Screen
Claude opens to a centered, personalized "Good afternoon, [Name]" with a soft centered input card. Our welcome screen is an empty Sparkles icon with text.

**Fix:** Build a proper welcome screen with personalized greeting, recent projects, and quick-start prompts.

### 4B. Conversation History Sidebar
Claude left sidebar shows: **Starred**, **Recent chats** with timestamps. We have no conversation history.

**Fix:** Add conversation history sidebar (stored in SQLite via Tauri's filesystem) with search, pin, and delete.

### 4C. Projects/Sessions
Claude's "Projects" let users group conversations with persistent context (files, instructions, memory).

**Fix:** Implement Project system — each project is a named SQLite record with associated files, memory, and conversation threads.

### 4D. Typography and Spacing
Claude Desktop uses large, airy typography with generous padding. Our panels are dense and developer-coded.

**Fix:** Increase base font-size from 12px → 13–14px, increase padding in Composer panel, use `Inter` at `font-weight: 400/500` for chat bubbles.

---

## 5. Creator Factory Integration Recommendation

**Yes — bring Creator Factory into the IDE.** This is the killer differentiator that no other IDE has.

### Proposed "Factory" Panel (New Left Sidebar Tab)
- Show Actor registry with status badges (🟢 published, 🟡 pushed, 🔵 in progress)
- One-click "New Actor" button that launches the full pipeline
- Actor PACT results dashboard (pass/fail per test)
- Actor log viewer (live-tailing `apify run` output)
- Apify Store preview pane (shows published Actor listing)
- Actor template picker (ts-beeai, langgraph-js, python-langgraph)

### Integration Architecture
```
Factory IDE
├── Left Sidebar Tabs:
│   ├── 📁 File Explorer (existing)
│   ├── 🔍 Search (new)
│   ├── 🔄 Git (new)
│   ├── 🚀 Factory (NEW — Creator Factory integration)
│   └── 🔌 MCP Servers (new)
│
├── AI Composer Panel:
│   ├── "Apify Actor" mode — triggers actor generation pipeline
│   ├── PACT test runner widget
│   └── Deploy + Publish buttons
│
└── Renderer Panel:
    ├── Existing: Browser, Terminal, Dataset viewer
    ├── New: Apify Console embed
    └── New: Actor log streamer
```

### Creator Factory Hooks to Wire
1. `npm run main-agent` → pipe to Terminal renderer
2. `actor-registry.json` → read and display in Factory panel
3. `apify push` status → show in status bar
4. PACT results JSON → render as pass/fail table
5. `.actor/icon.png` → display in Actor panel header

---

## 6. Visual Redesign — Cursor/Claude Gap Analysis

### Current Visual Score: 5/10
The current UI is functional but looks like a developer's first attempt. It lacks:
- No inter-panel visual hierarchy
- Status bar is too dense
- Composer panel is too plain (just text)
- Empty states are weak
- Left sidebar icons have no active state

### Target: Cursor Desktop Visual DNA

```
┌─────────────────────────────────────────────────────────────────┐
│  ● ● ●  [Factory IDE]                    [Ready ●]  [⚙ Settings]│  ← Title bar: draggable, minimal
├────┬──────────┬───────────────────────────┬──────────┬──────────┤
│    │          │                           │          │          │
│    │  File    │     Monaco Editor         │  Agent   │ Renderer │
│ 🔵 │  Tree    │     (active tab glow)     │ Composer │  Panel   │
│    │          │                           │          │          │
│ 🔍 │          │  ┌───────────────────┐    │ [Plan]   │          │
│    │          │  │ Breadcrumb nav    │    │ [Steps]  │          │
│ 🔄 │          │  └───────────────────┘    │ [Done ✓] │          │
│    │          │                           │          │          │
│ 🚀 │          │                           │ [input]  │          │
│    │          │                           │          │          │
│ 🔌 │          │                           │          │          │
│    │          │                           │          │          │
├────┴──────────┴───────────────────────────┴──────────┴──────────┤
│ >< main  ○ 0  ⚠ 0  Terminal  Apify Store  Ln 1 Col 1  UTF-8    │  ← Status bar
└─────────────────────────────────────────────────────────────────┘
```

### Key Visual Changes Needed
1. **Sidebar ribbon** — Make icons have active/hover glow states, add labels on hover
2. **Tab bar** — Tabs need active glow, close button on hover only, unsaved dot indicator
3. **Composer panel** — Add avatar bubble for AI messages, distinct user bubble alignment
4. **Agent task cards** — Add animated borders when running, completion badges
5. **Welcome screen** — Completely replace the empty state with Cursor-style centered onboarding
6. **Status bar** — Add colored left pill (Cursor does this for git/branch status)

---

## 7. Implementation Roadmap

### Phase 1 — Visual Foundation (Week 1)
**Goal:** Make the current UI look premium — match Cursor's polish level

| Task | File(s) | Effort |
|---|---|---|
| Redesign welcome/empty state in ComposerPanel | ComposerPanel.tsx | 2h |
| Add active state glow to sidebar ribbon icons | App.tsx, index.css | 1h |
| Implement proper tab bar (unsaved dot, hover close) | EditorPanel.tsx | 2h |
| Add breadcrumb nav above editor | EditorPanel.tsx | 1h |
| Redesign status bar (Cursor-style colored left pill) | App.tsx | 1h |
| Add AI bubble avatars in Composer chat | ComposerPanel.tsx | 2h |
| Increase typography scale (13→14px base in Composer) | index.css | 30min |
| Add file icons (per extension) in file tree | FileTree.tsx | 3h |

### Phase 2 — Critical Missing Features (Week 2)
**Goal:** Close the most painful VSCode gaps

| Task | File(s) | Effort |
|---|---|---|
| Quick Open (Cmd+P) fuzzy file search | New: QuickOpen.tsx | 4h |
| Command Palette (Cmd+Shift+P) | New: CommandPalette.tsx | 3h |
| Workspace full-text search (Cmd+Shift+F) | New: SearchPanel.tsx | 6h |
| Real PTY terminal (node-pty in Tauri backend) | RendererPanel.tsx, Rust | 1 day |
| Find & Replace in file (use Monaco built-in) | EditorPanel.tsx | 2h |
| Conversation history sidebar + SQLite | New: HistoryPanel.tsx | 1 day |

### Phase 3 — AI-Native UX (Week 3)
**Goal:** Match Cursor's AI features

| Task | File(s) | Effort |
|---|---|---|
| Planning mode (plan → approve → execute) | useAgent.ts | 4h |
| Diff editor for agent file changes | EditorPanel.tsx | 6h |
| Inline Cmd+K overlay prompt | New: InlinePrompt.tsx | 4h |
| @ mention system (files, codebase, web) | ComposerPanel.tsx | 6h |
| Multi-agent task queue sidebar | New: TaskQueuePanel.tsx | 1 day |
| Agent background parallel execution | useAgent.ts | 1 day |

### Phase 4 — Creator Factory Integration (Week 4)
**Goal:** Integrate Actor pipeline natively

| Task | File(s) | Effort |
|---|---|---|
| Factory sidebar panel (Actor registry view) | New: FactoryPanel.tsx | 1 day |
| Actor template picker | New: ActorPicker.tsx | 4h |
| Live `apify run` log streamer | RendererPanel.tsx | 4h |
| PACT results viewer | New: PactViewer.tsx | 4h |
| Actor status badges in sidebar | FactoryPanel.tsx | 2h |
| Apify Store preview embed | RendererPanel.tsx | 3h |

### Phase 5 — LSP + Git (Week 5–6)
**Goal:** Match VSCode's core developer experience

| Task | Notes | Effort |
|---|---|---|
| LSP integration (TypeScript, Python) | Use `vscode-languageserver-node` via Tauri sidecar | 3 days |
| Git panel (diff, stage, commit) | Use `simple-git` npm + new GitPanel.tsx | 2 days |
| Problem panel (real LSP errors) | Wire to LSP diagnostics | 1 day |
| Debug adapter (DAP) | Use `@vscode/debugadapter` | 3 days |

---

## 8. Technical Architecture — Next Version

```
factory-ide/
├── frontend/src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── EditorPanel.tsx        # Monaco multi-tab
│   │   │   ├── DiffEditor.tsx         # NEW: agent change diffs
│   │   │   ├── InlinePrompt.tsx       # NEW: Cmd+K AI overlay
│   │   │   └── Breadcrumb.tsx         # NEW: file path nav
│   │   ├── Composer/
│   │   │   ├── ComposerPanel.tsx      # AI chat
│   │   │   ├── TaskQueue.tsx          # NEW: multi-agent sidebar
│   │   │   └── PlanningCard.tsx       # NEW: plan approval UI
│   │   ├── Sidebar/
│   │   │   ├── FileTree.tsx           # File explorer (existing)
│   │   │   ├── SearchPanel.tsx        # NEW: workspace search
│   │   │   ├── GitPanel.tsx           # NEW: git integration
│   │   │   ├── FactoryPanel.tsx       # NEW: Creator Factory
│   │   │   ├── McpPanel.tsx           # NEW: MCP server manager
│   │   │   └── HistoryPanel.tsx       # NEW: conversation history
│   │   ├── Overlays/
│   │   │   ├── QuickOpen.tsx          # NEW: Cmd+P file picker
│   │   │   ├── CommandPalette.tsx     # NEW: Cmd+Shift+P
│   │   │   └── SettingsPanel.tsx      # Existing
│   │   └── Renderer/
│   │       ├── RendererPanel.tsx      # Terminal, browser (existing)
│   │       └── PactViewer.tsx         # NEW: PACT test results
│   ├── hooks/
│   │   ├── useAgent.ts               # Enhanced: planning mode, parallel
│   │   ├── useFileSystem.ts           # Existing
│   │   ├── useLsp.ts                  # NEW: LSP client
│   │   ├── useGit.ts                  # NEW: git operations
│   │   ├── useHistory.ts              # NEW: conversation SQLite
│   │   └── useTheme.ts               # Existing
│   └── stores/
│       ├── actorRegistry.ts           # NEW: Creator Factory state
│       └── agentQueue.ts              # NEW: multi-agent queue
│
├── backend/src/
│   ├── index.ts                       # Express (existing)
│   ├── lsp.ts                         # NEW: LSP proxy server
│   ├── git.ts                         # NEW: git operations API
│   └── factory.ts                     # NEW: Apify actor pipeline API
│
└── src-tauri/src/
    ├── main.rs                        # Existing
    ├── pty.rs                         # NEW: real PTY terminal
    └── keychain.rs                    # NEW: secure token storage
```

---

## 9. Decision: Should We Keep VSCode Clone or Switch Strategy?

### Option A: Continue Custom Tauri + React Build
**Pros:** Full control, no Electron overhead, Tauri = ~80MB RAM vs VSCode's 1.5GB, custom AI-first UX
**Cons:** Building from scratch is expensive, LSP integration is hard, no ecosystem

### Option B: Fork VSCode Directly (OpenVSX / Code-OSS)
**Pros:** Gets extensions, LSP, git, debugger for free; mature codebase
**Cons:** Electron weight (memory), hard to customize deeply, harder to embed Creator Factory

### Option C: Use Theia or Zed as Base
**Pros:** More embeddable than VSCode
**Cons:** Smaller community, different UX patterns

### ✅ Recommendation: Option A — Continue Custom Build
The current Tauri architecture is the right call for our use case:
- Creator Factory integration requires deep native API access
- We want a consumer-grade UX (Claude Desktop vibes), not a developer tools UX
- Tauri gives us macOS native features (vibrancy, keychain) that VSCode can't do
- Our Monaco editor already handles 90% of editing needs

The missing features (LSP, git) should be added as plugins to our existing architecture, not by switching frameworks.

---

## 10. What Success Looks Like

**6 weeks from now, Factory IDE should:**
1. Open and feel as polished as Cursor in the first 2 seconds
2. Have a warm welcome screen like Claude Desktop
3. Show an Agent Task Queue sidebar like Cursor's left panel
4. Run Apify Actors natively from the Factory panel with one click
5. Show a real PTY terminal (not the current simulated one)
6. Have Cmd+P, Cmd+Shift+P, Cmd+Shift+F working
7. Show agent file diffs before applying them
8. Persist conversation history with projects

---

*Report saved to `docs/reports/factory-ide-evolution-plan.md`*
