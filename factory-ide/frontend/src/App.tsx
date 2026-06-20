import { useState, useEffect } from "react";
import {
  Settings,
  PanelRightOpen,
  Search,
  HardDrive,
  GitBranch,
  HelpCircle,
  Bot
} from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { useFileSystem } from "./hooks/useFileSystem";
import { useAgent } from "./hooks/useAgent";
import { FileTree } from "./components/FileTree";
import { EditorPanel } from "./components/EditorPanel";
import { ComposerPanel } from "./components/ComposerPanel";
import { RendererPanel } from "./components/RendererPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { AboutPanel } from "./components/AboutPanel";
import { MenuBar } from "./components/MenuBar";
import { ResizeHandle } from "./components/ResizeHandle";
import { Badge, IconButton } from "./components/CoreUI";
import { useMCPServers } from "./hooks/useMCPServers";
import { AgentTaskSidebar } from "./components/AgentTaskSidebar";
import { SearchPanel } from "./components/SearchPanel";
import { GitPanel } from "./components/GitPanel";

export default function App() {
  const { theme, setTheme } = useTheme();
  const {
    fileTree,
    activeFile,
    openTabs,
    fileCache,
    loading: fsLoading,
    openFile,
    closeFile,
    saveFile,
    closeFolder,
    selectFolder,
    deletePath,
    renamePath,
    createFolder,
    rootName,
    refreshFileTree
  } = useFileSystem();

  // Wires file created callback to open it in tabs automatically
  const {
    messages,
    tasks,
    qaPrompt,
    running: agentRunning,
    thought: agentThought,
    steps: agentSteps,
    completion: agentCompletion,
    fileChanges: agentFileChanges,
    sessions,
    activeSessionId,
    runAgent,
    selectSession,
    startNewSession
  } = useAgent((newPath) => {
    openFile(newPath);
  });

  // Refresh file tree when agent finishes execution
  useEffect(() => {
    if (!agentRunning) {
      refreshFileTree();
    }
  }, [agentRunning, refreshFileTree]);

  const { hasErrors: mcpHasErrors } = useMCPServers();

  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Persist renderer visibility across reloads
  const [rendererHidden, setRendererHiddenRaw] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("factory-ide:rendererHidden");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const setRendererHidden = (val: boolean | ((prev: boolean) => boolean)) => {
    setRendererHiddenRaw(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem("factory-ide:rendererHidden", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [rendererFullscreen, setRendererFullscreen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [composerWidth, setComposerWidth] = useState(440);
  const [rendererWidth, setRendererWidth] = useState(420);

  const [activeSidebarTab, setActiveSidebarTab] = useState<"files" | "search" | "git" | "agents">("files");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-show renderer only when agent produces a new artifact
  useEffect(() => {
    if (agentCompletion) setRendererHidden(false);
  }, [agentCompletion]);

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI__ !== undefined;

  const handleMinimize = async () => {
    if (isTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().minimize();
    }
  };

  const handleMaximize = async () => {
    if (isTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().toggleMaximize();
    }
  };

  const handleClose = async () => {
    if (isTauri) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().close();
    }
  };

  const renderRightControls = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="no-drag">
      {agentRunning ? (
        <Badge color="cyan">Agent Executing...</Badge>
      ) : (
        <Badge color="green">Ready</Badge>
      )}

      {/* Show Renderer button when hidden */}
      {rendererHidden && (
        <button
          onClick={() => setRendererHidden(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 10px",
            fontSize: "11px",
            borderRadius: "4px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            cursor: "pointer"
          }}
        >
          <PanelRightOpen size={13} />
          Preview
        </button>
      )}
      
      <IconButton 
        icon={<Settings size={16} />} 
        onClick={() => setShowSettings(true)}
        tooltip="Open Settings"
      />
    </div>
  );

  /* ── Sidebar content router ── */
  const renderSidebarContent = () => {
    const w = sidebarWidth;
    switch (activeSidebarTab) {
      case "agents":
        return (
          <AgentTaskSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={selectSession}
            onNewSession={startNewSession}
            width={w}
          />
        );
      case "search":
        return <SearchPanel width={w} onOpenFile={openFile} />;
      case "git":
        return <GitPanel width={w} onOpenFile={openFile} />;
      case "files":
      default:
        return (
          <FileTree
            tree={fileTree}
            rootName={rootName}
            onOpenFile={openFile}
            activeFile={activeFile}
            loading={fsLoading}
            onDeletePath={deletePath}
            onRenamePath={renamePath}
            onCreateFolder={createFolder}
            onCreateFile={(path) => saveFile(path, "")}
            width={w}
          />
        );
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: "var(--bg-app)",
      color: "var(--text-primary)",
      overflow: "hidden"
    }}>
      
      {/* Menu Bar (web fallback — hidden in Tauri where native menus are used) */}
      {!isTauri && (
        <MenuBar
          onShowSettings={() => setShowSettings(true)}
          onNewTerminal={() => setRendererHidden(false)}
          onNewBrowser={() => setRendererHidden(false)}
          onToggleBrowser={() => setRendererHidden(!rendererHidden)}
          onToggleFiles={() => setRendererHidden(!rendererHidden)}
          onToggleTerminal={() => setRendererHidden(!rendererHidden)}
          onAbout={() => setShowAbout(true)}
          onCloseFolder={closeFolder}
          onOpenFolder={selectFolder}
        >
          {renderRightControls()}
        </MenuBar>
      )}

      {/* Top Banner Status Bar (Tauri only — acts as draggable title bar) */}
      {isTauri && (
        <header 
          data-tauri-drag-region
          style={{
            display: "flex",
            height: "36px",
            backgroundColor: "var(--bg-panel)",
            borderBottom: "1px solid var(--border-color)",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            backdropFilter: "var(--blur-amount)",
            WebkitBackdropFilter: "var(--blur-amount)",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Custom Window Controls (macOS Traffic Light style) */}
            <div style={{ display: "flex", gap: "8px", marginRight: "12px", alignItems: "center" }} className="no-drag">
              <button 
                onClick={handleClose} 
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#ff5f56",
                  border: "none",
                  cursor: "pointer",
                  padding: 0
                }}
                title="Close"
              />
              <button 
                onClick={handleMinimize} 
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#ffbd2e",
                  border: "none",
                  cursor: "pointer",
                  padding: 0
                }}
                title="Minimize"
              />
              <button 
                onClick={handleMaximize} 
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#27c93f",
                  border: "none",
                  cursor: "pointer",
                  padding: 0
                }}
                title="Maximize"
              />
            </div>
          </div>

          {renderRightControls()}
        </header>
      )}

      {/* ═══ Main Workspace — Cursor Layout ═══
           Ribbon → Sidebar → Composer → Editor → Preview
      */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden"
      }}>
        {/* 1. Left Sidebar Ribbon (48px icon strip) */}
        <div style={{
          width: "48px",
          backgroundColor: "var(--bg-panel)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          gap: "4px",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
            {([
              { id: "files", icon: <HardDrive size={18} />, label: "Files" },
              { id: "search", icon: <Search size={18} />, label: "Search" },
              { id: "git", icon: <GitBranch size={18} />, label: "Source Control" },
              { id: "agents", icon: <Bot size={18} />, label: "Agents" },
            ] as { id: typeof activeSidebarTab; icon: React.ReactNode; label: string }[]).map(tab => {
              const isActive = activeSidebarTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tooltip={tab.label}
                  data-tooltip-position="right"
                  onClick={() => {
                    if (isActive) {
                      setSidebarCollapsed(c => !c);
                    } else {
                      setActiveSidebarTab(tab.id);
                      setSidebarCollapsed(false);
                    }
                  }}
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "44px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                    transition: "color 0.15s ease"
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      left: 0,
                      top: "8px",
                      bottom: "8px",
                      width: "2px",
                      borderRadius: "0 2px 2px 0",
                      backgroundColor: "var(--accent-primary)"
                    }} />
                  )}
                  <div style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: isActive ? "rgba(99, 102, 241, 0.12)" : "transparent",
                    transition: "background 0.15s ease"
                  }}>
                    {tab.icon}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Bottom icons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
            <button
              data-tooltip="Docs & Help"
              data-tooltip-position="right"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "44px",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ padding: "8px", borderRadius: "8px" }}>
                <HelpCircle size={18} />
              </div>
            </button>
          </div>
        </div>

        {/* 2. Context-aware Sidebar (Files / Agents / Search / Git) */}
        {!sidebarCollapsed && (
          <>
            {renderSidebarContent()}
            <ResizeHandle
              direction="vertical"
              onResize={(delta) => setSidebarWidth(w => Math.max(180, Math.min(400, w + delta)))}
            />
          </>
        )}

        {/* 3. Agent Composer — LEFT-CENTER (Cursor layout) */}
        <div style={{ width: `${composerWidth}px`, flexShrink: 0, minWidth: "320px", display: "flex", flexDirection: "column", height: "100%" }}>
          <ComposerPanel 
            messages={messages}
            tasks={tasks}
            qaPrompt={qaPrompt}
            running={agentRunning}
            thought={agentThought}
            steps={agentSteps}
            completion={agentCompletion}
            fileChanges={agentFileChanges}
            onRunAgent={runAgent}
            mcpHasErrors={mcpHasErrors}
          />
        </div>

        <ResizeHandle
          direction="vertical"
          onResize={(delta) => setComposerWidth(w => Math.max(320, Math.min(700, w + delta)))}
        />

        {/* 4. Code Editor — CENTER-RIGHT (flex: 1) */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <EditorPanel 
            activeFile={activeFile}
            openTabs={openTabs}
            fileCache={fileCache}
            onCloseTab={closeFile}
            onSelectTab={openFile}
            onChangeContent={saveFile}
            onCursorPositionChange={() => {}}
            currentTheme={theme}
          />
        </div>

        {/* 5. Preview/Renderer — RIGHT panel */}
        {!rendererHidden && (
          <>
            <ResizeHandle
              direction="vertical"
              onResize={(delta) => setRendererWidth(w => Math.max(280, Math.min(800, w - delta)))}
            />
            <div style={{ width: `${rendererWidth}px`, flexShrink: 0, height: "100%" }}>
              <RendererPanel
                hidden={rendererHidden}
                onToggleHide={() => setRendererHidden(!rendererHidden)}
                fullscreen={rendererFullscreen}
                onToggleFullscreen={() => setRendererFullscreen(!rendererFullscreen)}
                isFolderOpen={fileTree.length > 0}
                completion={agentCompletion}
              />
            </div>
          </>
        )}
      </div>

      {showSettings && (
          <SettingsPanel 
            onClose={() => setShowSettings(false)} 
            currentTheme={theme} 
            onThemeChange={setTheme}
          />
        )}

      {/* About Panel Overlay */}
      {showAbout && (
        <AboutPanel 
          onClose={() => setShowAbout(false)}
        />
      )}
    </div>
  );
}
