import { useState, useRef, useEffect } from "react";

/* ── Menu Data Structure ──────────────────────────────────────── */

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  toggle?: boolean;
  checked?: boolean;
  submenu?: MenuItem[];
  disabled?: boolean;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
}

/* ── Props ────────────────────────────────────────────────────── */

interface MenuBarProps {
  onNewAgent?: () => void;
  onOpenFolder?: () => void;
  onNewTerminal?: () => void;
  onNewBrowser?: () => void;
  onShowSettings?: () => void;
  onToggleChanges?: () => void;
  onToggleBrowser?: () => void;
  onToggleFiles?: () => void;
  onToggleTerminal?: () => void;
  onToggleStatusBar?: () => void;
  onCommandPalette?: () => void;
  statusBarVisible?: boolean;
  onAbout?: () => void;
  onCloseFolder?: () => void;
  children?: React.ReactNode;
}

/* ── Component ────────────────────────────────────────────────── */

export function MenuBar({
  onNewAgent,
  onOpenFolder,
  onNewTerminal,
  onNewBrowser,
  onShowSettings,
  onToggleChanges,
  onToggleBrowser,
  onToggleFiles,
  onToggleTerminal,
  onToggleStatusBar,
  onCommandPalette,
  statusBarVisible = true,
  onAbout,
  onCloseFolder,
  children
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Build menu structure
  const menus: MenuCategory[] = [
    {
      label: "Factory IDE",
      items: [
        { label: "About Factory IDE", action: onAbout },
        { label: "Check for Updates...", action: () => {} },
        { label: "", divider: true },
        { label: "Settings", shortcut: "⌘,", action: onShowSettings },
        { label: "", divider: true },
        { label: "Hide Factory IDE", shortcut: "⌘H", action: () => {} },
        { label: "Hide Others", shortcut: "⌥⌘H", action: () => {} },
        { label: "Show All", action: () => {} },
        { label: "", divider: true },
        { label: "Quit Factory IDE", shortcut: "⌘Q", action: () => {} }
      ]
    },
    {
      label: "File",
      items: [
        { label: "New Agent", shortcut: "⌘N", action: onNewAgent },
        { label: "Open Folder", shortcut: "⌘O", action: onOpenFolder },
        { label: "Close Folder", shortcut: "⌘K F", action: onCloseFolder },
        { label: "", divider: true },
        { label: "New Terminal", action: onNewTerminal },
        { label: "New Browser", action: onNewBrowser },
        { label: "", divider: true },
        { label: "Open Editor Window", shortcut: "⌥⌘N", action: () => {} },
        { label: "About Factory IDE", action: onAbout },
        { label: "", divider: true },
        { label: "Exit", shortcut: "⌘Q", action: () => {} }
      ]
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "⌘Z", action: () => document.execCommand("undo") },
        { label: "Redo", shortcut: "⇧⌘Z", action: () => document.execCommand("redo") },
        { label: "", divider: true },
        { label: "Cut", shortcut: "⌘X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "⌘C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "⌘V", action: () => document.execCommand("paste") },
        { label: "Select All", shortcut: "⌘A", action: () => document.execCommand("selectAll") },
        { label: "", divider: true },
        { label: "Emoji & Symbols", action: () => {} }
      ]
    },
    {
      label: "View",
      items: [
        { label: "Changes", shortcut: "⌘E", action: onToggleChanges },
        { label: "Browser", shortcut: "⌘B", action: onToggleBrowser },
        { label: "Files", shortcut: "⌘G", action: onToggleFiles },
        { label: "Terminal", shortcut: "⌘J", action: onToggleTerminal },
        { label: "", divider: true },
        { label: "Status Bar", toggle: true, checked: statusBarVisible, action: onToggleStatusBar },
        { label: "", divider: true },
        { label: "Zoom In", shortcut: "⌘+", action: () => {} },
        { label: "Zoom Out", shortcut: "⌘-", action: () => {} },
        { label: "Reset Zoom", shortcut: "⌘0", action: () => {} }
      ]
    },
    {
      label: "Window",
      items: [
        { label: "Minimize", shortcut: "⌘M", action: () => {} },
        { label: "Zoom", action: () => {} },
        { label: "", divider: true },
        { label: "Fill", shortcut: "⌃⌥F", action: () => {} },
        { label: "Center", shortcut: "⌃C", action: () => {} },
        { label: "", divider: true },
        { label: "Move & Resize", action: () => {}, disabled: true },
        { label: "Full Screen Tile", action: () => {}, disabled: true },
        { label: "", divider: true },
        { label: "Switch Window...", action: () => {} },
        { label: "Bring All to Front", action: () => {} },
        { label: "", divider: true },
        { label: "Factory Agents", toggle: true, checked: true, action: () => {} }
      ]
    },
    {
      label: "Help",
      items: [
        { label: "Command Palette", shortcut: "⌘K", action: onCommandPalette },
        { label: "Keyboard Shortcuts", shortcut: "⌃⌥/", action: () => {} },
        { label: "", divider: true },
        { label: "View License", action: () => {} }
      ]
    }
  ];

  // Click outside closes menu
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Escape closes menu
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMenu(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div ref={menuRef} className="menu-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {menus.map((menu) => (
          <div
            key={menu.label}
            className={`menu-bar-item ${activeMenu === menu.label ? "active" : ""}`}
            onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => {
              if (activeMenu) setActiveMenu(menu.label);
            }}
          >
            {menu.label}

            {activeMenu === menu.label && (
              <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
                {menu.items.map((item, idx) =>
                  item.divider ? (
                    <div key={idx} className="menu-dropdown-divider" />
                  ) : (
                    <button
                      key={idx}
                      className="menu-dropdown-item"
                      disabled={item.disabled}
                      onClick={() => {
                        item.action?.();
                        setActiveMenu(null);
                      }}
                      style={{
                        opacity: item.disabled ? 0.4 : 1,
                        cursor: item.disabled ? "default" : "pointer"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {item.toggle && (
                          <span style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "3px",
                            border: "1px solid var(--border-color)",
                            background: item.checked ? "var(--accent-primary)" : "transparent",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "#fff",
                            flexShrink: 0
                          }}>
                            {item.checked && "✓"}
                          </span>
                        )}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {children && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}
