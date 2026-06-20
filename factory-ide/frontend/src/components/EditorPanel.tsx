import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { FileCode, X, ChevronRight } from "lucide-react";


interface EditorPanelProps {
  activeFile: string | null;
  openTabs: string[];
  fileCache: Record<string, string>;
  onCloseTab: (path: string) => void;
  onSelectTab: (path: string) => void;
  onChangeContent: (path: string, content: string) => void;
  onCursorPositionChange?: (line: number, column: number) => void;
  currentTheme?: string;
}

export function EditorPanel({
  activeFile,
  openTabs,
  fileCache,
  onCloseTab,
  onSelectTab,
  onChangeContent,
  onCursorPositionChange,
  currentTheme
}: EditorPanelProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [unsavedTabs, setUnsavedTabs] = useState<Set<string>>(new Set());

  
  const getFileIcon = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext === "ts" || ext === "tsx") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          backgroundColor: "#3178c6",
          color: "#ffffff",
          fontSize: "8px",
          fontWeight: "bold",
          borderRadius: "2px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1,
          flexShrink: 0,
          userSelect: "none"
        }}>
          TS
        </span>
      );
    }
    if (ext === "json") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          backgroundColor: "#f1e05a",
          color: "#1f2937",
          fontSize: "8px",
          fontWeight: "bold",
          borderRadius: "2px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1,
          flexShrink: 0,
          userSelect: "none"
        }}>
          {"{}"}
        </span>
      );
    }
    if (ext === "md") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          backgroundColor: "#008672",
          color: "#ffffff",
          fontSize: "8px",
          fontWeight: "bold",
          borderRadius: "2px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1,
          flexShrink: 0,
          userSelect: "none"
        }}>
          MD
        </span>
      );
    }
    if (["png", "jpg", "jpeg", "gif", "ico", "webp"].includes(ext || "")) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          backgroundColor: "#ec4899",
          color: "#ffffff",
          fontSize: "8px",
          fontWeight: "bold",
          borderRadius: "2px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1,
          flexShrink: 0,
          userSelect: "none"
        }}>
          IMG
        </span>
      );
    }
    return <FileCode size={14} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />;
  };

  const getFileName = (path: string) => {
    return path.substring(path.lastIndexOf("/") + 1);
  };

  /** Build breadcrumb segments from the full file path */
  const getBreadcrumb = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    return parts;
  };

  // Welcome Screen when no tabs are open
  if (!activeFile || openTabs.length === 0) {
    return (
      <div className="flex-center" style={{
        flex: 1,
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--bg-app)",
        padding: "40px",
        textAlign: "center"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          opacity: 0.3
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            Open a file from the sidebar to start editing
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (activeFile) {
      onCursorPositionChange?.(1, 1);
    }
  }, [activeFile, onCursorPositionChange]);

  const handleEditorDidMount = (editor: any) => {
    editor.onDidChangeCursorPosition((e: any) => {
      onCursorPositionChange?.(e.position.lineNumber, e.position.column);
    });
  };

  const activeContent = fileCache[activeFile] || "";

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: "var(--bg-app)",
      borderRight: "1px solid var(--border-color)"
    }}>
      {/* Tabs list bar */}
      <div style={{
        display: "flex",
        height: "36px",
        backgroundColor: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-color)",
        overflowX: "auto",
        overflowY: "hidden"
      }}>
        {openTabs.map((path) => {
          const isActive = path === activeFile;
          const isHovered = hoveredTab === path;
          const isUnsaved = unsavedTabs.has(path);
          return (
            <div 
              key={path}
              onClick={() => onSelectTab(path)}
              onMouseEnter={() => setHoveredTab(path)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 10px 0 12px",
                height: "100%",
                fontSize: "12px",
                cursor: "pointer",
                borderRight: "1px solid var(--border-color)",
                backgroundColor: isActive ? "var(--bg-app)" : isHovered ? "var(--bg-card)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "background-color 0.12s ease, color 0.12s ease",
                position: "relative",
                userSelect: "none",
                minWidth: 0,
                flexShrink: 0
              }}
            >
              {/* Active top border */}
              {isActive && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "var(--accent-primary)",
                  borderRadius: "0 0 2px 2px"
                }} />
              )}
              {getFileIcon(path)}
              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {getFileName(path)}
              </span>
              {/* Close button — only visible on hover, unsaved dot otherwise */}
              <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {isHovered || isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnsavedTabs(s => { const n = new Set(s); n.delete(path); return n; });
                      onCloseTab(path);
                    }}
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "3px",
                      border: "none",
                      background: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: 0
                    }}
                    title="Close tab"
                  >
                    <X size={11} />
                  </button>
                ) : isUnsaved ? (
                  <div style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--text-secondary)"
                  }} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb path bar */}
      {activeFile && (
        <div style={{
          display: "flex",
          alignItems: "center",
          height: "24px",
          padding: "0 12px",
          backgroundColor: "var(--bg-app)",
          borderBottom: "1px solid var(--border-color)",
          fontSize: "11px",
          color: "var(--text-muted)",
          gap: "2px",
          overflowX: "auto",
          userSelect: "none"
        }}>
          {getBreadcrumb(activeFile).map((part, i, arr) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
              <span style={{
                color: i === arr.length - 1 ? "var(--text-secondary)" : "var(--text-muted)",
                fontWeight: i === arr.length - 1 ? 500 : 400
              }}>{part}</span>
              {i < arr.length - 1 && <ChevronRight size={10} style={{ color: "var(--text-muted)", opacity: 0.5 }} />}
            </span>
          ))}
        </div>
      )}

      {/* Editor Body */}
      <div style={{ flex: 1, position: "relative" }}>
        {activeFile && /\.(png|jpe?g|gif|ico|webp)$/i.test(activeFile) ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            backgroundColor: "var(--bg-app)",
            overflow: "auto",
            padding: "20px"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              padding: "24px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)",
              maxWidth: "90%",
              maxHeight: "90%"
            }}>
              {activeContent.startsWith("data:") ? (
                <img
                  src={activeContent}
                  alt={getFileName(activeFile)}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "60vh",
                    objectFit: "contain",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
                  }}
                />
              ) : (
                <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "12px" }}>
                  Loading image preview...
                </div>
              )}
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                {getFileName(activeFile)}
              </div>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={activeFile.endsWith(".md") ? "markdown" : activeFile.endsWith(".json") ? "json" : "typescript"}
            theme={currentTheme === "light" ? "vs" : "vs-dark"}
            value={activeContent}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: true,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
              fontLigatures: true,
              padding: { top: 12 },
              renderLineHighlight: "gutter",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
              lineHeight: 1.7
            }}
            onChange={(val) => {
              setUnsavedTabs(s => new Set(s).add(activeFile));
              onChangeContent(activeFile, val || "");
            }}
          />
        )}
      </div>
    </div>
  );
}
