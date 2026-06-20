import { useState, useEffect } from "react";
import {
  X, Key, Palette, Check, Plus, Trash2, Edit2,
  RefreshCw, Server, Zap, Puzzle, Circle, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, ChevronRight, Maximize2
} from "lucide-react";
import { Theme } from "../hooks/useTheme";
import { Button, Input, IconButton } from "./CoreUI";
import { useMCPServers, MCPServer } from "../hooks/useMCPServers";

interface SettingsPanelProps {
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

/* ── Built-in Skills catalog ─────────────────────────────────── */
const BUILTIN_SKILLS = [
  { id: "agency-backend-architect",  name: "Backend Architect",     category: "Dev",     description: "Scalable system design, database, cloud infrastructure" },
  { id: "agency-frontend-developer", name: "Frontend Developer",    category: "Dev",     description: "React/Vue/Angular, modern web technologies" },
  { id: "agency-seo-specialist",     name: "SEO Specialist",        category: "Growth",  description: "Technical SEO, content optimization, link building" },
  { id: "agency-growth-hacker",      name: "Growth Hacker",         category: "Growth",  description: "Viral loops, conversion funnels, acquisition channels" },
  { id: "agency-content-creator",    name: "Content Creator",       category: "Content", description: "Editorial calendars, copy, multi-platform campaigns" },
  { id: "agency-security-engineer",  name: "Security Engineer",     category: "Dev",     description: "Threat modeling, vulnerability assessment, secure code" },
  { id: "agency-mcp-builder",        name: "MCP Builder",           category: "Dev",     description: "Model Context Protocol server development" },
  { id: "agency-ai-engineer",        name: "AI Engineer",           category: "Dev",     description: "LLM pipelines, RAG, agent architectures" },
  { id: "agency-tiktok-strategist",  name: "TikTok Strategist",     category: "Social",  description: "Viral content, algorithm optimization, community" },
  { id: "agency-data-engineer",      name: "Data Engineer",         category: "Dev",     description: "Pipelines, ETL, BigQuery, dbt, Dataform" },
  { id: "find-skills",               name: "Find Skills",           category: "Dev",     description: "Helps users discover and install agent skills when they ask questions or need new capabilities." },
];

const STORAGE_KEY_SKILLS = "factory-ide:enabled-skills";

function loadEnabledSkills(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SKILLS);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  // Default: all enabled
  return new Set(BUILTIN_SKILLS.map(s => s.id));
}

/* ── Status dot ─────────────────────────────────────────────── */
function StatusDot({ status }: { status: MCPServer["status"] }) {
  if (status === "connected") return <CheckCircle2 size={12} style={{ color: "var(--accent-green)", flexShrink: 0 }} />;
  if (status === "error")     return <AlertCircle  size={12} style={{ color: "var(--accent-red)",   flexShrink: 0 }} />;
  if (status === "connecting")return <Loader2      size={12} style={{ color: "var(--accent-yellow)", animation: "spin 1s linear infinite", flexShrink: 0 }} />;
  return                             <Circle       size={12} style={{ color: "var(--text-muted)",   flexShrink: 0 }} />;
}

/* ── Toggle Switch ───────────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        background: on ? "var(--accent-primary)" : "var(--bg-card)",
        border: "1px solid " + (on ? "var(--accent-primary)" : "var(--border-color)"),
        borderRadius: "999px",
        width: "36px",
        height: "20px",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s ease, border-color 0.2s ease",
        flexShrink: 0
      }}
    >
      <div style={{
        position: "absolute",
        top: "2px",
        left: on ? "18px" : "2px",
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s ease"
      }} />
    </button>
  );
}

/* ── Add MCP Server Modal ────────────────────────────────────── */
function AddMCPModal({ onAdd, onClose }: { onAdd: (name: string, cmd: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [cmd, setCmd] = useState("");
  const [type, setType] = useState<"stdio" | "http">("stdio");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)"
    }}>
      <div style={{
        width: "480px", background: "var(--bg-panel)",
        border: "1px solid var(--border-color)", borderRadius: "12px",
        padding: "24px", display: "flex", flexDirection: "column", gap: "16px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Add MCP Server</h3>
          <IconButton icon={<X size={16} />} onClick={onClose} tooltip="Close" tooltipPosition="left" />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["stdio", "http"] as const).map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid",
              borderColor: type === t ? "var(--accent-primary)" : "var(--border-color)",
              background: type === t ? "rgba(99,102,241,0.08)" : "var(--bg-card)",
              color: type === t ? "var(--accent-primary)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: "12px", fontWeight: 500
            }}>
              {t === "stdio" ? "⚡ stdio (local)" : "🌐 HTTP / SSE"}
            </button>
          ))}
        </div>
        <Input label="Server Name" placeholder="e.g. memory, github, slack" value={name} onChange={e => setName(e.target.value)} />
        <Input
          label={type === "stdio" ? "Command" : "Server URL"}
          placeholder={type === "stdio" ? "npx -y @modelcontextprotocol/server-memory" : "http://localhost:3333/mcp"}
          value={cmd}
          onChange={e => setCmd(e.target.value)}
        />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { if (name && cmd) { onAdd(name, cmd); onClose(); } }}>
            Add Server
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Skill Modal ────────────────────────────────────────── */
function AddSkillModal({ onAdd, onClose }: { onAdd: (name: string, category: string, desc: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [tempDesc, setTempDesc] = useState("");

  const handleImport = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      let targetUrl = url;
      try {
        const u = new URL(url);
        if (u.hostname === "github.com") {
          const parts = u.pathname.split("/").filter(Boolean);
          if (parts[2] === "blob") {
            parts.splice(2, 1);
            targetUrl = `https://raw.githubusercontent.com/${parts.join("/")}`;
          }
        }
      } catch {}

      let data;
      const isTauri = typeof window !== "undefined" && (window as any).__TAURI__ !== undefined;
      if (!isTauri) {
        try {
          const res = await fetch(`http://localhost:3001/api/skills/import?url=${encodeURIComponent(url)}`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {
          console.warn("Backend proxy failed, falling back to direct fetch", e);
        }
      }

      if (!data) {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const text = await res.text();
        
        let parsedName = "";
        let parsedCategory = "Custom";
        let parsedDescription = "";

        const yamlRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
        const match = text.match(yamlRegex);
        if (match) {
          const yamlContent = match[1];
          const lines = yamlContent.split("\n");
          for (const line of lines) {
            const idx = line.indexOf(":");
            if (idx !== -1) {
              const key = line.substring(0, idx).trim().toLowerCase();
              const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
              if (key === "name" || key === "title") parsedName = val;
              else if (key === "category") parsedCategory = val;
              else if (key === "description") parsedDescription = val;
            }
          }
        }

        if (!parsedName) {
          const h1Match = text.match(/^#\s+(.*)/m);
          if (h1Match) {
            parsedName = h1Match[1].trim();
          } else {
            const parts = targetUrl.split("/");
            parsedName = parts[parts.length - 1].replace(/\.md$/i, "");
          }
        }

        if (!parsedDescription) {
          const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p && !p.startsWith("#") && !p.startsWith("---"));
          if (paragraphs.length > 0) {
            parsedDescription = paragraphs[0].replace(/[*#`_\-]/g, "").substring(0, 160).trim();
          }
        }

        data = { name: parsedName, category: parsedCategory, description: parsedDescription };
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setName(data.name || "");
      setCategory(data.category || "Custom");
      setDesc(data.description || "");
    } catch (err) {
      setError("Failed to fetch/parse skill from URL.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)"
    }}>
      <div style={{
        width: "460px", background: "var(--bg-panel)",
        border: "1px solid var(--border-color)", borderRadius: "12px",
        padding: "24px", display: "flex", flexDirection: "column", gap: "16px",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Add Custom Skill</h3>
          <IconButton icon={<X size={16} />} onClick={onClose} tooltip="Close" tooltipPosition="left" />
        </div>

        {/* URL Import row */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>Import from GitHub / Web URL</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. https://github.com/.../SKILL.md"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "13px",
                border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                color: "var(--text-primary)", outline: "none"
              }}
            />
            <Button
              variant="secondary"
              onClick={handleImport}
              disabled={loading || !url}
              style={{ display: "flex", alignItems: "center", gap: "4px", height: "36px", padding: "0 12px", fontSize: "12px" }}
            >
              {loading ? <Loader2 size={13} className="spin" style={{ animation: "spin 1s linear infinite" }} /> : "Fetch"}
            </Button>
          </div>
          {error && <span style={{ fontSize: "11px", color: "var(--accent-red)" }}>{error}</span>}
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0" }} />

        <Input label="Skill Name" placeholder="e.g. Database Auditor, Shopify Expert" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Category" placeholder="e.g. Dev, Growth, Content, Custom" value={category} onChange={e => setCategory(e.target.value)} />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Description</label>
            <button
              type="button"
              onClick={() => { setTempDesc(desc); setIsMaximized(true); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: "2px", display: "flex", alignItems: "center"
              }}
              title="Maximize Editor"
            >
              <Maximize2 size={13} />
            </button>
          </div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe what this skill does..."
            style={{
              padding: "8px 12px", borderRadius: "6px", fontSize: "13px",
              border: "1px solid var(--border-color)", background: "var(--bg-panel)",
              color: "var(--text-primary)", outline: "none", minHeight: "80px", resize: "vertical",
              fontFamily: "inherit"
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { if (name && category && desc) { onAdd(name, category, desc); onClose(); } }} disabled={!name || !category || !desc}>
            Add Skill
          </Button>
        </div>

        {isMaximized && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "var(--bg-panel)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            zIndex: 10
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Edit Description</h3>
              <IconButton icon={<X size={16} />} onClick={() => setIsMaximized(false)} tooltip="Close" tooltipPosition="left" />
            </div>
            <textarea
              value={tempDesc}
              onChange={e => setTempDesc(e.target.value)}
              placeholder="Describe what this skill does..."
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                outline: "none",
                fontFamily: "var(--font-mono, monospace)",
                lineHeight: "1.5",
                resize: "none"
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setIsMaximized(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { setDesc(tempDesc); setIsMaximized(false); }}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Settings Panel ─────────────────────────────────────── */
export function SettingsPanel({ onClose, currentTheme, onThemeChange }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"mcp" | "skills" | "byok" | "appearance">("mcp");
  const [showAddMCP, setShowAddMCP] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(loadEnabledSkills);
  const [skillFilter, setSkillFilter] = useState("");
  const [saved, setSaved] = useState(false);

  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCommandOrUrl, setEditCommandOrUrl] = useState("");

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillCategory, setEditSkillCategory] = useState("");
  const [editSkillDescription, setEditSkillDescription] = useState("");

  const [showAddSkill, setShowAddSkill] = useState(false);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [fullDescriptions, setFullDescriptions] = useState<Record<string, string>>({});
  const [loadingSkillId, setLoadingSkillId] = useState<string | null>(null);
  const [maximizedSkillId, setMaximizedSkillId] = useState<string | null>(null);
  const [maximizedTempDesc, setMaximizedTempDesc] = useState("");

  const getCompactDescription = (desc: string) => {
    if (!desc) return "";
    let clean = desc.replace(/^---\r?\n[\s\S]*?\r?\n---/, "").trim();
    clean = clean.replace(/^#+\s+/gm, "");
    const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";
    if (firstLine.length > 120) {
      return firstLine.substring(0, 120) + "...";
    }
    return firstLine;
  };

  const handleToggleExpandSkill = async (id: string, isCustom: boolean) => {
    if (expandedSkillId === id) {
      setExpandedSkillId(null);
      return;
    }
    setExpandedSkillId(id);
    if (!isCustom && !fullDescriptions[id]) {
      setLoadingSkillId(id);
      try {
        const res = await fetch(`http://localhost:3001/api/skills/local-content?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            setFullDescriptions(prev => ({ ...prev, [id]: data.content }));
          }
        }
      } catch (err) {
        console.error("Failed to load local skill content", err);
      } finally {
        setLoadingSkillId(null);
      }
    }
  };

  useEffect(() => {
    const loadAllBuiltinDescriptions = async () => {
      try {
        await Promise.all(
          BUILTIN_SKILLS.map(async (skill) => {
            try {
              const res = await fetch(`http://localhost:3001/api/skills/local-content?id=${skill.id}`);
              if (res.ok) {
                const data = await res.json();
                if (data.content) {
                  setFullDescriptions(prev => ({ ...prev, [skill.id]: data.content }));
                }
              }
            } catch (err) {
              console.error(`Failed to load description for ${skill.id}`, err);
            }
          })
        );
      } catch (err) {
        console.error("Failed to load built-in descriptions", err);
      }
    };
    loadAllBuiltinDescriptions();
  }, []);

  const [customSkills, setCustomSkills] = useState<{ id: string; name: string; category: string; description: string; custom?: boolean }[]>(() => {
    try {
      const raw = localStorage.getItem("factory-ide:custom-skills");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const [modifiedBuiltinSkills, setModifiedBuiltinSkills] = useState<Record<string, { name?: string; category?: string; description?: string }>>(() => {
    try {
      const raw = localStorage.getItem("factory-ide:modified-builtin-skills");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const [customKeys, setCustomKeys] = useState<{ id: string; name: string; value: string }[]>(() => {
    try {
      const raw = localStorage.getItem("factory-ide:custom-api-keys");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  const [keys, setKeys] = useState({ openai: "", anthropic: "", google: "", apify: "", slack: "", notion: "" });
  const { servers, addServer, removeServer, toggleServer, refreshServer, updateServer, connectedCount, totalTools } = useMCPServers();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("factory-byok-keys");
      if (raw) setKeys(JSON.parse(raw));
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem("factory-byok-keys", JSON.stringify(keys));
    localStorage.setItem(STORAGE_KEY_SKILLS, JSON.stringify([...enabledSkills]));
    localStorage.setItem("factory-ide:custom-skills", JSON.stringify(customSkills));
    localStorage.setItem("factory-ide:modified-builtin-skills", JSON.stringify(modifiedBuiltinSkills));
    localStorage.setItem("factory-ide:custom-api-keys", JSON.stringify(customKeys));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddSkill = (name: string, category: string, description: string) => {
    const newSkill = {
      id: `custom-skill-${Date.now()}`,
      name,
      category,
      description,
      custom: true
    };
    setCustomSkills(prev => [...prev, newSkill]);
    setEnabledSkills(prev => {
      const next = new Set(prev);
      next.add(newSkill.id);
      return next;
    });
  };

  const handleDeleteSkill = (id: string) => {
    setCustomSkills(prev => prev.filter(s => s.id !== id));
    setEnabledSkills(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSaveSkill = (id: string, name: string, category: string, description: string) => {
    const isCustom = customSkills.some(s => s.id === id);
    if (isCustom) {
      setCustomSkills(prev =>
        prev.map(s => s.id === id ? { ...s, name, category, description } : s)
      );
    } else {
      setModifiedBuiltinSkills(prev => ({
        ...prev,
        [id]: { name, category, description }
      }));
    }
  };

  const handleUpdateCustomKey = (id: string, value: string) => {
    setCustomKeys(prev => prev.map(k => k.id === id ? { ...k, value } : k));
  };

  const handleDeleteCustomKey = (id: string) => {
    setCustomKeys(prev => prev.filter(k => k.id !== id));
  };

  const handleAddCustomKey = () => {
    if (newKeyName && newKeyValue) {
      setCustomKeys(prev => [...prev, {
        id: `custom-key-${Date.now()}`,
        name: newKeyName,
        value: newKeyValue
      }]);
      setNewKeyName("");
      setNewKeyValue("");
    }
  };

  const toggleSkill = (id: string) => {
    setEnabledSkills(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSkills = [
    ...BUILTIN_SKILLS.map(s => {
      const modified = modifiedBuiltinSkills[s.id];
      return {
        ...s,
        name: modified?.name || s.name,
        category: modified?.category || s.category,
        description: modified?.description || s.description,
        custom: false
      };
    }),
    ...customSkills
  ];
  const categories = [...new Set(allSkills.map(s => s.category))];
  const filteredSkills = allSkills.filter(s =>
    s.name.toLowerCase().includes(skillFilter.toLowerCase()) ||
    s.description.toLowerCase().includes(skillFilter.toLowerCase())
  );

  const tabs = [
    { id: "mcp",        icon: <Server size={13} />,  label: "MCP Servers" },
    { id: "skills",     icon: <Zap size={13} />,     label: "Skills" },
    { id: "byok",       icon: <Key size={13} />,     label: "API Keys" },
    { id: "appearance", icon: <Palette size={13} />, label: "Appearance" },
  ] as const;

  return (
    <>
      {showAddMCP && <AddMCPModal onAdd={addServer} onClose={() => setShowAddMCP(false)} />}
      {showAddSkill && <AddSkillModal onAdd={handleAddSkill} onClose={() => setShowAddSkill(false)} />}

      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "6vh",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(2px)"
      }} onClick={onClose}>
        <div
          style={{
            width: "640px", maxHeight: "82vh",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative"
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "18px 20px 0",
            flexShrink: 0
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 600 }}>Customizations</h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                Configure default behaviors, skills, and MCP servers.
              </p>
            </div>
            <IconButton icon={<X size={18} />} onClick={onClose} tooltip="Close" tooltipPosition="left" />
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: "2px", padding: "14px 16px 0",
            borderBottom: "1px solid var(--border-color)",
            flexShrink: 0
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px 8px 0 0",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
                  color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: activeTab === tab.id ? 500 : 400,
                  marginBottom: "-1px",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

            {/* ── MCP SERVERS ── */}
            {activeTab === "mcp" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Stats bar */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>{connectedCount}</span> connected · <span style={{ fontWeight: 600 }}>{totalTools}</span> tools enabled
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setShowAddMCP(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-color)",
                        background: "var(--accent-primary)", color: "#fff",
                        cursor: "pointer", fontSize: "11px", fontWeight: 500
                      }}
                    >
                      <Plus size={11} /> Add MCP
                    </button>
                    <button style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-color)",
                      background: "var(--bg-panel)", color: "var(--text-secondary)",
                      cursor: "pointer", fontSize: "11px"
                    }}>
                      <RefreshCw size={11} /> Refresh
                    </button>
                  </div>
                </div>

                {/* Server list */}
                {servers.map(server => (
                  <div key={server.id} style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "var(--bg-card)"
                  }}>
                    {editingServerId === server.id ? (
                      /* Inline Edit Form */
                      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-primary)" }}>Edit MCP Server</span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {server.builtIn ? "Built-in (Name is read-only)" : "Custom Server"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>Server Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              disabled={server.builtIn}
                              style={{
                                width: "100%", padding: "6px 8px", borderRadius: "6px", fontSize: "12px",
                                border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                                color: server.builtIn ? "var(--text-muted)" : "var(--text-primary)", outline: "none"
                              }}
                            />
                          </div>
                          <div style={{ flex: 2 }}>
                            <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
                              {editCommandOrUrl.startsWith("http") ? "Server URL" : "Command"}
                            </label>
                            <input
                              type="text"
                              value={editCommandOrUrl}
                              onChange={e => setEditCommandOrUrl(e.target.value)}
                              placeholder={editCommandOrUrl.startsWith("http") ? "http://localhost:3000" : "npx -y ..."}
                              style={{
                                width: "100%", padding: "6px 8px", borderRadius: "6px", fontSize: "12px",
                                border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                                color: "var(--text-primary)", outline: "none"
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                          <button
                            onClick={() => setEditingServerId(null)}
                            style={{
                              padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-color)",
                              background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px"
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editName && editCommandOrUrl) {
                                updateServer(server.id, editName, editCommandOrUrl);
                                setEditingServerId(null);
                              }
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: "6px", border: "none",
                              background: "var(--accent-primary)", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 500
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Server row */
                      <div style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "12px 14px"
                      }}>
                        <StatusDot status={server.status} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 500, fontSize: "13px" }}>{server.name}</span>
                            {server.builtIn && (
                              <span style={{
                                fontSize: "9px", padding: "1px 6px", borderRadius: "4px",
                                background: "var(--bg-panel)", border: "1px solid var(--border-color)",
                                color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase"
                              }}>built-in</span>
                            )}
                            {server.toolCount && server.status === "connected" && (
                              <span style={{ fontSize: "11px", color: "var(--accent-green)" }}>
                                ▸ {server.toolCount} tools enabled
                              </span>
                            )}
                          </div>
                          {server.status === "error" && server.errorMsg && (
                            <div style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "2px" }}>
                              Error: {server.errorMsg}
                            </div>
                          )}
                          {(server.command || server.url) && (
                            <div
                              style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", cursor: "pointer", fontFamily: "monospace" }}
                              onClick={() => setExpandedServer(expandedServer === server.id ? null : server.id)}
                            >
                              {expandedServer === server.id ? <ChevronDown size={10} style={{ display: "inline" }} /> : <ChevronRight size={10} style={{ display: "inline" }} />}
                              {" "}{server.command || server.url}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <button onClick={() => {
                            setEditingServerId(server.id);
                            setEditName(server.name);
                            setEditCommandOrUrl(server.command || server.url || "");
                          }} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", padding: "4px"
                          }} title="Edit Config">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => refreshServer(server.id)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", padding: "4px"
                          }} title="Refresh">
                            <RefreshCw size={13} />
                          </button>
                          {!server.builtIn && (
                            <button onClick={() => removeServer(server.id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "var(--accent-red)", padding: "4px"
                            }} title="Remove">
                              <Trash2 size={13} />
                            </button>
                          )}
                          <Toggle on={server.enabled} onChange={() => toggleServer(server.id)} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  MCP servers extend the agent with tools, resources, and prompts. stdio servers run locally; HTTP/SSE servers connect to remote endpoints.
                </p>
              </div>
            )}

            {/* ── SKILLS ── */}
            {activeTab === "skills" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Stats bar */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{enabledSkills.size}</span> of {allSkills.length} skills active
                  </span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => setShowAddSkill(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-color)",
                        background: "var(--accent-primary)", color: "#fff",
                        cursor: "pointer", fontSize: "11px", fontWeight: 500
                      }}
                    >
                      <Plus size={11} /> Add Skill
                    </button>
                    <input
                      placeholder="Filter skills..."
                      value={skillFilter}
                      onChange={e => setSkillFilter(e.target.value)}
                      style={{
                        padding: "4px 8px", borderRadius: "6px", fontSize: "11px",
                        border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                        color: "var(--text-primary)", outline: "none", width: "120px"
                      }}
                    />
                  </div>
                </div>

                {categories.map(cat => {
                  const catSkills = filteredSkills.filter(s => s.category === cat);
                  if (!catSkills.length) return null;
                  return (
                    <div key={cat}>
                      <div style={{
                        fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
                        color: "var(--text-muted)", textTransform: "uppercase",
                        marginBottom: "6px", paddingLeft: "2px"
                      }}>{cat}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {catSkills.map(skill => (
                          <div key={skill.id} style={{
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            overflow: "hidden",
                            background: "var(--bg-card)",
                            transition: "border-color 0.15s ease"
                          }}>
                            {editingSkillId === skill.id ? (
                              /* Inline Edit Form for Skill */
                              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-primary)" }}>Edit Skill</span>
                                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                    {skill.custom ? "Custom Skill" : "Built-in Skill"}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>Skill Name</label>
                                    <input
                                      type="text"
                                      value={editSkillName}
                                      onChange={e => setEditSkillName(e.target.value)}
                                      style={{
                                        width: "100%", padding: "6px 8px", borderRadius: "6px", fontSize: "12px",
                                        border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                                        color: "var(--text-primary)", outline: "none"
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>Category</label>
                                    <input
                                      type="text"
                                      value={editSkillCategory}
                                      onChange={e => setEditSkillCategory(e.target.value)}
                                      style={{
                                        width: "100%", padding: "6px 8px", borderRadius: "6px", fontSize: "12px",
                                        border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                                        color: "var(--text-primary)", outline: "none"
                                      }}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", margin: 0 }}>Description</label>
                                    <button
                                      type="button"
                                      onClick={() => { setMaximizedTempDesc(editSkillDescription); setMaximizedSkillId(skill.id); }}
                                      style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        color: "var(--text-muted)", padding: "2px", display: "flex", alignItems: "center"
                                      }}
                                      title="Maximize Editor"
                                    >
                                      <Maximize2 size={13} />
                                    </button>
                                  </div>
                                  <textarea
                                    value={editSkillDescription}
                                    onChange={e => setEditSkillDescription(e.target.value)}
                                    style={{
                                      width: "100%", padding: "6px 8px", borderRadius: "6px", fontSize: "12px",
                                      border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                                      color: "var(--text-primary)", outline: "none", minHeight: "50px", resize: "vertical",
                                      fontFamily: "inherit"
                                    }}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                                  <button
                                    onClick={() => setEditingSkillId(null)}
                                    style={{
                                      padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-color)",
                                      background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px"
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (editSkillName && editSkillCategory && editSkillDescription) {
                                        handleSaveSkill(skill.id, editSkillName, editSkillCategory, editSkillDescription);
                                        setEditingSkillId(null);
                                      }
                                    }}
                                    style={{
                                      padding: "4px 10px", borderRadius: "6px", border: "none",
                                      background: "var(--accent-primary)", color: "#fff", cursor: "pointer", fontSize: "11px", fontWeight: 500
                                    }}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Normal Skill Row */
                              <div style={{
                                display: "flex",
                                flexDirection: "column",
                                padding: "10px 12px"
                              }}>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}>
                                  <button
                                    onClick={() => handleToggleExpandSkill(skill.id, !!skill.custom)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "var(--text-muted)",
                                      padding: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}
                                  >
                                    {expandedSkillId === skill.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  <div 
                                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                                    onClick={() => handleToggleExpandSkill(skill.id, !!skill.custom)}
                                  >
                                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{skill.name}</div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                      {getCompactDescription(skill.description)}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                    <button
                                      onClick={() => {
                                        setEditingSkillId(skill.id);
                                        setEditSkillName(skill.name);
                                        setEditSkillCategory(skill.category);
                                        setEditSkillDescription(
                                          modifiedBuiltinSkills[skill.id]?.description || fullDescriptions[skill.id] || skill.description
                                        );
                                      }}
                                      style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        color: "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center"
                                      }}
                                      title="Edit skill"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    {skill.custom && (
                                      <button
                                        onClick={() => handleDeleteSkill(skill.id)}
                                        style={{
                                          background: "none", border: "none", cursor: "pointer",
                                          color: "var(--accent-red)", padding: "4px", display: "flex", alignItems: "center"
                                        }}
                                        title="Delete custom skill"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                    <Toggle on={enabledSkills.has(skill.id)} onChange={() => toggleSkill(skill.id)} />
                                  </div>
                                </div>
                                {expandedSkillId === skill.id && (
                                  <div style={{
                                    marginTop: "8px",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    background: "rgba(255, 255, 255, 0.03)",
                                    border: "1px solid var(--border-color)",
                                    maxHeight: "240px",
                                    overflowY: "auto",
                                    fontSize: "12px",
                                    color: "var(--text-secondary)",
                                    whiteSpace: "pre-wrap",
                                    fontFamily: "var(--font-mono, monospace)",
                                    lineHeight: "1.5"
                                  }}>
                                    {loadingSkillId === skill.id ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                                        <Loader2 size={12} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                                        Loading full description...
                                      </div>
                                    ) : (
                                      skill.custom ? skill.description : (fullDescriptions[skill.id] || skill.description)
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div style={{
                  padding: "12px", borderRadius: "8px",
                  border: "1px dashed var(--border-color)",
                  textAlign: "center", fontSize: "12px", color: "var(--text-muted)"
                }}>
                  <Puzzle size={16} style={{ display: "block", margin: "0 auto 6px", opacity: 0.5 }} />
                  More skills available from ~/.gemini/config/skills — open settings to load them
                </div>
              </div>
            )}

            {/* ── API KEYS ── */}
            {activeTab === "byok" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                  Keys are stored in browser localStorage and never sent to external servers except direct API calls.
                </p>
                <Input label="OpenAI API Key"           type="password" placeholder="sk-..."          value={keys.openai}    onChange={e => setKeys(k => ({ ...k, openai: e.target.value }))} />
                <Input label="Anthropic Claude Key"     type="password" placeholder="sk-ant-..."      value={keys.anthropic} onChange={e => setKeys(k => ({ ...k, anthropic: e.target.value }))} />
                <Input label="Google Gemini Key"        type="password" placeholder="AIzaSy..."       value={keys.google}    onChange={e => setKeys(k => ({ ...k, google: e.target.value }))} />
                <Input label="Apify API Token"          type="password" placeholder="apify_api_..."   value={keys.apify}     onChange={e => setKeys(k => ({ ...k, apify: e.target.value }))} />
                <Input label="Slack Webhook URL"        type="text"     placeholder="https://hooks.slack.com/..." value={keys.slack} onChange={e => setKeys(k => ({ ...k, slack: e.target.value }))} />
                <Input label="Notion Integration Token" type="password" placeholder="secret_..."       value={keys.notion}   onChange={e => setKeys(k => ({ ...k, notion: e.target.value }))} />

                {/* Custom Keys Section */}
                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>Custom Keys & Providers</h4>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                        Configure API keys or secrets for other services and integrations.
                      </p>
                    </div>
                  </div>
                  
                  {/* List of Custom Keys */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {customKeys.map(k => (
                      <div key={k.id} style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <Input
                            label={k.name}
                            type="password"
                            placeholder="Enter key/secret..."
                            value={k.value}
                            onChange={e => handleUpdateCustomKey(k.id, e.target.value)}
                          />
                        </div>
                        <IconButton
                          icon={<Trash2 size={14} />}
                          onClick={() => handleDeleteCustomKey(k.id)}
                          style={{ color: "var(--accent-red)", marginBottom: "4px" }}
                          tooltip="Delete Key"
                          tooltipPosition="left"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add New Key Form */}
                  <div style={{
                    marginTop: "14px", padding: "12px", background: "var(--bg-card)",
                    border: "1px dashed var(--border-color)", borderRadius: "8px",
                    display: "flex", flexDirection: "column", gap: "8px"
                  }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>+ Add Provider Key</span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <input
                          placeholder="Key Name (e.g. GITHUB_TOKEN)"
                          value={newKeyName}
                          onChange={e => setNewKeyName(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 10px", borderRadius: "6px", fontSize: "12px",
                            border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                            color: "var(--text-primary)", outline: "none"
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="password"
                          placeholder="Secret Value"
                          value={newKeyValue}
                          onChange={e => setNewKeyValue(e.target.value)}
                          style={{
                            width: "100%", padding: "6px 10px", borderRadius: "6px", fontSize: "12px",
                            border: "1px solid var(--border-color)", background: "var(--bg-panel)",
                            color: "var(--text-primary)", outline: "none"
                          }}
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleAddCustomKey}
                        style={{ padding: "6px 12px", fontSize: "12px", height: "30px", display: "flex", alignItems: "center" }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── APPEARANCE ── */}
            {activeTab === "appearance" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                  Choose a theme. The layout adapts immediately.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[
                    { id: "glass",         label: "Glassmorphic",    dot: "linear-gradient(135deg, #4f46e5, #06b6d4)", dotBorder: "none" },
                    { id: "dark",          label: "Solid Dark",       dot: "#16161a", dotBorder: "1px solid #333" },
                    { id: "light",         label: "Solid Light",      dot: "#ffffff", dotBorder: "1px solid #ddd" },
                    { id: "high-contrast", label: "High Contrast",    dot: "#000000", dotBorder: "1px solid #ffff00" },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => onThemeChange(t.id as Theme)}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: `1px solid ${currentTheme === t.id ? "var(--accent-primary)" : "var(--border-color)"}`,
                        background: currentTheme === t.id ? "rgba(99,102,241,0.06)" : "var(--bg-card)",
                        cursor: "pointer", textAlign: "left", color: "var(--text-primary)"
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%",
                        background: t.dot, border: t.dotBorder, flexShrink: 0
                      }} />
                      <span style={{ fontSize: "13px", fontWeight: currentTheme === t.id ? 500 : 400 }}>
                        {t.label}
                      </span>
                      {currentTheme === t.id && <Check size={13} style={{ marginLeft: "auto", color: "var(--accent-primary)" }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: "8px",
            padding: "14px 20px",
            borderTop: "1px solid var(--border-color)",
            flexShrink: 0
          }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={handleSave} style={{ minWidth: "100px", justifyContent: "center" }}>
              {saved ? <><Check size={13} /> Saved</> : "Save Config"}
            </Button>
          </div>

          {maximizedSkillId && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "var(--bg-panel)",
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              zIndex: 100
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Edit Description</h3>
                <IconButton icon={<X size={16} />} onClick={() => setMaximizedSkillId(null)} tooltip="Close" tooltipPosition="left" />
              </div>
              <textarea
                value={maximizedTempDesc}
                onChange={e => setMaximizedTempDesc(e.target.value)}
                placeholder="Describe what this skill does..."
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  outline: "none",
                  fontFamily: "var(--font-mono, monospace)",
                  lineHeight: "1.5",
                  resize: "none"
                }}
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setMaximizedSkillId(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => {
                  setEditSkillDescription(maximizedTempDesc);
                  setMaximizedSkillId(null);
                }}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
