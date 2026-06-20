import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, FileText, Rocket, Settings, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import type { ActorRecord, ActorReport, TemplateId } from "@creator-factory/shared";
import "./styles.css";

type Health = { ok: boolean; env: Record<string, boolean> };
type ActorWithReports = ActorRecord & { reports: ActorReport[] };

const templateOptions: { id: TemplateId; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "project-langgraph-agent-javascript", label: "JavaScript LangGraph" },
  { id: "ts-beeai-agent", label: "TypeScript BeeAI" },
  { id: "python-langgraph", label: "Python LangGraph" }
];

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function App() {
  const [actors, setActors] = useState<ActorRecord[]>([]);
  const [selected, setSelected] = useState<ActorWithReports | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [page, setPage] = useState("dashboard");
  const [prompt, setPrompt] = useState("Find restaurants in a city, visit their websites, extract contact info, score online presence, and return a lead list.");
  const [sourceType, setSourceType] = useState<"idea" | "workflow" | "github">("workflow");
  const [template, setTemplate] = useState<TemplateId>("project-langgraph-agent-javascript");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, template, maxAttempts: 3, autoDeploy: false })
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

  useEffect(() => {
    refresh().catch((err) => setError(String(err)));
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
        <div className="brand"><Sparkles size={20} /> Apify Creator Factory</div>
        <button onClick={() => setPage("dashboard")}><Activity size={16} /> Dashboard</button>
        <button onClick={() => setPage("create")}><Wrench size={16} /> Create Actor</button>
        <button onClick={() => setPage("reports")}><FileText size={16} /> Reports</button>
        <button onClick={() => setPage("settings")}><Settings size={16} /> Settings</button>
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
              <Metric label="Monetization" value={stats.avg} />
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
              <label>Input</label>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              <button className="primary" disabled={busy} onClick={createActor}><Rocket size={16} /> {busy ? "Generating..." : "Generate Actor"}</button>
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
              <p>Token status only. Values are never shown.</p>
            </header>
            <div className="settings">
              {health && Object.entries(health.env).map(([key, value]) => (
                <div key={key}><span>{key}</span><strong>{value ? "Configured" : "Missing"}</strong></div>
              ))}
              <div><span>Default template</span><strong>JavaScript LangGraph</strong></div>
              <div><span>Deployment mode</span><strong>Manual approval</strong></div>
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
      {actors.map((actor) => (
        <button key={actor.id} onClick={() => onOpen(actor.id)}>
          <span>{actor.name}</span>
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
