import { useState, useEffect, useCallback } from "react";
import { GitBranch, RefreshCw, Plus, Minus, File, Loader2, Check } from "lucide-react";

interface GitFileStatus {
  path: string;
  status: string;       // "M" | "A" | "D" | "?" | "U" etc.
  staged: boolean;
}

interface GitStatusData {
  branch: string;
  files: GitFileStatus[];
}

interface GitPanelProps {
  width: number;
  onOpenFile: (path: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  "M": { label: "Modified", color: "#e2b93d" },
  "A": { label: "Added", color: "var(--accent-green)" },
  "D": { label: "Deleted", color: "#f97583" },
  "?": { label: "Untracked", color: "var(--text-muted)" },
  "U": { label: "Unmerged", color: "#f97583" },
  "R": { label: "Renamed", color: "#79c0ff" },
  "C": { label: "Copied", color: "#79c0ff" },
};

export function GitPanel({ width, onOpenFile }: GitPanelProps) {
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3001/api/git/status");
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
      } else {
        const errText = await res.text();
        setError(errText || "Failed to get git status");
        setGitStatus(null);
      }
    } catch (err) {
      setError("Could not connect to backend");
      setGitStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    setCommitResult(null);
    try {
      const res = await fetch("http://localhost:3001/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage })
      });
      const data = await res.json();
      if (res.ok) {
        setCommitResult(data.message || "Committed successfully");
        setCommitMessage("");
        fetchStatus(); // refresh
      } else {
        setCommitResult(data.error || "Commit failed");
      }
    } catch {
      setCommitResult("Network error");
    } finally {
      setCommitting(false);
    }
  };

  const stagedFiles = gitStatus?.files.filter(f => f.staged) || [];
  const unstagedFiles = gitStatus?.files.filter(f => !f.staged) || [];

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
          Source Control
        </span>
        <button
          onClick={fetchStatus}
          disabled={loading}
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
            cursor: loading ? "wait" : "pointer"
          }}
          title="Refresh"
        >
          {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px", fontSize: "11px", color: "#f97583", background: "rgba(249, 117, 131, 0.06)" }}>
          {error}
        </div>
      )}

      {/* Not a git repo */}
      {!error && !loading && !gitStatus && (
        <div style={{ padding: "24px 16px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
          <GitBranch size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
          <div>No Git repository detected</div>
          <div style={{ marginTop: "4px", fontSize: "11px" }}>
            Open a folder with a .git directory
          </div>
        </div>
      )}

      {gitStatus && (
        <>
          {/* Branch */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            borderBottom: "1px solid var(--border-color)"
          }}>
            <GitBranch size={13} />
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{gitStatus.branch || "HEAD"}</span>
          </div>

          {/* Commit input */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCommit(); }}
                placeholder="Commit message..."
                style={{
                  flex: 1,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || committing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "none",
                  background: commitMessage.trim() ? "var(--accent-primary)" : "rgba(255,255,255,0.06)",
                  color: commitMessage.trim() ? "#fff" : "var(--text-muted)",
                  cursor: commitMessage.trim() ? "pointer" : "not-allowed",
                  fontSize: "11px",
                  fontWeight: 600
                }}
              >
                {committing ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
              </button>
            </div>
            {commitResult && (
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                {commitResult}
              </div>
            )}
          </div>

          {/* Files */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {/* Staged */}
            {stagedFiles.length > 0 && (
              <div>
                <div style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "6px 12px 4px"
                }}>
                  Staged Changes <span style={{ opacity: 0.5 }}>{stagedFiles.length}</span>
                </div>
                {stagedFiles.map(file => (
                  <GitFileRow key={file.path} file={file} onOpenFile={onOpenFile} />
                ))}
              </div>
            )}

            {/* Unstaged */}
            {unstagedFiles.length > 0 && (
              <div>
                <div style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "6px 12px 4px"
                }}>
                  Changes <span style={{ opacity: 0.5 }}>{unstagedFiles.length}</span>
                </div>
                {unstagedFiles.map(file => (
                  <GitFileRow key={file.path} file={file} onOpenFile={onOpenFile} />
                ))}
              </div>
            )}

            {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                No changes detected
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GitFileRow({ file, onOpenFile }: { file: GitFileStatus; onOpenFile: (path: string) => void }) {
  const fileName = file.path.split("/").pop() || file.path;
  const dirPath = file.path.substring(0, file.path.lastIndexOf("/"));
  const statusInfo = STATUS_LABELS[file.status] || { label: file.status, color: "var(--text-muted)" };

  return (
    <button
      onClick={() => onOpenFile(file.path)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        width: "100%",
        padding: "4px 12px",
        border: "none",
        background: "none",
        cursor: "pointer",
        color: "var(--text-secondary)",
        fontSize: "12px",
        textAlign: "left"
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
      title={`${statusInfo.label}: ${file.path}`}
    >
      {file.status === "A" || file.status === "?" ? (
        <Plus size={12} style={{ color: statusInfo.color, flexShrink: 0 }} />
      ) : file.status === "D" ? (
        <Minus size={12} style={{ color: statusInfo.color, flexShrink: 0 }} />
      ) : (
        <File size={12} style={{ color: statusInfo.color, flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fileName}
      </span>
      {dirPath && (
        <span style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "40%" }}>
          {dirPath}
        </span>
      )}
      <span style={{
        fontSize: "10px",
        fontWeight: 700,
        color: statusInfo.color,
        flexShrink: 0,
        fontFamily: "var(--font-mono)"
      }}>
        {file.status}
      </span>
    </button>
  );
}
