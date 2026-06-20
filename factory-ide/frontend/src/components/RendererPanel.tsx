import { useState, useRef, useEffect } from "react";
import { FileText, Table, Globe, Plus, Minus, ArrowLeft, ArrowRight, Layers, Cpu, ShieldAlert, Network, X, Maximize2, Minimize2, PanelRightClose, Terminal, RefreshCw, ArrowUpRight } from "lucide-react";
import { IconButton } from "./CoreUI";

type TabType = "pdf" | "spreadsheet" | "web" | "stack" | "browser" | "terminal";

interface PanelTab {
  id: string;
  type: TabType;
  label: string;
  closable: boolean;
}

const TAB_ICONS: Record<TabType, React.ReactNode> = {
  pdf: <FileText size={12} />,
  spreadsheet: <Table size={12} />,
  web: <Globe size={12} />,
  stack: <Layers size={12} />,
  browser: <Globe size={12} />,
  terminal: <Terminal size={12} />
};

const TAB_LABELS: Record<TabType, string> = {
  pdf: "PDF Report",
  spreadsheet: "Dataset",
  web: "Web Preview",
  stack: "Agentic Stack",
  browser: "Browser",
  terminal: "Terminal"
};

interface RendererPanelProps {
  hidden?: boolean;
  onToggleHide?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isFolderOpen?: boolean;
  completion?: any;
}

function MarkdownView({ content }: { content: string }) {
  if (!content) return <div style={{ color: "var(--text-muted)", fontStyle: "italic", padding: "20px" }}>No report content available. Make sure to run the Actor builder pipeline first.</div>;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`} style={{
            background: "#f4f5f7",
            border: "1px solid #e5e7eb",
            padding: "10px",
            borderRadius: "6px",
            fontSize: "10px",
            color: "#1f2937",
            overflowX: "auto",
            fontFamily: "var(--font-mono)",
            textAlign: "left",
            margin: "8px 0"
          }}>
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(<h1 key={index} style={{ fontSize: "15px", fontWeight: 800, margin: "14px 0 8px", color: "#111827", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>{trimmed.slice(2)}</h1>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={index} style={{ fontSize: "12px", fontWeight: 700, margin: "10px 0 6px", color: "#374151" }}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={index} style={{ fontSize: "11px", fontWeight: 600, margin: "8px 0 4px", color: "#4b5563" }}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(<li key={index} style={{ fontSize: "10px", margin: "2px 0 2px 12px", color: "#4b5563" }}>{trimmed.slice(2)}</li>);
    } else if (trimmed) {
      elements.push(<p key={index} style={{ fontSize: "10px", margin: "0 0 6px 0", lineHeight: "1.4", color: "#4b5563" }}>{trimmed}</p>);
    } else {
      elements.push(<div key={index} style={{ height: "4px" }} />);
    }
  });

  return <div style={{ textAlign: "left", fontFamily: "Inter, sans-serif" }}>{elements}</div>;
}

export function RendererPanel({ hidden, onToggleHide, fullscreen, onToggleFullscreen, isFolderOpen = true, completion }: RendererPanelProps) {
  const [tabs, setTabs] = useState<PanelTab[]>([
    { id: "pdf-1", type: "pdf", label: "PDF Report", closable: true },
    { id: "spreadsheet-1", type: "spreadsheet", label: "Dataset", closable: true },
    { id: "web-1", type: "web", label: "Web Preview", closable: true },
    { id: "stack-1", type: "stack", label: "Agentic Stack", closable: true }
  ]);
  const [activeTabId, setActiveTabId] = useState("pdf-1");
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("http://localhost:5175");
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const newTabRef = useRef<HTMLDivElement>(null);

  const [pactReport, setPactReport] = useState<string>("");
  const [deployReport, setDeployReport] = useState<string>("");
  const [finalReport, setFinalReport] = useState<string>("");
  const [registryData, setRegistryData] = useState<any[]>([]);

  // Update browserUrl automatically when completion changes
  useEffect(() => {
    if (completion?.devUrl) {
      setBrowserUrl(completion.devUrl);
    }
  }, [completion]);

  // Load real report files and registry database
  useEffect(() => {
    // 1. Fetch registry
    fetch(`/api/files/content?path=${encodeURIComponent("/creator-factory/reports/actor-registry.json")}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.content) {
          try {
            setRegistryData(JSON.parse(data.content));
          } catch {}
        }
      })
      .catch(console.error);

    // 2. Fetch actor reports if a slug is available
    if (completion?.actorSlug) {
      const slug = completion.actorSlug;
      
      // Final Report
      fetch(`/api/files/content?path=${encodeURIComponent(`/creator-factory/reports/${slug}/final-report.md`)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.content) setFinalReport(data.content); })
        .catch(console.error);

      // PACT report
      fetch(`/api/files/content?path=${encodeURIComponent(`/creator-factory/generated-actors/${slug}/reports/pact-test-report.md`)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.content) setPactReport(data.content); })
        .catch(console.error);

      // Deploy report
      fetch(`/api/files/content?path=${encodeURIComponent(`/creator-factory/generated-actors/${slug}/reports/deploy-report.md`)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.content) setDeployReport(data.content); })
        .catch(console.error);
    }
  }, [completion]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeMode = isFolderOpen ? activeTab?.type : undefined;

  // Click outside to close new tab menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newTabRef.current && !newTabRef.current.contains(e.target as Node)) {
        setShowNewTabMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTab = (type: TabType) => {
    const id = `${type}-${Date.now()}`;
    const newTab: PanelTab = {
      id,
      type,
      label: TAB_LABELS[type],
      closable: true
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setShowNewTabMenu(false);
  };

  const closeTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab?.closable) return;
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id);
      if (remaining.length > 0) setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  if (hidden) return null;

  return (
    <div style={{
      flex: fullscreen ? "none" : 1,
      width: fullscreen ? "100%" : undefined,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: "var(--bg-app)",
      position: fullscreen ? "fixed" : "relative",
      top: fullscreen ? 0 : undefined,
      left: fullscreen ? 0 : undefined,
      right: fullscreen ? 0 : undefined,
      bottom: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 1000 : undefined
    }}>
      {/* Tab Bar Header */}
      <div style={{
        display: "flex",
        height: "36px",
        backgroundColor: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-color)",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        gap: "4px"
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, overflow: "hidden" }}>
          {isFolderOpen && tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                fontSize: "11px",
                borderRadius: "4px",
                background: activeTabId === tab.id ? "var(--bg-card)" : "transparent",
                color: activeTabId === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                position: "relative"
              }}
            >
              {TAB_ICONS[tab.type]}
              <span>{tab.label}</span>
              {tab.closable && (
                <span
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  style={{
                    marginLeft: "4px",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <X size={10} />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Controls: + New Tab, Fullscreen, Hide */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {/* + New Tab */}
          {isFolderOpen && (
            <div ref={newTabRef} style={{ position: "relative" }}>
              <IconButton
                icon={<Plus size={14} />}
                tooltip="New tab"
                onClick={() => setShowNewTabMenu(!showNewTabMenu)}
              />
              {showNewTabMenu && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-lg)",
                  overflow: "hidden",
                  minWidth: "180px",
                  zIndex: 200,
                  padding: "4px"
                }}>
                  {/* Search input */}
                  <input
                    type="text"
                    placeholder="Open any file, URL, ..."
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px",
                      background: "var(--bg-panel)",
                      color: "var(--text-primary)",
                      fontSize: "11px",
                      outline: "none",
                      marginBottom: "4px",
                      boxSizing: "border-box"
                    }}
                  />
                  {[
                    { type: "browser" as TabType, icon: <Globe size={13} />, label: "Browser" },
                    { type: "terminal" as TabType, icon: <Terminal size={13} />, label: "Terminal" },
                    { type: "pdf" as TabType, icon: <FileText size={13} />, label: "File" },
                    { type: "spreadsheet" as TabType, icon: <Table size={13} />, label: "Dataset" }
                  ].map(item => (
                    <button
                      key={item.type}
                      onClick={() => addTab(item.type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        padding: "7px 10px",
                        border: "none",
                        background: "none",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        textAlign: "left"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <IconButton
            icon={fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            tooltip={fullscreen ? "Exit full screen" : "Enter full screen"}
            onClick={onToggleFullscreen}
          />

          {/* Hide Panel */}
          <IconButton
            icon={<PanelRightClose size={14} />}
            tooltip="Hide panel"
            onClick={onToggleHide}
          />
        </div>
      </div>

      {/* Render Canvas Area */}
      <div style={{ flex: 1, overflow: "auto", padding: !activeMode ? "16px" : (activeMode === "browser" || activeMode === "terminal" ? "0" : "16px"), position: "relative" }}>

        {/* --- EMPTY STATE (when all tabs closed or no folder open) --- */}
        {!activeMode && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "400px",
              padding: "32px",
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-panel)",
              backdropFilter: "var(--blur-amount)",
              boxShadow: "var(--shadow-lg)"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                border: "1px solid var(--border-color)",
                color: "var(--accent-primary)"
              }}>
                <Layers size={20} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px", fontFamily: "Outfit, sans-serif" }}>
                {!isFolderOpen ? "No Workspace Folder Open" : "No Active Previews"}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
                {!isFolderOpen 
                  ? "Open a workspace folder to view generated reports, datasets, and preview options."
                  : "All preview windows are closed. You can open a new browser tab, terminal, document viewer, or dataset view by clicking the + button in the top right."
                }
              </p>
              {isFolderOpen ? (
                <button 
                  onClick={() => setShowNewTabMenu(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "6px",
                    border: "none",
                    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)"
                  }}
                >
                  <Plus size={14} />
                  <span>Open View</span>
                </button>
              ) : (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Use File menu to open a workspace folder
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- BROWSER TAB --- */}
        {activeMode === "browser" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* URL Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderBottom: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-panel)"
            }}>
              <button
                onClick={() => {}}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", display: "flex" }}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                onClick={() => {}}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", display: "flex" }}
              >
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  const iframe = document.getElementById("browser-iframe") as HTMLIFrameElement;
                  if (iframe) iframe.src = iframe.src;
                }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", display: "flex" }}
              >
                <RefreshCw size={13} />
              </button>
              <input
                type="text"
                value={browserUrl}
                onChange={(e) => setBrowserUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const iframe = document.getElementById("browser-iframe") as HTMLIFrameElement;
                    if (iframe) iframe.src = browserUrl;
                  }
                }}
                style={{
                  flex: 1,
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none"
                }}
              />
              <button
                onClick={() => window.open(browserUrl, "_blank")}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", display: "flex" }}
                title="Open in external browser"
              >
                <ArrowUpRight size={13} />
              </button>
            </div>
            {/* iframe */}
            <iframe
              id="browser-iframe"
              src={browserUrl}
              style={{
                flex: 1,
                width: "100%",
                border: "none",
                backgroundColor: "#ffffff"
              }}
              title="Integrated Browser"
            />
          </div>
        )}

        {/* --- TERMINAL TAB --- */}
        {activeMode === "terminal" && (
          <div style={{
            height: "100%",
            backgroundColor: "#0d1117",
            padding: "12px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#c9d1d9",
            overflow: "auto"
          }}>
            <div style={{ marginBottom: "8px", color: "#8b949e" }}>
              <span style={{ color: "#58a6ff" }}>zsh</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#8b949e" }}>danny@macbook-pro</span>
              <span style={{ color: "#58a6ff" }}>factory-ide</span>
              <span style={{ color: "#c9d1d9" }}>%</span>
              <span style={{
                display: "inline-block",
                width: "7px",
                height: "14px",
                backgroundColor: "#c9d1d9",
                animation: "blink 1s step-end infinite"
              }} />
            </div>
          </div>
        )}
        
        {/* --- 1. PDF PREVIEW --- */}
        {activeMode === "pdf" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Toolbar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              padding: "6px 12px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "11px",
              color: "var(--text-secondary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconButton icon={<ArrowLeft size={14} />} onClick={() => setPage(p => Math.max(1, p-1))} tooltip="Prev page" />
                <span>Page {page} / 3</span>
                <IconButton icon={<ArrowRight size={14} />} onClick={() => setPage(p => Math.min(3, p+1))} tooltip="Next page" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconButton icon={<Minus size={14} />} onClick={() => setZoom(z => Math.max(50, z-10))} tooltip="Zoom out" />
                <span>{zoom}%</span>
                <IconButton icon={<Plus size={14} />} onClick={() => setZoom(z => Math.min(150, z+10))} tooltip="Zoom in" />
              </div>
            </div>

            {/* Document Frame Mockup */}
            <div style={{
              flex: 1,
              background: "#18181c",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
              padding: "20px"
            }}>
              <div style={{
                width: `${400 * (zoom/100)}px`,
                minHeight: `${540 * (zoom/100)}px`,
                backgroundColor: "#ffffff",
                color: "#1f2937",
                borderRadius: "4px",
                padding: "24px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                transformOrigin: "top center",
                fontSize: `${12 * (zoom/100)}px`,
                transition: "all 0.15s ease"
              }}>
                {/* PDF Header */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #374151", paddingBottom: "8px", marginBottom: "16px" }}>
                  <span style={{ fontWeight: 800, color: "#111827", fontFamily: "Outfit, sans-serif" }}>FACTORY PILOT REPORT</span>
                  <span style={{ color: "#6b7280" }}>Page {page} of 3</span>
                </div>

                {page === 1 && (
                  finalReport ? (
                    <MarkdownView content={finalReport} />
                  ) : (
                    <div>
                      <h2 style={{ fontSize: `${18 * (zoom/100)}px`, fontWeight: 800, color: "#111827", marginBottom: "12px", fontFamily: "Outfit, sans-serif" }}>
                        Monthly Performance Report — June 2026
                      </h2>
                      <p style={{ color: "#4b5563", marginBottom: "16px", lineHeight: 1.5 }}>
                        This audit evaluates the core monetization metrics, PPE transaction triggers, and deployment targets completed across all active agent pipelines.
                      </p>

                      {/* Chart Mock */}
                      <div style={{
                        height: "120px",
                        background: "#f3f4f6",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-around",
                        padding: "16px 24px",
                        marginBottom: "16px"
                      }}>
                        <div style={{ width: "24px", height: "40px", backgroundColor: "#6366f1", borderRadius: "3px" }} />
                        <div style={{ width: "24px", height: "65px", backgroundColor: "#06b6d4", borderRadius: "3px" }} />
                        <div style={{ width: "24px", height: "90px", backgroundColor: "#a855f7", borderRadius: "3px" }} />
                        <div style={{ width: "24px", height: "110px", backgroundColor: "#10b981", borderRadius: "3px" }} />
                      </div>

                      <h3 style={{ fontSize: `${14 * (zoom/100)}px`, fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Key Metrics Summary</h3>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
                            <th style={{ padding: "4px 0" }}>Pipeline</th>
                            <th style={{ padding: "4px 0", textAlign: "right" }}>Completed Runs</th>
                            <th style={{ padding: "4px 0", textAlign: "right" }}>Cost Saving</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "6px 0", fontWeight: 500 }}>TrendPilot (TikTok)</td>
                            <td style={{ padding: "6px 0", textAlign: "right" }}>142</td>
                            <td style={{ padding: "6px 0", textAlign: "right", color: "#059669" }}>$124.50</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "6px 0", fontWeight: 500 }}>Lead Cleaner</td>
                            <td style={{ padding: "6px 0", textAlign: "right" }}>98</td>
                            <td style={{ padding: "6px 0", textAlign: "right", color: "#059669" }}>$84.20</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {page === 2 && (
                  pactReport ? (
                    <MarkdownView content={pactReport} />
                  ) : (
                    <div>
                      <h2 style={{ fontSize: `${18 * (zoom/100)}px`, fontWeight: 800, color: "#111827", marginBottom: "12px", fontFamily: "Outfit, sans-serif" }}>
                        User Demographics & Sources
                      </h2>
                      <p style={{ color: "#4b5563", marginBottom: "16px", lineHeight: 1.5 }}>
                        Detailing the location and source execution parameters triggered by local developer environments.
                      </p>
                      <div style={{
                        width: "100px",
                        height: "100px",
                        borderRadius: "50%",
                        background: "conic-gradient(#6366f1 0% 45%, #06b6d4 45% 75%, #10b981 75% 100%)",
                        margin: "20px auto"
                      }} />
                      <div style={{ display: "flex", justifyContent: "center", gap: "12px", fontSize: "11px", color: "#4b5563" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1" }} /> Desktop (45%)
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#06b6d4" }} /> Web (30%)
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> CLI (25%)
                        </span>
                      </div>
                    </div>
                  )
                )}

                {page === 3 && (
                  deployReport ? (
                    <MarkdownView content={deployReport} />
                  ) : (
                    <div>
                      <h2 style={{ fontSize: `${18 * (zoom/100)}px`, fontWeight: 800, color: "#111827", marginBottom: "12px", fontFamily: "Outfit, sans-serif" }}>
                        Verification Audit & Disclaimers
                      </h2>
                      <p style={{ color: "#4b5563", marginBottom: "12px", lineHeight: 1.5 }}>
                        All items in the workspace pass strict schema validation gates (`validate-schema`) and PACT testing before deployment.
                      </p>
                      <div style={{ background: "#f9fafb", borderLeft: "4px solid #10b981", padding: "12px", borderRadius: "0 6px 6px 0", fontSize: "11px", marginBottom: "16px" }}>
                        <strong>Audit Pass:</strong> Verified package schema, PPE Start event pricing ($0.10005) and Result event pricing ($0.10001 per dataset item).
                      </div>
                      <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                        * Generated autonomously by Factory IDE App Builder Agent. Security keys are encrypted and stored locally.
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 2. SPREADSHEET PREVIEW --- */}
        {activeMode === "spreadsheet" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{
              flex: 1,
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              overflow: "auto",
              background: "var(--bg-card)"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>ID</th>
                    <th style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>Brand Title</th>
                    <th style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>Trigger Price</th>
                    <th style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>Category</th>
                    <th style={{ padding: "10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registryData.length > 0 ? (
                    registryData.map((row, idx) => (
                      <tr key={row.slug || idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", fontWeight: 500 }}>{row.actorName}</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--accent-green)" }}>$0.10005</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>{row.status === "published" ? "LEAD_GENERATION" : "DEVELOPER_TOOLS"}</td>
                        <td style={{ padding: "10px", color: row.status === "published" || row.status === "pushed" ? "var(--accent-green)" : "var(--accent-yellow)" }}>
                          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--text-muted)" }}>1</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", fontWeight: 500 }}>TrendPilot — TikTok Scraper</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--accent-green)" }}>$0.10005</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>LEAD_GENERATION</td>
                        <td style={{ padding: "10px", color: "var(--accent-green)" }}>Published</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--text-muted)" }}>2</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", fontWeight: 500 }}>SitePilot — AI Web Auditor</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--accent-green)" }}>$0.10005</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>SEO_TOOLS</td>
                        <td style={{ padding: "10px", color: "var(--accent-green)" }}>Published</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--text-muted)" }}>3</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", fontWeight: 500 }}>LeadPilot — GMaps Leads</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)", color: "var(--accent-green)" }}>$0.10005</td>
                        <td style={{ padding: "10px", borderRight: "1px solid var(--border-color)" }}>LEAD_GENERATION</td>
                        <td style={{ padding: "10px", color: "var(--accent-yellow)" }}>Pushed (Rate-Limit)</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 3. WEB PREVIEW --- */}
        {activeMode === "web" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Address Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              padding: "6px 12px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "11px",
              gap: "8px"
            }}>
              <span style={{ color: "var(--accent-green)" }}>●</span>
              <span style={{ color: "var(--text-secondary)" }}>{browserUrl}</span>
            </div>

            {/* Browser Preview Frame */}
            <div style={{
              flex: 1,
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              background: "#ffffff",
              position: "relative",
              overflow: "hidden"
            }}>
              <iframe
                src={browserUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  backgroundColor: "#ffffff"
                }}
                title="Live Web Preview"
              />
            </div>
          </div>
        )}

        {/* --- 4. LAYERED AGENTIC STACK PREVIEW --- */}
        {activeMode === "stack" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px", color: "var(--text-primary)" }}>
            
            {/* Header section */}
            <div className="glass-panel" style={{ padding: "20px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <Layers size={20} style={{ color: "var(--accent-primary)" }} />
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, fontFamily: "Outfit, sans-serif" }}>
                  The Layered Agentic Stack
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                In agentic software development, the structure of an AI system shifts from simple 
                <strong style={{ color: "var(--text-primary)" }}> "text generation" </strong> to active 
                <strong style={{ color: "var(--accent-secondary)" }}> "action execution"</strong>. 
                In environments like Cursor and Factory, the agentic architecture relies on a clear, layered stack consisting of the Agent Core, Skills, and MCP Connectors.
              </p>
            </div>

            {/* Visual Flowchart/Diagram */}
            <div className="glass-panel" style={{ padding: "24px", background: "rgba(20, 20, 25, 0.4)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 16px 0", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Cognitive Execution Loop
              </h3>
              
              <div style={{ 
                display: "flex", 
                flexWrap: "wrap", 
                justifyContent: "space-between", 
                alignItems: "center", 
                gap: "12px",
                position: "relative"
              }}>
                {/* Node 1 */}
                <div style={{
                  flex: "1 1 150px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Input</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-primary)" }}>User Prompt</div>
                </div>

                <div style={{ color: "var(--text-muted)", fontWeight: 800 }}>➔</div>

                {/* Node 2 */}
                <div style={{
                  flex: "1 1 150px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--accent-primary)",
                  borderRadius: "6px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Agent Core</div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>Reasoning Engine</div>
                </div>

                <div style={{ color: "var(--text-muted)", fontWeight: 800 }}>➔</div>

                {/* Node 3 */}
                <div style={{
                  flex: "1 1 150px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Expertise</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-secondary)" }}>Tools Discovery (Skills)</div>
                </div>

                <div style={{ color: "var(--text-muted)", fontWeight: 800 }}>➔</div>

                {/* Node 4 */}
                <div style={{
                  flex: "1 1 150px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "12px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Execution</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-green)" }}>Tool execution (MCP)</div>
                </div>
              </div>
            </div>

            {/* Details Cards Container */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {/* Card 1 */}
              <div className="glass-panel" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Cpu size={16} style={{ color: "var(--accent-primary)" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>1. The Core Agentic Architecture</h4>
                </div>
                <ul style={{ fontSize: "12px", color: "var(--text-secondary)", paddingLeft: "18px", margin: 0, display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.4 }}>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Reasoning Engine:</strong> Powered by frontier models, it decides how to approach a problem and generates an actionable task plan rather than predicting code instantly.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>The Autonomy Slider:</strong> Allows control over agent independence, from low autonomy (inline Tab completions) to high autonomy (asynchronous multi-step Composer runs).
                  </li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="glass-panel" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <ShieldAlert size={16} style={{ color: "var(--accent-secondary)" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>2. Agent Skills (Domain Knowledge)</h4>
                </div>
                <ul style={{ fontSize: "12px", color: "var(--text-secondary)", paddingLeft: "18px", margin: 0, display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.4 }}>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Platform Guardrails:</strong> Pre-packaged domain modules and guided workflows (like Kafka or DataRobot scripts) that instruct the agent how to proceed safely.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Framework Rules:</strong> Adopts platform-specific rules (like `.cursorrules` or `.factoryrules`) to prevent LLM hallucinations.
                  </li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="glass-panel" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Network size={16} style={{ color: "var(--accent-green)" }} />
                  <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>3. MCP Connectors (USB for AI)</h4>
                </div>
                <ul style={{ fontSize: "12px", color: "var(--text-secondary)", paddingLeft: "18px", margin: 0, display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.4 }}>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Tools & Resources:</strong> Exposes executable functions, static files (database schemas, logs), and custom prompt templates over JSON-RPC 2.0.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Stdio & HTTP Transports:</strong> Operates locally over stdout/stdin streams (local databases, filesystems) or remotely via SSE/Web protocol streams.
                  </li>
                </ul>
              </div>
            </div>

            {/* Stack Mapping Table */}
            <div className="glass-panel" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px 0" }}>Mapping the Entire Stack</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: 600 }}>
                    <th style={{ padding: "8px 4px" }}>Layer</th>
                    <th style={{ padding: "8px 4px" }}>Component</th>
                    <th style={{ padding: "8px 4px" }}>What it Handles</th>
                    <th style={{ padding: "8px 4px" }}>Examples</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: "var(--accent-primary)" }}>Cognition</td>
                    <td style={{ padding: "8px 4px" }}>Coding Agent / Host</td>
                    <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>Orchestration, task planning, review loops.</td>
                    <td style={{ padding: "8px 4px" }}>Cursor Composer, Factory Core</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: "var(--accent-secondary)" }}>Expertise</td>
                    <td style={{ padding: "8px 4px" }}>Agent Skills</td>
                    <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>Guardrails, framework guidelines, logic flows.</td>
                    <td style={{ padding: "8px 4px" }}>`.factoryrules`, `.cursorrules`</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: "var(--accent-green)" }}>Connection</td>
                    <td style={{ padding: "8px 4px" }}>MCP Connectors</td>
                    <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>Standardized API schemas and tool definitions.</td>
                    <td style={{ padding: "8px 4px" }}>PostgreSQL MCP, Local Factory MCP</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: "var(--text-muted)" }}>Infrastructure</td>
                    <td style={{ padding: "8px 4px" }}>Target Environment</td>
                    <td style={{ padding: "8px 4px", color: "var(--text-secondary)" }}>Target systems being queried or modified.</td>
                    <td style={{ padding: "8px 4px" }}>Filesystem, SQLite, Vercel APIs</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Workflow summary card */}
            <div style={{ 
              padding: "12px 16px", 
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)", 
              border: "1px solid rgba(99, 102, 241, 0.15)",
              borderRadius: "6px",
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--text-secondary)"
            }}>
              <strong style={{ color: "var(--text-primary)" }}>Resulting Workflow: </strong>
              Instead of manually copy-pasting code snippets, logs, and database structures, you prompt the agent:
              <em style={{ color: "var(--accent-primary)" }}> "Fix the broken data pipeline and alert the team." </em>
              The <strong style={{ color: "var(--text-primary)" }}>Agent</strong> creates a plan; uses its <strong style={{ color: "var(--text-primary)" }}>Skills</strong> to format data schemas; invokes the PostgreSQL and Slack <strong style={{ color: "var(--text-primary)" }}>MCP Connectors</strong> to run queries and post messages; and executes the entire cycle natively.
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
