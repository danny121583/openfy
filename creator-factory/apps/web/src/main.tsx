import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, FileText, Rocket, Settings, ShieldCheck, Sparkles, Wrench, RefreshCw, ChevronLeft } from "lucide-react";
import type { ActorRecord, ActorReport, TemplateId } from "@creator-factory/shared";
import "./styles.css";

type Health = { ok: boolean; env: Record<string, boolean> };
type ActorWithReports = ActorRecord & { reports: ActorReport[] };

interface MainRunSummary {
  runId: string;
  verdict: string;
  startedAt: string;
  finishedAt: string;
}

interface MainRunDetails {
  runId: string;
  mainReport: string;
  gapAnalysis: string;
  storeResearch: string;
  selectedActors: string;
}

const templateOptions: { id: TemplateId; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "project-langgraph-agent-javascript", label: "JavaScript LangGraph" },
  { id: "ts-beeai-agent", label: "TypeScript BeeAI" },
  { id: "python-langgraph", label: "Python LangGraph" }
];

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(iso: string) {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function App() {
  const [actors, setActors] = useState<ActorRecord[]>([]);
  const [selected, setSelected] = useState<ActorWithReports | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [page, setPage] = useState("dashboard");
  const [prompt, setPrompt] = useState("Find restaurants in a city, visit their websites, extract contact info, score online presence, and return a lead list.");
  const [repoUrl, setRepoUrl] = useState("");
  const [sourceType, setSourceType] = useState<"idea" | "workflow" | "github">("workflow");
  const [template, setTemplate] = useState<TemplateId>("project-langgraph-agent-javascript");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Editable settings state
  const [apifyToken, setApifyToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");

  // Batch Runs state
  const [runs, setRuns] = useState<MainRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<MainRunDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "gaps" | "research" | "ideas">("main");
  const [runTask, setRunTask] = useState<{ status: string; logs: string[] } | null>(null);
  const [syncTask, setSyncTask] = useState<{ status: string; logs: string[] } | null>(null);

  async function refresh() {
    const [actorRes, healthRes] = await Promise.all([fetch("/api/actors"), fetch("/api/health")]);
    setActors(await actorRes.json());
    setHealth(await healthRes.json());
  }

  async function loadActor(id: string) {
    const res = await fetch(`/api/actors/${id}`);
    setSelected(await res.json());
    setPage("detail");
  }

  async function createActor() {
    setBusy(true);
    setError("");
    try {
      const endpoint =
        sourceType === "github" ? "/api/actors/create-from-github" : sourceType === "idea" ? "/api/actors/create-from-idea" : "/api/actors/create-from-workflow";
      
      const payload = sourceType === "github"
        ? { repoUrl, template, maxAttempts: 3, autoDeploy: false }
        : { prompt, template, maxAttempts: 3, autoDeploy: false };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Actor creation failed");
      await refresh();
      await loadActor(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function deploySelected() {
    if (!selected) return;
    setBusy(true);
    const res = await fetch("/api/actors/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: selected.id })
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Deploy failed");
    await refresh();
    await loadActor(selected.id);
    setBusy(false);
  }

  // Batch Runs functions
  async function loadRuns() {
    try {
      const res = await fetch("/api/main-runs");
      setRuns(await res.json());
    } catch (err) {
      setError(String(err));
    }
  }

  async function loadRunDetails(runId: string) {
    try {
      const res = await fetch(`/api/main-runs/${runId}`);
      setSelectedRun(await res.json());
      setPage("run-detail");
    } catch (err) {
      setError(String(err));
    }
  }

  async function triggerMainRun() {
    setBusy(true);
    try {
      const res = await fetch("/api/runs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start run");
      pollRunStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBusy(false);
    }
  }

  async function triggerSyncStore() {
    setBusy(true);
    try {
      const res = await fetch("/api/sync-store", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start sync");
      pollSyncStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBusy(false);
    }
  }

  function pollRunStatus() {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/runs/status");
        const data = await res.json();
        setRunTask(data);
        if (data.status !== "running") {
          clearInterval(timer);
          setBusy(false);
          loadRuns();
          refresh();
        }
      } catch {
        clearInterval(timer);
        setBusy(false);
      }
    }, 2000);
  }

  function pollSyncStatus() {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/sync-store/status");
        const data = await res.json();
        setSyncTask(data);
        if (data.status !== "running") {
          clearInterval(timer);
          setBusy(false);
        }
      } catch {
        clearInterval(timer);
        setBusy(false);
      }
    }, 2000);
  }

  async function saveSettings() {
    setBusy(true);
    setSuccessMsg("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          APIFY_TOKEN: apifyToken,
          GITHUB_TOKEN: githubToken,
          OPENAI_API_KEY: openaiKey,
          ANTHROPIC_API_KEY: anthropicKey
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
      setSuccessMsg(data.message);
      setApifyToken("");
      setGithubToken("");
      setOpenaiKey("");
      setAnthropicKey("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh().catch((err) => setError(String(err)));
    loadRuns().catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const count = (statuses: string[]) => actors.filter((actor) => statuses.includes(actor.status)).length;
    const avg = actors.length ? Math.round(actors.reduce((sum, actor) => sum + actor.monetizationScore, 0) / actors.length) : 0;
    return {
      total: actors.length,
      draft: count(["queued", "analyzing", "building"]),
      testing: count(["testing", "fixing"]),
      ready: count(["ready_for_deploy"]),
      deployed: count(["deployed"]),
      avg
    };
  }, [actors]);

  return (
    <main>
      <aside>
        <div className="brand"><Sparkles size={20} /> Openfy</div>
        <button onClick={() => setPage("dashboard")} className={page === "dashboard" ? "active" : ""}><Activity size={16} /> Dashboard</button>
        <button onClick={() => setPage("create")} className={page === "create" ? "active" : ""}><Wrench size={16} /> Create Actor</button>
        <button onClick={() => { setPage("runs"); loadRuns(); }} className={page === "runs" || page === "run-detail" ? "active" : ""}><Rocket size={16} /> Batch Runs</button>
        <button onClick={() => setPage("reports")} className={page === "reports" ? "active" : ""}><FileText size={16} /> Reports</button>
        <button onClick={() => setPage("settings")} className={page === "settings" ? "active" : ""}><Settings size={16} /> Settings</button>
      </aside>

      <section className="content">
        {error && <div className="error">{error}</div>}

        {page === "dashboard" && (
          <>
            <header>
              <h1>Dashboard</h1>
              <p>Factory status, Actor inventory, and deployment readiness.</p>
            </header>
            <div className="metrics">
              <Metric label="Total Actors" value={stats.total} />
              <Metric label="Draft" value={stats.draft} />
              <Metric label="Testing" value={stats.testing} />
              <Metric label="Ready" value={stats.ready} />
              <Metric label="Deployed" value={stats.deployed} />
              <Metric label="Monetization Score" value={stats.avg} />
            </div>
            <ActorTable actors={actors} onOpen={loadActor} />
          </>
        )}

        {page === "create" && (
          <>
            <header>
              <h1>Create Actor</h1>
              <p>Submit an idea, workflow, repo, API, script, or automation target.</p>
            </header>
            <div className="form">
              <label>Source</label>
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}>
                <option value="workflow">Workflow text</option>
                <option value="idea">Idea text</option>
                <option value="github">GitHub repo URL</option>
              </select>
              <label>Template</label>
              <select value={template} onChange={(event) => setTemplate(event.target.value as TemplateId)}>
                {templateOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              {sourceType === "github" ? (
                <>
                  <label>GitHub Repository URL</label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/username/repo"
                  />
                </>
              ) : (
                <>
                  <label>Input / Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe your Actor idea or paste a structured workflow..."
                  />
                </>
              )}
              <button className="primary" disabled={busy} onClick={createActor}><Rocket size={16} /> {busy ? "Generating..." : "Generate Actor"}</button>
            </div>
          </>
        )}

        {page === "runs" && (
          <>
            <header className="row">
              <div>
                <h1>Batch Runs</h1>
                <p>Run full store analysis, gap scanning, sequential actor generation, and store synchronization.</p>
              </div>
              <div className="action-row">
                <button className="primary" disabled={busy || runTask?.status === "running"} onClick={triggerMainRun}><Rocket size={16} /> Run Main Agent</button>
                <button className="secondary" disabled={busy || syncTask?.status === "running"} onClick={triggerSyncStore}><RefreshCw size={16} /> Sync Store listings</button>
              </div>
            </header>

            {runTask && runTask.status === "running" && (
              <div className="terminal-container">
                <h3><Rocket size={16} /> Main Agent Running...</h3>
                <pre className="terminal">{runTask.logs.join("")}</pre>
              </div>
            )}

            {syncTask && syncTask.status === "running" && (
              <div className="terminal-container">
                <h3><RefreshCw size={16} /> Store Synchronization Running...</h3>
                <pre className="terminal">{syncTask.logs.join("")}</pre>
              </div>
            )}

            <h2>Previous Batch Runs</h2>
            <div className="table run-table">
              <div className="table-header">
                <span>Run ID</span>
                <span>Verdict</span>
                <span>Started At</span>
                <span>Finished At</span>
              </div>
              {runs.map((run) => (
                <button key={run.runId} onClick={() => loadRunDetails(run.runId)} className="table-row">
                  <span className="font-mono">{run.runId}</span>
                  <span className={`badge ${run.verdict.toLowerCase()}`}>{run.verdict}</span>
                  <span>{formatDate(run.startedAt)}</span>
                  <span>{formatDate(run.finishedAt)}</span>
                </button>
              ))}
              {!runs.length && <p className="empty">No batch runs recorded yet.</p>}
            </div>
          </>
        )}

        {page === "run-detail" && selectedRun && (
          <>
            <header className="row">
              <div className="row-left">
                <button onClick={() => setPage("runs")} className="back-btn"><ChevronLeft size={18} /> Back</button>
                <div>
                  <h1 className="font-mono">{selectedRun.runId}</h1>
                  <p>Batch run report, marketing gaps, and generated actor results.</p>
                </div>
              </div>
            </header>

            <div className="tabs">
              <button className={activeTab === "main" ? "active" : ""} onClick={() => setActiveTab("main")}>Main Report</button>
              <button className={activeTab === "gaps" ? "active" : ""} onClick={() => setActiveTab("gaps")}>Gap Analysis</button>
              <button className={activeTab === "research" ? "active" : ""} onClick={() => setActiveTab("research")}>Store Research</button>
              <button className={activeTab === "ideas" ? "active" : ""} onClick={() => setActiveTab("ideas")}>Selected Ideas</button>
            </div>

            <div className="tab-content">
              {activeTab === "main" && (
                <pre className="markdown-view">{selectedRun.mainReport}</pre>
              )}
              {activeTab === "gaps" && (
                <pre className="markdown-view">{selectedRun.gapAnalysis}</pre>
              )}
              {activeTab === "research" && (
                <pre className="markdown-view">{selectedRun.storeResearch}</pre>
              )}
              {activeTab === "ideas" && (
                <pre className="markdown-view">{selectedRun.selectedActors}</pre>
              )}
            </div>
          </>
        )}

        {page === "detail" && selected && (
          <>
            <header className="row">
              <div>
                <h1>{selected.name}</h1>
                <p>{selected.template} · {statusLabel(selected.status)}</p>
              </div>
              <button className="primary" disabled={busy} onClick={deploySelected}><ShieldCheck size={16} /> Deploy</button>
            </header>
            <div className="detail-grid">
              <Panel title="Concept" text={selected.sourceValue} />
              <Panel title="Build Status" text={selected.actorDir ?? "Not built"} />
              <Panel title="Deploy Readiness" text={selected.finalVerdict ?? "Pending"} />
              <Panel title="Monetization Score" text={String(selected.monetizationScore)} />
            </div>
            <h2>Reports</h2>
            <div className="reports">
              {selected.reports.map((report) => (
                <article key={report.id}>
                  <strong>{report.type}</strong>
                  <span>{report.path}</span>
                  <pre>{report.markdown.slice(0, 1200)}</pre>
                </article>
              ))}
            </div>
          </>
        )}

        {page === "reports" && (
          <>
            <header>
              <h1>Reports</h1>
              <p>Open an Actor to inspect concept, spec, PACT, deploy, monetization, and final reports.</p>
            </header>
            <ActorTable actors={actors} onOpen={loadActor} />
          </>
        )}

        {page === "settings" && (
          <>
            <header>
              <h1>Settings</h1>
              <p>Configure API tokens and environment parameters. Values are loaded into memory and written to your local .env file.</p>
            </header>
            {successMsg && <div className="success">{successMsg}</div>}
            <div className="settings-form">
              <div className="form-group">
                <label>Apify Token</label>
                <input
                  type="password"
                  value={apifyToken}
                  onChange={(event) => setApifyToken(event.target.value)}
                  placeholder={health?.env.APIFY_TOKEN ? "••••••••••••" : "Not configured - enter token"}
                />
              </div>
              <div className="form-group">
                <label>Github Token</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(event) => setGithubToken(event.target.value)}
                  placeholder={health?.env.GITHUB_TOKEN ? "••••••••••••" : "Not configured - enter token"}
                />
              </div>
              <div className="form-group">
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(event) => setOpenaiKey(event.target.value)}
                  placeholder={health?.env.OPENAI_API_KEY ? "••••••••••••" : "Not configured - enter key"}
                />
              </div>
              <div className="form-group">
                <label>Anthropic API Key</label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(event) => setAnthropicKey(event.target.value)}
                  placeholder={health?.env.ANTHROPIC_API_KEY ? "••••••••••••" : "Not configured - enter key"}
                />
              </div>
              
              <div className="row-group">
                <div><span>Default template</span><strong>JavaScript LangGraph</strong></div>
                <div><span>Deployment mode</span><strong>Manual approval</strong></div>
              </div>

              <button className="primary" disabled={busy} onClick={saveSettings}>Save Settings</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function ActorTable({ actors, onOpen }: { actors: ActorRecord[]; onOpen: (id: string) => void }) {
  return (
    <div className="table">
      <div className="table-header">
        <span>Actor Name</span>
        <span>Status</span>
        <span>Template</span>
        <span>Monetization Score</span>
      </div>
      {actors.map((actor) => (
        <button key={actor.id} onClick={() => onOpen(actor.id)} className="table-row">
          <strong>{actor.name}</strong>
          <span>{statusLabel(actor.status)}</span>
          <span>{actor.template}</span>
          <span>{actor.monetizationScore}</span>
        </button>
      ))}
      {!actors.length && <p className="empty">No Actors generated yet.</p>}
    </div>
  );
}

function Panel({ title, text }: { title: string; text: string }) {
  return <div className="panel"><span>{title}</span><strong>{text}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<App />);
