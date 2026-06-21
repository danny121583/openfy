import cors from "cors";
import express from "express";
import { z } from "zod";
import { spawn } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createActorPipeline, deployActor, FileDatabase, runPact, runQualityGate, factoryRoot } from "@creator-factory/shared";



const app = express();
const db = new FileDatabase();
const port = Number(process.env.PORT ?? 4310);

interface ActiveTask {
  process: any;
  logs: string[];
  status: "idle" | "running" | "success" | "failed";
}

let activeRun: ActiveTask = {
  process: null,
  logs: [],
  status: "idle"
};

let activeSync: ActiveTask = {
  process: null,
  logs: [],
  status: "idle"
};

async function parseMainRunReport(runId: string) {
  const reportsDir = path.join(factoryRoot(), "reports", "main-agent-runs", runId);
  const reportPath = path.join(reportsDir, "main-run-report.md");
  if (!existsSync(reportPath)) {
    return { runId, verdict: "UNKNOWN", startedAt: "", finishedAt: "" };
  }
  const content = await readFile(reportPath, "utf8");
  const verdict = content.match(/## Final Verdict\s*\n\s*(PASS|FAIL|PARTIAL|UNKNOWN)/)?.[1] ?? "UNKNOWN";
  const startedAt = content.match(/## Started At\s*\n\s*([^\n]+)/)?.[1] ?? "";
  const finishedAt = content.match(/## Finished At\s*\n\s*([^\n]+)/)?.[1] ?? "";
  return { runId, verdict, startedAt, finishedAt };
}

async function readTextSafe(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

const createSchema = z.object({
  prompt: z.string().min(8),
  template: z.enum(["auto", "project-langgraph-agent-javascript", "ts-beeai-agent", "python-langgraph"]).default("auto"),
  maxAttempts: z.number().int().min(1).max(25).optional(),
  autoDeploy: z.boolean().optional()
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

async function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(factoryRoot(), ".env");
  let content = "";
  try {
    content = await readFile(envPath, "utf8");
  } catch {}

  const lines = content.split("\n");
  const envVars: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      envVars[key] = val;
    }
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    if (value && value !== "••••••••••••") {
      envVars[key] = value;
      process.env[key] = value;
    }
  }

  // Generate new content
  const newLines = Object.entries(envVars).map(([k, v]) => `${k}=${v}`);
  await writeFile(envPath, newLines.join("\n") + "\n", "utf8");
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: {
      APIFY_TOKEN: Boolean(process.env.APIFY_TOKEN),
      GITHUB_TOKEN: Boolean(process.env.GITHUB_TOKEN),
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY)
    }
  });
});

app.post("/api/settings", async (req, res, next) => {
  try {
    const body = z.object({
      APIFY_TOKEN: z.string().optional(),
      GITHUB_TOKEN: z.string().optional(),
      OPENAI_API_KEY: z.string().optional(),
      ANTHROPIC_API_KEY: z.string().optional()
    }).parse(req.body);

    const updates: Record<string, string> = {};
    if (body.APIFY_TOKEN) updates.APIFY_TOKEN = body.APIFY_TOKEN;
    if (body.GITHUB_TOKEN) updates.GITHUB_TOKEN = body.GITHUB_TOKEN;
    if (body.OPENAI_API_KEY) updates.OPENAI_API_KEY = body.OPENAI_API_KEY;
    if (body.ANTHROPIC_API_KEY) updates.ANTHROPIC_API_KEY = body.ANTHROPIC_API_KEY;

    await updateEnvFile(updates);
    res.json({ ok: true, message: "Settings saved and loaded into memory successfully" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/main-runs", async (_req, res, next) => {
  try {
    const runsDir = path.join(factoryRoot(), "reports", "main-agent-runs");
    if (!existsSync(runsDir)) {
      return res.json([]);
    }
    const entries = await readdir(runsDir, { withFileTypes: true });
    const runDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith("run-")).map((e) => e.name);
    
    // Sort descending by folder name (date)
    runDirs.sort((a, b) => b.localeCompare(a));
    
    const parsed = await Promise.all(runDirs.map((runId) => parseMainRunReport(runId)));
    return res.json(parsed);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/main-runs/:id", async (req, res, next) => {
  try {
    const runId = req.params.id;
    const runsDir = path.join(factoryRoot(), "reports", "main-agent-runs", runId);
    if (!existsSync(runsDir)) {
      return res.status(404).json({ error: "Run not found" });
    }
    const mainReport = await readTextSafe(path.join(runsDir, "main-run-report.md"));
    const gapAnalysis = await readTextSafe(path.join(runsDir, "gap-analysis.md"));
    const storeResearch = await readTextSafe(path.join(runsDir, "apify-store-research.md"));
    const selectedActors = await readTextSafe(path.join(runsDir, "selected-actors.md"));
    return res.json({ runId, mainReport, gapAnalysis, storeResearch, selectedActors });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/runs", (req, res) => {
  if (activeRun.status === "running") {
    return res.status(400).json({ error: "A main agent run is already in progress." });
  }

  activeRun = {
    process: spawn("npm", ["run", "main-agent"], { cwd: factoryRoot(), env: { ...process.env, APIFY_DISABLE_TELEMETRY: "1" } }),
    logs: [],
    status: "running"
  };

  activeRun.logs.push("[server] Started Main Agent Run in background");

  activeRun.process.stdout.on("data", (data: any) => {
    activeRun.logs.push(data.toString());
  });

  activeRun.process.stderr.on("data", (data: any) => {
    activeRun.logs.push(data.toString());
  });

  activeRun.process.on("close", (code: number) => {
    activeRun.status = code === 0 ? "success" : "failed";
    activeRun.process = null;
    activeRun.logs.push(`[server] Main Agent Run finished with exit code ${code}`);
  });

  return res.status(202).json({ message: "Main Agent Run started" });
});

app.get("/api/runs/status", (req, res) => {
  res.json({
    status: activeRun.status,
    logs: activeRun.logs
  });
});

app.post("/api/sync-store", (req, res) => {
  if (activeSync.status === "running") {
    return res.status(400).json({ error: "Store synchronization is already in progress." });
  }

  activeSync = {
    process: spawn("npm", ["run", "sync-store"], { cwd: factoryRoot(), env: process.env }),
    logs: [],
    status: "running"
  };

  activeSync.logs.push("[server] Started Store Sync in background");

  activeSync.process.stdout.on("data", (data: any) => {
    activeSync.logs.push(data.toString());
  });

  activeSync.process.stderr.on("data", (data: any) => {
    activeSync.logs.push(data.toString());
  });

  activeSync.process.on("close", (code: number) => {
    activeSync.status = code === 0 ? "success" : "failed";
    activeSync.process = null;
    activeSync.logs.push(`[server] Store Sync finished with exit code ${code}`);
  });

  return res.status(202).json({ message: "Store Sync started" });
});

app.get("/api/sync-store/status", (req, res) => {
  res.json({
    status: activeSync.status,
    logs: activeSync.logs
  });
});

async function autoDiscoverActors(db: FileDatabase) {
  try {
    const actorsDir = path.join(factoryRoot(), "generated-actors");
    if (!existsSync(actorsDir)) return;
    const entries = await readdir(actorsDir, { withFileTypes: true });
    
    // Read all existing database records
    const dbActors = await db.listActors();
    const dbSlugs = new Set(dbActors.map((a) => a.slug));
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      
      // Skip backup folders and system folders
      if (slug.includes("-backup-") || slug === "node_modules" || slug === "dist" || slug === ".git" || slug === ".mcp-wrapper") continue;
      
      // If already in db, skip
      if (dbSlugs.has(slug)) continue;
      
      const actorDir = path.join(actorsDir, slug);
      
      // Read actor.json if it exists
      const actorJsonPath = path.join(actorDir, ".actor", "actor.json");
      let title = slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
      let problemSolved = "";
      if (existsSync(actorJsonPath)) {
        try {
          const raw = await readFile(actorJsonPath, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed.title) title = parsed.title;
          if (parsed.description) problemSolved = parsed.description;
        } catch {}
      }
      
      // Determine template used
      const packageJsonPath = path.join(actorDir, "package.json");
      let template: any = "project-langgraph-agent-javascript";
      if (existsSync(packageJsonPath)) {
        try {
          const raw = await readFile(packageJsonPath, "utf8");
          const pkg = JSON.parse(raw);
          if (pkg.dependencies && (pkg.dependencies["@google/genai"] || pkg.dependencies["@bee-ai/agent"])) {
            template = "ts-beeai-agent";
          }
        } catch {}
      }
      
      // Check if pushed or has previous reports
      const reportsDir = path.join(actorDir, "reports");
      const storeReport = path.join(reportsDir, "store-publication-report.md");
      const deployReport = path.join(reportsDir, "deploy-report.md");
      const pactReport = path.join(reportsDir, "pact-test-report.md");
      
      let status: any = "queued";
      let finalVerdict: any = undefined;
      
      if (existsSync(storeReport) || existsSync(deployReport)) {
        status = "deployed";
        finalVerdict = "PASS";
      } else if (existsSync(pactReport)) {
        try {
          const pactContent = await readFile(pactReport, "utf8");
          if (pactContent.includes("PASS")) {
            status = "ready_for_deploy";
            finalVerdict = "PASS";
          } else {
            status = "failed";
            finalVerdict = "FAIL";
          }
        } catch {}
      }
      
      // Get creation date of the directory
      let createdAt = new Date().toISOString();
      try {
        const folderStats = await stat(actorDir);
        createdAt = folderStats.birthtime.toISOString() || folderStats.mtime.toISOString();
      } catch {}
      
      // Upsert into db
      const actorId = randomUUID();
      await db.upsertActor({
        id: actorId,
        name: title,
        slug,
        sourceType: "idea",
        sourceValue: problemSolved || title,
        template,
        status,
        createdAt,
        updatedAt: createdAt,
        monetizationScore: 85,
        finalVerdict,
        actorDir
      });

      // Discover reports
      if (existsSync(reportsDir)) {
        try {
          const reportFiles = await readdir(reportsDir);
          for (const file of reportFiles) {
            if (!file.endsWith(".md")) continue;
            const type = file.replace(".md", "");
            const reportPath = path.join(reportsDir, file);
            const markdown = await readFile(reportPath, "utf8");
            
            await db.addReport({
              actorId,
              type: type as any,
              path: reportPath,
              markdown
            });
          }
        } catch {}
      }
    }
  } catch (error) {
    console.error("Auto-discovery failed:", error);
  }
}

app.get("/api/actors", async (_req, res, next) => {
  try {
    await autoDiscoverActors(db);
    res.json(await db.listActors());
  } catch (error) {
    next(error);
  }
});


app.get("/api/actors/:id", async (req, res, next) => {
  try {
    const actor = await db.getActor(req.params.id);
    if (!actor) return res.status(404).json({ error: "Actor not found" });
    const reports = await db.listReports(actor.id);
    return res.json({ ...actor, reports });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/actors/:id/reports", async (req, res, next) => {
  try {
    res.json(await db.listReports(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/actors/create-from-idea", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const actor = await createActorPipeline({ ...body, sourceType: "idea" }, db);
    res.status(201).json(actor);
  } catch (error) {
    next(error);
  }
});

app.post("/api/actors/create-from-workflow", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const actor = await createActorPipeline({ ...body, sourceType: "workflow" }, db);
    res.status(201).json(actor);
  } catch (error) {
    next(error);
  }
});

app.post("/api/actors/create-from-github", async (req, res, next) => {
  try {
    const body = createSchema.extend({ repoUrl: z.string().url().optional() }).parse(req.body);
    const actor = await createActorPipeline({ ...body, prompt: body.repoUrl ?? body.prompt, sourceType: "github" }, db);
    res.status(201).json(actor);
  } catch (error) {
    next(error);
  }
});

app.post("/api/actors/run-pact", async (req, res, next) => {
  try {
    const body = z.object({ actorId: z.string(), maxAttempts: z.number().int().min(1).max(25).optional() }).parse(req.body);
    const actor = await db.getActor(body.actorId);
    if (!actor?.actorDir) return res.status(404).json({ error: "Actor or actor directory not found" });
    await db.setStatus(actor.id, "testing");
    const pact = await runPact(actor.actorDir, body.maxAttempts ?? 10);
    await db.updateActor(actor.id, { status: pact.passed ? "ready_for_deploy" : "failed", finalVerdict: pact.passed ? undefined : "FAIL" });
    return res.json(pact);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/actors/verify-deploy", async (req, res, next) => {
  try {
    const body = z.object({ actorId: z.string() }).parse(req.body);
    const actor = await db.getActor(body.actorId);
    if (!actor) return res.status(404).json({ error: "Actor not found" });
    const gate = await runQualityGate(actor, {
      passed: actor.status === "ready_for_deploy" || actor.status === "deployed",
      attempts: 0,
      testsRun: [],
      failures: [],
      fixesApplied: [],
      remainingRisks: [],
      command: "previous PACT result"
    });
    return res.json(gate);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/actors/deploy", async (req, res, next) => {
  try {
    const body = z.object({ actorId: z.string() }).parse(req.body);
    const actor = await db.getActor(body.actorId);
    if (!actor) return res.status(404).json({ error: "Actor not found" });
    await db.setStatus(actor.id, "deploying");
    const gate = await runQualityGate(actor, {
      passed: actor.status === "ready_for_deploy",
      attempts: 0,
      testsRun: [],
      failures: [],
      fixesApplied: [],
      remainingRisks: [],
      command: "previous PACT result"
    });
    const deploy = await deployActor(actor, gate);
    await db.updateActor(actor.id, { status: deploy.pushed ? "deployed" : "failed", actorUrl: deploy.actorUrl, finalVerdict: deploy.pushed ? "PASS" : "FAIL" });
    return res.json(deploy);
  } catch (error) {
    return next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(400).json({ error: message });
});

app.listen(port, () => {
  console.log(`Creator Factory API listening on http://localhost:${port}`);
});
