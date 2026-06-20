import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  ChevronDown,
  Search,
  FileText,
  FilePlus,
  Terminal,
  Pencil,
  Info,
  ThumbsUp,
  ThumbsDown,
  GitBranch,
  ChevronUp,
  Send,
  Check,
  AlertCircle,
  Bot,
  Plus,
  Mic
} from "lucide-react";
import { ChatMessage, TaskItem, QAPrompt, AgentStep, CompletionSummary, StepDetail } from "../hooks/useAgent";
import { Button, Card } from "./CoreUI";

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  // Helper to escape HTML tags to prevent XSS while allowing our own generated tags
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // We need to parse block-level elements first, especially code blocks.
  const placeholders: string[] = [];
  let processed = markdown;

  // Code blocks: ```js ... ```
  processed = processed.replace(/```([a-zA-Z0-9-]*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    const escapedCode = escapeHtml(code.trim());
    const placeholder = `___CODE_BLOCK_${placeholders.length}___`;
    placeholders.push(
      `<pre style="background:var(--bg-card);padding:10px 14px;border-radius:6px;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border-color);overflow-x:auto;margin:10px 0;white-space:pre;word-wrap:normal;"><code>${escapedCode}</code></pre>`
    );
    return placeholder;
  });

  // Inline code: `code`
  processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
    const escaped = escapeHtml(code);
    const placeholder = `___INLINE_CODE_${placeholders.length}___`;
    placeholders.push(
      `<code style="background:var(--bg-card);padding:2px 6px;border-radius:4px;font-size:12px;border:1px solid var(--border-color);font-family:var(--font-mono)">${escaped}</code>`
    );
    return placeholder;
  });

  // Escape HTML in the remaining text
  processed = escapeHtml(processed);

  // Bold: **text**
  processed = processed.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  processed = processed.replace(/\*([\s\S]*?)\*/g, "<em>$1</em>");
  processed = processed.replace(/_([\s\S]*?)_/g, "<em>$1</em>");

  // Links: [text](url)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: underline;">$1</a>');

  // Headers
  processed = processed.replace(/^(###)\s+(.+)$/gm, '<h4 style="margin: 14px 0 6px 0; font-size: 13px; font-weight: 600; color: var(--text-primary);">$2</h4>');
  processed = processed.replace(/^(##)\s+(.+)$/gm, '<h3 style="margin: 16px 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">$2</h3>');
  processed = processed.replace(/^(#)\s+(.+)$/gm, '<h2 style="margin: 18px 0 10px 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">$2</h2>');

  // Bullet items: * or -
  processed = processed.replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin-left: 20px; margin-bottom: 4px; list-style-type: disc;">$1</li>');

  // Numbered items: 1.
  processed = processed.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li style="margin-left: 20px; margin-bottom: 4px; list-style-type: decimal;">$2</li>');

  // Process line by line for paragraphs
  const lines = processed.split("\n");
  let inList = false;
  const outputLines: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        outputLines.push("</ul>");
        inList = false;
      }
      outputLines.push('<div style="height: 8px;"></div>');
      continue;
    }

    // Check if it's a code block placeholder or block element
    if (trimmed.startsWith("___CODE_BLOCK_") || trimmed.startsWith("<h")) {
      if (inList) {
        outputLines.push("</ul>");
        inList = false;
      }
      outputLines.push(line);
      continue;
    }

    if (trimmed.startsWith("<li")) {
      if (!inList) {
        outputLines.push('<ul style="margin: 8px 0; padding-left: 0; display: flex; flex-direction: column; gap: 4px;">');
        inList = true;
      }
      outputLines.push(line);
      continue;
    }

    // Regular line
    if (inList) {
      outputLines.push("</ul>");
      inList = false;
    }
    outputLines.push(`<p style="margin-bottom: 8px; line-height: 1.6;">${line}</p>`);
  }

  if (inList) {
    outputLines.push("</ul>");
  }

  let finalHtml = outputLines.join("\n");

  // Restore placeholders
  for (let i = placeholders.length - 1; i >= 0; i--) {
    finalHtml = finalHtml.replace(`___CODE_BLOCK_${i}___`, placeholders[i]);
    finalHtml = finalHtml.replace(`___INLINE_CODE_${i}___`, placeholders[i]);
  }

  return finalHtml;
}

/* ── Welcome Screen ──────────────────────────────────────────── */
interface WelcomeScreenProps {
  onRunAgent: (prompt: string) => void;
  promptInput: React.ReactNode;
}

function WelcomeScreen({ onRunAgent, promptInput }: WelcomeScreenProps) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      gap: "14px",
      width: "100%",
      maxWidth: "640px",
      margin: "auto",
      position: "relative",
      animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
    }}>
      {/* Home / Local Breadcrumb */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        color: "var(--text-secondary)",
        marginBottom: "4px",
        cursor: "pointer",
        userSelect: "none"
      }}>
        <span>Home</span>
        <ChevronDown size={11} style={{ color: "var(--text-muted)", opacity: 0.8 }} />
        <span style={{ color: "var(--text-muted)", opacity: 0.5 }}>|</span>
        <span style={{ color: "var(--text-muted)" }}>Local</span>
      </div>

      {/* Render the Prompt Input box here */}
      {promptInput}

      {/* Suggestion Pill */}
      <button
        onClick={() => onRunAgent("Scaffold a new project with best practices and modern tooling.")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
          fontSize: "11px",
          cursor: "pointer",
          transition: "var(--transition-smooth)",
          marginTop: "6px"
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color-active)";
          (e.currentTarget as HTMLElement).style.background = "var(--bg-panel-hover)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
          (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
        }}
      >
        <span>Plan New Idea</span>
        <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>⇧Tab</span>
      </button>

      {/* Bottom Hint */}
      <div style={{
        marginTop: "48px",
        fontSize: "11px",
        color: "var(--text-muted)",
        textAlign: "center"
      }}>
        Use <span style={{ fontFamily: "var(--font-mono)", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>/plan</span> to improve agent execution with Plan Mode
      </div>
    </div>
  );
}

/* ── Sub-Components ──────────────────────────────────────────── */

function StepIcon({ type }: { type: StepDetail["type"] }) {
  const size = 12;
  const style = { color: "var(--text-muted)", flexShrink: 0 };
  switch (type) {
    case "search": return <Search size={size} style={style} />;
    case "read": return <FileText size={size} style={style} />;
    case "create": return <FilePlus size={size} style={style} />;
    case "edit": return <Pencil size={size} style={style} />;
    case "run": return <Terminal size={size} style={style} />;
    case "info": return <Info size={size} style={style} />;
  }
}

function CollapsibleStep({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false);
  const isThought = step.label === "Thought";

  return (
    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
      <div
        onClick={() => step.details.length > 0 && setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: step.details.length > 0 ? "pointer" : "default",
          padding: "4px 0",
          userSelect: "none"
        }}
      >
        {step.status === "running" ? (
          <Loader2 size={12} className="spin" style={{ color: "var(--accent-neon)", flexShrink: 0 }} />
        ) : step.details.length > 0 ? (
          expanded ? 
            <ChevronDown size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} /> : 
            <ChevronRight size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        ) : null}
        <span style={{ fontWeight: isThought ? 400 : 500, color: "var(--text-primary)" }}>
          {step.label}
        </span>
        {step.summary && (
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            {step.summary}
          </span>
        )}
      </div>
      {expanded && step.details.length > 0 && (
        <div style={{
          marginLeft: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "4px 0 8px",
          borderLeft: "1px solid var(--border-color)",
          paddingLeft: "12px"
        }}>
          {step.details.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <StepIcon type={d.type} />
              <span>{d.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompletionCard({ completion }: { completion: CompletionSummary }) {
  return (
    <div style={{ fontSize: "13px", lineHeight: 1.7 }}>
      {/* Summary line */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "12px",
        color: "var(--text-muted)",
        marginBottom: "12px"
      }}>
        {completion.filesChanged && (
          <span>
            <span style={{ color: "var(--accent-green)" }}>+{completion.filesChanged.added}</span>
            {" "}
            <span style={{ color: "#f97583" }}>-{completion.filesChanged.removed}</span>
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{ color: "var(--text-primary)", margin: "0 0 12px" }}
        dangerouslySetInnerHTML={{ __html: completion.title.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + " — " + completion.description }}
      />

      {/* Features */}
      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "16px 0 8px" }}>
        Features
      </h4>
      <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {completion.features.map((f, i) => (
          <li key={i}
            style={{ fontSize: "13px", color: "var(--text-primary)" }}
            dangerouslySetInnerHTML={{ __html: f.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code style="background:var(--bg-card);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>') }}
          />
        ))}
      </ul>

      {/* Run It */}
      {completion.devUrl && (
        <>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: "16px 0 8px" }}>
            Run it
          </h4>
          <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: "0 0 8px" }}>
            The dev server is already running at{" "}
            <a href={completion.devUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)" }}>
              {completion.devUrl}
            </a>
          </p>
          {completion.commands && completion.commands.length > 0 && (
            <>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 6px" }}>
                To start it yourself later:
              </p>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "10px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--accent-primary)",
                position: "relative"
              }}>
                {completion.commands.map((cmd, i) => (
                  <div key={i}>{cmd}</div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Suggestion */}
      {completion.suggestion && (
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "16px 0 0" }}>
          {completion.suggestion}
        </p>
      )}

      {/* Agent feedback */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "16px",
        paddingTop: "12px",
        borderTop: "1px solid var(--border-color)"
      }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: "12px", color: "var(--accent-primary)", textDecoration: "none" }}>
          How did the agent do?
        </a>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
          <ThumbsUp size={13} />
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
          <ThumbsDown size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── QA Card (multi-question) ─────────────────────────────────── */

function QACard({ qaPrompt }: { qaPrompt: QAPrompt }) {
  const current = qaPrompt.questions[qaPrompt.activeIndex];
  const isLast = qaPrompt.activeIndex === qaPrompt.questions.length - 1;
  const hasAnswer = current && qaPrompt.answers[current.id];
  const letterBadges = ["A", "B", "C", "D", "E", "F"];

  return (
    <Card glass style={{ width: "100%", border: "1px solid var(--border-color-active)", padding: "14px" }}>
      {/* Pagination header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h4 style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Answers
        </h4>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {qaPrompt.activeIndex + 1} of {qaPrompt.questions.length}
        </span>
      </div>

      {/* Show previous answered questions as dimmed summaries */}
      {qaPrompt.questions.slice(0, qaPrompt.activeIndex).map((q) => (
        <div key={q.id} style={{ marginBottom: "10px", opacity: 0.6 }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>
            {q.question}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
            {qaPrompt.answers[q.id] || "—"}
          </div>
        </div>
      ))}

      {/* Current question */}
      {current && (
        <>
          <div style={{ fontSize: "12px", color: "var(--text-primary)", marginBottom: "10px", fontWeight: 500 }}>
            {current.question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {current.options.map((option, idx) => {
              const isSelected = qaPrompt.answers[current.id] === option;
              return (
                <button
                  key={idx}
                  onClick={() => qaPrompt.onSelect(current.id, option)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
                    background: isSelected ? "rgba(99, 102, 241, 0.08)" : "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    backgroundColor: isSelected ? "var(--accent-primary)" : "var(--bg-panel)",
                    color: isSelected ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    {letterBadges[idx]}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Navigation footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", gap: "8px" }}>
        <button
          onClick={qaPrompt.onSkip}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "11px",
            cursor: "pointer",
            padding: "4px 8px"
          }}
        >
          Skip all
        </button>
        <div style={{ display: "flex", gap: "6px" }}>
          {qaPrompt.activeIndex > 0 && (
            <Button
              variant="secondary"
              onClick={() => qaPrompt.onNavigate("prev")}
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              <ChevronUp size={12} /> Back
            </Button>
          )}
          {isLast ? (
            <Button
              variant="primary"
              onClick={qaPrompt.onSubmit}
              disabled={!hasAnswer}
              style={{ fontSize: "11px", padding: "4px 14px" }}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => qaPrompt.onNavigate("next")}
              disabled={!hasAnswer}
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              Next <ChevronRight size={12} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Main ComposerPanel ──────────────────────────────────────── */

interface ComposerPanelProps {
  messages: ChatMessage[];
  tasks: TaskItem[];
  qaPrompt: QAPrompt | null;
  running: boolean;
  thought: string | null;
  steps: AgentStep[];
  completion: CompletionSummary | null;
  fileChanges?: { path: string; added: number; removed: number }[];
  onRunAgent: (prompt: string) => void;
  mcpHasErrors?: boolean;
}

export function ComposerPanel({
  messages,
  tasks,
  qaPrompt,
  running,
  thought,
  steps,
  completion,
  fileChanges = [],
  onRunAgent,
  mcpHasErrors = false
}: ComposerPanelProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const [selectedModel, setSelectedModel] = useState("Max Quality");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  
  const [googleAuth] = useState({ connected: true, email: "apd1034@gmail.com" });
  const [gogAuth, setGogAuth] = useState({ connected: false, loading: false, email: null as string | null });
  const [codexAuth, setCodexAuth] = useState({ connected: false, loading: false, email: null as string | null });

  const handleConnectGog = () => {
    setGogAuth({ connected: false, loading: true, email: null });
    setTimeout(() => {
      setGogAuth({ connected: true, loading: false, email: "apd1034 (GOG)" });
    }, 1200);
  };

  const handleConnectCodex = () => {
    setCodexAuth({ connected: false, loading: true, email: null });
    setTimeout(() => {
      setCodexAuth({ connected: true, loading: false, email: "apd-developer (Codex)" });
    }, 1200);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thought, steps, completion]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modelDropdownOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || running) return;
    onRunAgent(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getTaskIcon = (status: TaskItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={14} style={{ color: "var(--accent-green)" }} />;
      case "in_progress":
        return <Loader2 size={14} className="spin" style={{ color: "var(--accent-neon)" }} />;
      default:
        return <Circle size={14} style={{ color: "var(--text-muted)" }} />;
    }
  };

  const renderPromptInput = (isCentered: boolean) => {
    return (
      <form onSubmit={handleSubmit} style={{
        margin: isCentered ? "0" : "12px",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        backgroundColor: "var(--bg-input)",
        display: "flex",
        flexDirection: "column",
        padding: "10px 12px 8px 12px",
        position: "relative",
        width: "100%",
        maxWidth: isCentered ? "640px" : "100%",
        boxShadow: isCentered ? "var(--shadow-md)" : "none",
        transition: "var(--transition-smooth)"
      }}>
        {modelDropdownOpen && (
          <div 
            ref={dropdownRef}
            style={{
              position: "absolute",
              bottom: "48px",
              right: "12px",
              width: "280px",
              backgroundColor: "var(--bg-panel)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              boxShadow: "var(--shadow-lg)",
              padding: "14px",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              textAlign: "left"
            }}
          >
            {/* Models Section */}
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>
                Model
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {["Fast", "Balanced", "Max Quality"].map((model) => {
                  const isSel = selectedModel === model;
                  return (
                    <div
                      key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        setModelDropdownOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        backgroundColor: isSel ? "rgba(255,255,255,0.06)" : "transparent",
                        color: isSel ? "var(--text-primary)" : "var(--text-secondary)",
                        transition: "background 0.15s ease",
                        textAlign: "left"
                      }}
                    >
                      <span style={{ textAlign: "left" }}>{model}</span>
                      {isSel && <Check size={12} style={{ color: "var(--accent-green)" }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "var(--border-color)" }} />

            {/* Auth Section */}
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>
                Authorized Accounts
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Google Auth */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500, textAlign: "left" }}>Google Auth</span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "left" }}>{googleAuth.email}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Check size={12} /> Connected
                  </span>
                </div>

                {/* GOG Auth */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500, textAlign: "left" }}>GOG Auth</span>
                    {gogAuth.connected && <span style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "left" }}>{gogAuth.email}</span>}
                  </div>
                  {gogAuth.connected ? (
                    <span style={{ fontSize: "11px", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={12} /> Connected
                    </span>
                  ) : gogAuth.loading ? (
                    <Loader2 size={12} className="spin" />
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGog}
                      style={{
                        fontSize: "10px",
                        backgroundColor: "var(--accent-primary)",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* Codex OAuth */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500, textAlign: "left" }}>Codex OAuth</span>
                    {codexAuth.connected && <span style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "left" }}>{codexAuth.email}</span>}
                  </div>
                  {codexAuth.connected ? (
                    <span style={{ fontSize: "11px", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={12} /> Connected
                    </span>
                  ) : codexAuth.loading ? (
                    <Loader2 size={12} className="spin" />
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectCodex}
                      style={{
                        fontSize: "10px",
                        backgroundColor: "var(--accent-primary)",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <textarea
          placeholder={running ? "Agent is running..." : "Plan, Build, / for skills, @ for context"}
          value={input}
          disabled={running}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
            resize: "none",
            padding: "4px",
            fontFamily: "inherit",
            textAlign: "left",
            lineHeight: "1.5"
          }}
        />

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "6px",
          paddingTop: "6px",
          borderTop: "1px solid rgba(255, 255, 255, 0.03)"
        }}>
          {/* Left tools inside prompt box */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "var(--transition-smooth)"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color-active)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
              }}
            >
              <Plus size={12} />
            </button>

            {/* Model Pill selection */}
            <div
              ref={triggerRef}
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color)",
                padding: "3px 10px",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                userSelect: "none",
                transition: "var(--transition-smooth)"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color-active)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
              }}
            >
              <span>{selectedModel}</span>
              <ChevronDown size={10} />
            </div>
          </div>

          {/* Right tools inside prompt box */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {mcpHasErrors && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--accent-yellow)",
                fontSize: "11px",
                marginRight: "4px"
              }} title="MCP connection issues — open Settings → MCP Servers">
                <AlertCircle size={12} />
                <span>MCP Error</span>
              </div>
            )}

            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "var(--transition-smooth)"
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            >
              <Mic size={13} />
            </button>

            <button
              type="submit"
              disabled={running || !input.trim()}
              style={{
                background: running || !input.trim() ? "transparent" : "var(--accent-primary)",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: running || !input.trim() ? "default" : "pointer",
                color: running || !input.trim() ? "var(--text-muted)" : "#fff",
                flexShrink: 0
              }}
            >
              <Send size={11} />
            </button>
          </div>
        </div>
      </form>
    );
  };

  const isEmptyState = messages.length === 0 && !running;

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: "var(--bg-app)"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border-color)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={14} style={{ color: "var(--accent-primary)" }} />
          <h3 style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>Agent Composer</h3>
        </div>
        {running && (
          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Loader2 size={10} className="spin" />
            Working...
          </span>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: isEmptyState ? "0" : "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        {/* Empty state — warm welcome */}
        {isEmptyState && (
          <WelcomeScreen onRunAgent={onRunAgent} promptInput={renderPromptInput(true)} />
        )}

        {/* Chat History in Chronological Order */}
        {!isEmptyState && messages.map((msg, idx) => {
          if (msg.sender === "user") {
            return (
              <div key={`user-${idx}`} style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                marginBottom: "12px"
              }}>
                {/* User avatar */}
                <div style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                  marginTop: "2px"
                }}>D</div>
                <div style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0 10px 10px 10px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  fontWeight: 400,
                  lineHeight: 1.6,
                  flex: 1
                }}>
                  {msg.text}
                </div>
              </div>
            );
          } else {
            return (
              <div key={`agent-${idx}`} style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                marginBottom: "14px"
              }}>
                {/* AI avatar */}
                <div style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-neon))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.3)"
                }}>
                  <Bot size={13} style={{ color: "#fff" }} />
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "var(--text-primary)",
                    flex: 1
                  }}
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdownToHtml(msg.text)
                  }}
                />
              </div>
            );
          }
        })}

        {/* Workflow Task Checklist (collapsed when steps start) */}
        {!isEmptyState && tasks.length > 0 && steps.length === 0 && (
          <Card style={{ padding: "12px", border: "1px solid var(--border-color)", marginBottom: "8px" }}>
            <h4 style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={12} style={{ color: "var(--accent-neon)" }} />
              Active Plan
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tasks.map((task) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  {getTaskIcon(task.status)}
                  <span style={{
                    color: task.status === "completed" ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: task.status === "completed" ? "line-through" : "none"
                  }}>
                    {task.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Thought state banner */}
        {running && thought && steps.length === 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(168, 85, 247, 0.06)",
            border: "1px solid var(--border-color)",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--accent-neon)"
          }}>
            <Loader2 size={12} className="spin" />
            <span>{thought}</span>
          </div>
        )}

        {/* Collapsible Steps */}
        {!isEmptyState && steps.map((step) => (
          <CollapsibleStep key={step.id} step={step} />
        ))}

        {/* Interactive Q&A Card */}
        {qaPrompt?.show && <QACard qaPrompt={qaPrompt} />}

        {/* File Change Badges (Cursor-style) */}
        {fileChanges.length > 0 && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "8px"
          }}>
            {fileChanges.map((fc, i) => {
              const fileName = fc.path.split("/").pop() || fc.path;
              return (
                <div key={i} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease"
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                  title={fc.path}
                >
                  <FileText size={12} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{fileName}</span>
                  <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>+{fc.added}</span>
                  <span style={{ color: "#f97583", fontWeight: 600 }}>-{fc.removed}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Completion Summary */}
        {completion && <CompletionCard completion={completion} />}

        {/* Background status */}
        {running && (
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
            Will resume when background work finishes
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input + Git Actions + Selector Overlay (ONLY IF NOT EMPTY STATE) */}
      {!isEmptyState && (
        <div style={{ borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column" }}>
          {/* Row right above the prompt box */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px 4px 12px",
            fontSize: "11px",
            color: "var(--text-secondary)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              cursor: "pointer"
            }}>
              <Terminal size={11} />
              <span>1 Terminal</span>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--text-muted)",
              cursor: "pointer"
            }}>
              <GitBranch size={11} />
              <span>main</span>
            </div>
          </div>

          {/* Form and Input Card */}
          {renderPromptInput(false)}

          {/* Bottom-most encryption label */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "0 14px 10px 14px",
            fontSize: "10px",
            color: "var(--text-muted)",
            userSelect: "none"
          }}>
            BYOK credentials: encrypted
          </div>
        </div>
      )}
    </div>
  );
}
