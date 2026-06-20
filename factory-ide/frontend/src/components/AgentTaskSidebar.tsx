import { Loader2, CheckCircle2, Clock, AlertCircle, Plus, Bot } from "lucide-react";
import { AgentSession } from "../hooks/useAgent";

interface AgentTaskSidebarProps {
  sessions: AgentSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  width: number;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function SessionStatusIcon({ status }: { status: AgentSession["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 size={14} className="spin" style={{ color: "var(--accent-neon)" }} />;
    case "review":
      return <CheckCircle2 size={14} style={{ color: "var(--accent-green)" }} />;
    case "completed":
      return <CheckCircle2 size={14} style={{ color: "var(--text-muted)" }} />;
    case "error":
      return <AlertCircle size={14} style={{ color: "#f97583" }} />;
  }
}

export function AgentTaskSidebar({ sessions, activeSessionId, onSelectSession, onNewSession, width }: AgentTaskSidebarProps) {
  const runningSessions = sessions.filter(s => s.status === "running");
  const reviewSessions = sessions.filter(s => s.status === "review");
  const pastSessions = sessions.filter(s => s.status === "completed" || s.status === "error");

  return (
    <div style={{
      width: `${width}px`,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--bg-panel)",
      borderRight: "1px solid var(--border-color)",
      overflow: "hidden",
      flexShrink: 0
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderBottom: "1px solid var(--border-color)"
      }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Agents
        </span>
        <button
          onClick={onNewSession}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
            borderRadius: "4px",
            border: "none",
            background: "rgba(255,255,255,0.06)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "background 0.15s ease"
          }}
          title="New Agent Session"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {sessions.length === 0 && (
          <div style={{
            padding: "24px 16px",
            textAlign: "center",
            fontSize: "12px",
            color: "var(--text-muted)"
          }}>
            <Bot size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <div>No agent sessions yet</div>
            <div style={{ marginTop: "4px", fontSize: "11px" }}>
              Use the composer to start
            </div>
          </div>
        )}

        {/* In Progress */}
        {runningSessions.length > 0 && (
          <div style={{ padding: "4px 0" }}>
            <div style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "6px 12px 4px"
            }}>
              In Progress <span style={{ opacity: 0.5 }}>{runningSessions.length}</span>
            </div>
            {runningSessions.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onClick={() => onSelectSession(session.id)}
              />
            ))}
          </div>
        )}

        {/* Ready for Review */}
        {reviewSessions.length > 0 && (
          <div style={{ padding: "4px 0" }}>
            <div style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "6px 12px 4px"
            }}>
              Ready for Review <span style={{ opacity: 0.5 }}>{reviewSessions.length}</span>
            </div>
            {reviewSessions.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onClick={() => onSelectSession(session.id)}
              />
            ))}
          </div>
        )}

        {/* Past */}
        {pastSessions.length > 0 && (
          <div style={{ padding: "4px 0" }}>
            <div style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "6px 12px 4px"
            }}>
              History <span style={{ opacity: 0.5 }}>{pastSessions.length}</span>
            </div>
            {pastSessions.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onClick={() => onSelectSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session, isActive, onClick }: { session: AgentSession; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        width: "100%",
        padding: "8px 12px",
        border: "none",
        borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
        background: isActive ? "rgba(99, 102, 241, 0.08)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.12s ease",
        color: "var(--text-primary)"
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div style={{ paddingTop: "2px", flexShrink: 0 }}>
        <SessionStatusIcon status={session.status} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <span style={{
            fontSize: "12px",
            fontWeight: 500,
            color: session.status === "running" ? "var(--text-primary)" : "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1
          }}>
            {session.title}
          </span>
          <span style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            flexShrink: 0,
            paddingTop: "1px"
          }}>
            {formatTimeAgo(session.startedAt)}
          </span>
        </div>
        <div style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          {session.status === "running" ? (
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.currentAction}
            </span>
          ) : (session.filesChanged.added > 0 || session.filesChanged.removed > 0) ? (
            <>
              <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                <span style={{ color: "var(--accent-green)" }}>+{session.filesChanged.added}</span>
                <span style={{ color: "#f97583" }}>-{session.filesChanged.removed}</span>
              </span>
              <span>·</span>
              <Clock size={10} />
              <span>{formatTimeAgo(session.startedAt)}</span>
            </>
          ) : (
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.currentAction || session.title}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
