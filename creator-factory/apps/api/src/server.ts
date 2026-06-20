import cors from "cors";
import express from "express";
import { z } from "zod";
import { createActorPipeline, deployActor, FileDatabase, runPact, runQualityGate } from "@creator-factory/shared";

const app = express();
const db = new FileDatabase();
const port = Number(process.env.PORT ?? 4310);

const createSchema = z.object({
  prompt: z.string().min(8),
  template: z.enum(["auto", "project-langgraph-agent-javascript", "ts-beeai-agent", "python-langgraph"]).default("auto"),
  maxAttempts: z.number().int().min(1).max(25).optional(),
  autoDeploy: z.boolean().optional()
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

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

app.get("/api/actors", async (_req, res, next) => {
  try {
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
