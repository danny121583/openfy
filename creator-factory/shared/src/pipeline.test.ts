import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileDatabase } from "./database.js";
import { createActorPipeline } from "./pipeline.js";

const originalCwd = process.cwd();
const dir = await mkdtemp(path.join(tmpdir(), "creator-factory-"));
process.chdir(dir);

try {
  const db = new FileDatabase(path.join(dir, "data", "db.json"));
  const actor = await createActorPipeline(
    {
      sourceType: "workflow",
      prompt: "Find restaurants in a city and extract contact info into a lead list",
      template: "project-langgraph-agent-javascript",
      maxAttempts: 1,
      autoDeploy: false
    },
    db
  );
  assert.equal(actor.sourceType, "workflow");
  assert.equal(actor.template, "project-langgraph-agent-javascript");
  const reports = await db.listReports(actor.id);
  assert.ok(reports.some((report) => report.type === "final-report"));
  assert.ok(actor.actorDir?.includes("generated-actors"));
} finally {
  process.chdir(originalCwd);
  await rm(dir, { recursive: true, force: true });
}
