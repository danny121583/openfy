import React, { useState, useEffect, useRef } from "react";
import { Folder, FolderOpen, File, Loader, Plus, FolderPlus, Trash2, Edit, Copy, ExternalLink } from "lucide-react";
import { FileNode } from "../hooks/useFileSystem";

interface FileTreeProps {
  tree: FileNode[];
  rootName: string;
  onOpenFile: (path: string) => void;
  activeFile: string | null;
  loading: boolean;
  onDeletePath: (path: string) => void;
  onRenamePath: (oldPath: string, newPath: string) => void;
  onCreateFolder: (path: string) => void;
  onCreateFile: (path: string) => void;
  width?: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  path: string;
  isDirectory: boolean;
}

const getFileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  const lower = name.toLowerCase();

  // TypeScript
  if (ext === "ts" || ext === "tsx") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#3178c6", color: "#fff",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>TS</span>
    );
  }
  // JavaScript
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#f7df1e", color: "#1f1f1f",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>JS</span>
    );
  }
  // JSON / TOML
  if (ext === "json" || ext === "toml") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#f1e05a", color: "#1f2937",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>{ext === "toml" ? "TM" : "{}"}</span>
    );
  }
  // Markdown
  if (ext === "md" || ext === "mdx") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#008672", color: "#fff",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>MD</span>
    );
  }
  // CSS / SCSS / LESS
  if (ext === "css" || ext === "scss" || ext === "less") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#264de4", color: "#fff",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>CSS</span>
    );
  }
  // HTML
  if (ext === "html" || ext === "htm") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#e34c26", color: "#fff",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>HTM</span>
    );
  }
  // Rust
  if (ext === "rs") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#ce422b", color: "#fff",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>RS</span>
    );
  }
  // Python
  if (ext === "py") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#3572A5", color: "#fff",
        fontSize: "8px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>PY</span>
    );
  }
  // Images
  if (["png", "jpg", "jpeg", "gif", "ico", "webp", "svg"].includes(ext || "")) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "14px", height: "14px", backgroundColor: "#ec4899", color: "#fff",
        fontSize: "7px", fontWeight: "bold", borderRadius: "2px", flexShrink: 0
      }}>IMG</span>
    );
  }
  // Lock files / config
  if (lower.includes("lock") || lower === ".gitignore" || lower === ".env" || lower.endsWith(".config.js") || lower.endsWith(".config.ts")) {
    return <File size={13} style={{ color: "var(--text-muted)", flexShrink: 0, opacity: 0.6 }} />;
  }
  return <File size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />;
};


export function FileTree({
  tree,
  rootName,
  onOpenFile,
  activeFile,
  loading,
  onDeletePath,
  onRenamePath,
  onCreateFolder,
  onCreateFile,
  width
}: FileTreeProps) {
  const [isRootOpen, setIsRootOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    path: "",
    isDirectory: false
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu.visible]);

  const handleContextMenu = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      path,
      isDirectory
    });
  };

  const handleCreateFile = (parentPath: string) => {
    const name = prompt("Enter file name:");
    if (name) {
      const fullPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
      onCreateFile(fullPath);
    }
  };

  const handleCreateFolder = (parentPath: string) => {
    const name = prompt("Enter folder name:");
    if (name) {
      const fullPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
      onCreateFolder(fullPath);
    }
  };

  const handleRename = (path: string) => {
    const segments = path.split("/");
    const oldName = segments[segments.length - 1];
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (newName && newName !== oldName) {
      segments[segments.length - 1] = newName;
      const newPath = segments.join("/");
      onRenamePath(path, newPath);
    }
  };

  const handleDelete = (path: string) => {
    const segments = path.split("/");
    const name = segments[segments.length - 1];
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      onDeletePath(path);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  const handleCopyRelativePath = (path: string) => {
    // strip the leading slash
    const relative = path.startsWith("/") ? path.substring(1) : path;
    navigator.clipboard.writeText(relative);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ width: width ? `${width}px` : "220px", padding: "20px", color: "var(--text-muted)", fontSize: "12px", gap: "8px", borderRight: "1px solid var(--border-color)", backgroundColor: "var(--bg-panel)" }}>
        <Loader size={14} className="spin" style={{ animation: "spin 1.5s linear infinite" }} />
        <span>Loading workspace...</span>
      </div>
    );
  }

  return (
    <div style={{
      width: width ? `${width}px` : "220px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--bg-panel)",
      borderRight: "1px solid var(--border-color)",
      padding: "16px 8px 16px 12px",
      position: "relative",
      userSelect: "none"
    }}>
      <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", paddingLeft: "4px" }}>
        Workspace Files
      </h3>
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
        {tree.length === 0 ? (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "10px 4px", fontStyle: "italic" }}>
            No folder open.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Root Folder Row */}
            <div 
              onClick={() => setIsRootOpen(!isRootOpen)}
              onContextMenu={(e) => handleContextMenu(e, "/", true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 4px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: "4px",
                color: "var(--text-primary)",
                transition: "var(--transition-smooth)",
              }}
              className="tree-root-row"
            >
              <span style={{ fontSize: "10px", color: "var(--text-muted)", width: "12px", textAlign: "center" }}>
                {isRootOpen ? "▼" : "▶"}
              </span>
              <span style={{ textTransform: "lowercase" }}>{rootName || "workspace"}</span>
            </div>

            {/* Children under Root */}
            {isRootOpen && (
              <div style={{ paddingLeft: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                {tree.map((node) => (
                  <TreeNode 
                    key={node.path} 
                    node={node} 
                    onOpenFile={onOpenFile} 
                    activeFile={activeFile} 
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Custom Context Menu */}
      {contextMenu.visible && (
        <div 
          ref={menuRef}
          className="context-menu animate-fade-in"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 99999,
            width: "180px",
            background: "var(--bg-panel)",
            backdropFilter: "var(--blur-amount)",
            WebkitBackdropFilter: "var(--blur-amount)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            padding: "4px"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isDirectory ? (
            <>
              <button className="context-menu-item" onClick={() => { handleCreateFile(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
                <Plus size={13} /> New File...
              </button>
              <button className="context-menu-item" onClick={() => { handleCreateFolder(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
                <FolderPlus size={13} /> New Folder...
              </button>
              <div className="context-menu-divider" />
            </>
          ) : (
            <>
              <button className="context-menu-item" onClick={() => { onOpenFile(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
                <ExternalLink size={13} /> Open File
              </button>
              <div className="context-menu-divider" />
            </>
          )}

          <button className="context-menu-item" onClick={() => { handleCopyPath(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
            <Copy size={13} /> Copy Path
          </button>
          <button className="context-menu-item" onClick={() => { handleCopyRelativePath(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
            <Copy size={13} /> Copy Relative Path
          </button>
          
          {contextMenu.path !== "/" && (
            <>
              <div className="context-menu-divider" />
              <button className="context-menu-item" onClick={() => { handleRename(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
                <Edit size={13} /> Rename...
              </button>
              <button className="context-menu-item" style={{ color: "var(--accent-red)" }} onClick={() => { handleDelete(contextMenu.path); setContextMenu(p => ({ ...p, visible: false })); }}>
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface TreeNodeProps {
  node: FileNode;
  onOpenFile: (path: string) => void;
  activeFile: string | null;
  onContextMenu: (e: React.MouseEvent, path: string, isDirectory: boolean) => void;
}

function TreeNode({ node, onOpenFile, activeFile, onContextMenu }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onOpenFile(node.path);
    }
  };

  const isSelected = node.path === activeFile;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Node Row */}
      <div 
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node.path, node.isDirectory)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "4px 8px",
          fontSize: "12px",
          cursor: "pointer",
          borderRadius: "5px",
          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
          backgroundColor: isSelected ? "rgba(99,102,241,0.1)" : "transparent",
          border: isSelected ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
          transition: "background-color 0.12s ease, border-color 0.12s ease",
          fontWeight: isSelected ? 500 : 400
        }}
        className="tree-node-row"
      >
        {node.isDirectory ? (
          isOpen ? <FolderOpen size={14} style={{ color: "var(--accent-secondary)", flexShrink: 0 }} /> : <Folder size={14} style={{ color: "var(--accent-secondary)", flexShrink: 0 }} />
        ) : (
          getFileIcon(node.name)
        )}
        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontSize: "12px" }}>{node.name}</span>
      </div>

      {/* Children Nodes */}
      {node.isDirectory && isOpen && node.children && (
        <div style={{ paddingLeft: "8px", borderLeft: "1px solid var(--border-color)", marginLeft: "14px", marginTop: "2px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {node.children.map((child) => (
            <TreeNode 
              key={child.path} 
              node={child} 
              onOpenFile={onOpenFile} 
              activeFile={activeFile} 
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
