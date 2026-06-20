import { useState, useCallback } from "react";

/* ── Shared Interfaces ─────────────────────────────────────────── */

export interface TaskItem {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed";
}

export interface QAQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface QAPrompt {
  questions: QAQuestion[];
  answers: Record<string, string>;
  activeIndex: number;
  show: boolean;
  onSelect: (questionId: string, option: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onSubmit: () => void;
  onSkip: () => void;
}

export interface ChatMessage {
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

/* ── Collapsible Step System ───────────────────────────────────── */

export interface StepDetail {
  type: "search" | "read" | "create" | "edit" | "run" | "info";
  text: string;
}

export interface AgentStep {
  id: string;
  label: string;       // e.g. "Exploring", "Thought briefly"
  summary: string;     // e.g. "2 files, 2 searches, ran 1 command"
  details: StepDetail[];
  status: "running" | "done";
}

/* ── File Change Badge ─────────────────────────────────────────── */

export interface FileChange {
  path: string;
  added: number;
  removed: number;
}

/* ── Completion Summary ────────────────────────────────────────── */

export interface CompletionSummary {
  title: string;
  description: string;
  features: string[];
  devUrl?: string;
  commands?: string[];
  suggestion?: string;
  filesChanged?: { added: number; removed: number };
  actorSlug?: string;
}

/* ── Agent Session (Task History) ──────────────────────────────── */

export interface AgentSession {
  id: string;
  title: string;
  status: "running" | "review" | "completed" | "error";
  startedAt: number;
  currentAction: string;
  filesChanged: { added: number; removed: number };
  messages: ChatMessage[];
  steps: AgentStep[];
  fileChanges: FileChange[];
  completion: CompletionSummary | null;
}

/* ── Hook ──────────────────────────────────────────────────────── */

let sessionCounter = 0;

export function useAgent(onFileCreated?: (path: string) => void) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [qaPrompt] = useState<QAPrompt | null>(null);
  const [running, setRunning] = useState(false);
  const [thought, setThought] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [completion, setCompletion] = useState<CompletionSummary | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);

  const addMessage = useCallback((sender: "user" | "agent", text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        sender,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  }, []);

  // Select a previous session to view
  const selectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
      setSteps(session.steps);
      setCompletion(session.completion);
      setFileChanges(session.fileChanges);
    }
  }, [sessions]);

  // Start a new empty session (clears chat)
  const startNewSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setSteps([]);
    setCompletion(null);
    setTasks([]);
    setFileChanges([]);
    setThought(null);
  }, []);

  const runAgent = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    setRunning(true);
    setSteps([]);
    setCompletion(null);
    setTasks([]);
    setFileChanges([]);
    addMessage("user", prompt);

    // Create a new session
    const sessionId = `session-${++sessionCounter}-${Date.now()}`;
    const truncatedTitle = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
    const newSession: AgentSession = {
      id: sessionId,
      title: truncatedTitle,
      status: "running",
      startedAt: Date.now(),
      currentAction: "Starting...",
      filesChanged: { added: 0, removed: 0 },
      messages: [],
      steps: [],
      fileChanges: [],
      completion: null
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(sessionId);

    const updateSession = (updates: Partial<AgentSession>) => {
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, ...updates } : s
      ));
    };

    try {
      const response = await fetch("http://localhost:3001/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.body) {
        addMessage("agent", "Error: No response body received from agent server.");
        updateSession({ status: "error", currentAction: "Connection failed" });
        setRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || ""; // Keep incomplete chunk in buffer

        for (const part of parts) {
          if (!part.trim()) continue;

          let event = "message";
          let dataStr = "";

          const lines = part.split("\n");
          for (const line of lines) {
            if (line.startsWith("event:")) {
              event = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.replace("data:", "").trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (event === "message") {
              // Append token to message
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.sender === "agent") {
                  return [...prev.slice(0, -1), { ...last, text: last.text + data }];
                } else {
                  return [...prev, { sender: "agent", text: data, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }];
                }
              });
            } else if (event === "thought") {
              setThought(data);
              if (data) {
                updateSession({ currentAction: data });
              }
            } else if (event === "tasks") {
              setTasks(data);
            } else if (event === "step") {
              const step = data as AgentStep;
              setSteps((prev) => {
                const idx = prev.findIndex((s) => s.id === step.id);
                if (idx !== -1) {
                  const existingStep = prev[idx];
                  const mergedDetails = [...existingStep.details];
                  for (const det of step.details) {
                    if (!mergedDetails.some(d => d.text === det.text)) {
                      mergedDetails.push(det);
                    }
                  }
                  return prev.map((s) => (s.id === step.id ? { ...s, ...step, details: mergedDetails } : s));
                } else {
                  return [...prev, step];
                }
              });
              updateSession({ currentAction: step.label + (step.summary ? ": " + step.summary : "") });
            } else if (event === "file_change") {
              const fc = data as FileChange;
              setFileChanges(prev => {
                const existing = prev.findIndex(f => f.path === fc.path);
                if (existing !== -1) {
                  return prev.map((f, i) => i === existing ? fc : f);
                }
                return [...prev, fc];
              });
              // Update session file counts
              setSessions(prev => prev.map(s => {
                if (s.id !== sessionId) return s;
                const totalAdded = s.filesChanged.added + fc.added;
                const totalRemoved = s.filesChanged.removed + fc.removed;
                return { ...s, filesChanged: { added: totalAdded, removed: totalRemoved } };
              }));
            } else if (event === "completion") {
              setCompletion(data);
              updateSession({
                status: "review",
                currentAction: "Ready for review",
                completion: data
              });
              if (data.filesChanged) {
                updateSession({ filesChanged: data.filesChanged });
              }
              if (data.actorSlug && onFileCreated) {
                onFileCreated(`/creator-factory/generated-actors/${data.actorSlug}/SPEC.md`);
              }
            } else if (event === "error") {
              addMessage("agent", `⚠️ Error: ${data}`);
              updateSession({ status: "error", currentAction: String(data) });
            }
          } catch (err) {
            console.error("Failed to parse event data:", err, dataStr);
          }
        }
      }

      // Finalize session with current state
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          status: s.status === "error" ? "error" : "review"
        };
      }));

    } catch (error) {
      console.error("Agent execution error:", error);
      addMessage("agent", `Error executing agent: ${(error as Error).message}`);
      updateSession({ status: "error", currentAction: (error as Error).message });
    } finally {
      setRunning(false);
      setThought(null);

      // Snapshot messages/steps into session
      setMessages(msgs => {
        updateSession({ messages: msgs });
        return msgs;
      });
      setSteps(stps => {
        updateSession({ steps: stps });
        return stps;
      });
      setFileChanges(fcs => {
        updateSession({ fileChanges: fcs });
        return fcs;
      });
    }
  }, [addMessage, onFileCreated]);

  return {
    messages,
    tasks,
    qaPrompt,
    running,
    thought,
    steps,
    completion,
    fileChanges,
    sessions,
    activeSessionId,
    runAgent,
    addMessage,
    selectSession,
    startNewSession
  };
}
