#!/usr/bin/env tsx
import { runPact } from "../../../../../shared/src/agents.js";
import { FileDatabase } from "../../../../../shared/src/database.js";
import path from "node:path";

const args = process.argv.slice(2);
const slug = args.find(a => a.startsWith("--slug="))?.split("=")[1];
const maxAttempts = Number(args.find(a => a.startsWith("--maxAttempts="))?.split("=")[1] || 10);

if (!slug) {
  console.error("Usage: tsx run_pact.ts --slug=<slug> [--maxAttempts=<maxAttempts>]");
  process.exit(1);
}

const db = new FileDatabase();
console.log(`Running PACT test for: ${slug} with max attempts: ${maxAttempts}`);

async function run() {
  const actors = await db.listActors();
  const actor = actors.find(a => a.slug === slug);
  if (!actor) {
    throw new Error(`Actor not found in database: ${slug}`);
  }

  const actorDir = actor.actorDir || path.resolve(process.cwd(), "generated-actors", slug);
  console.log(`Running PACT testing loop in: ${actorDir}...`);
  
  const result = await runPact(actorDir, maxAttempts);
  console.log("PACT Test Loop Results:");
  console.log(JSON.stringify(result, null, 2));

  if (!result.passed) {
    console.error("PACT testing loop failed after max attempts.");
    process.exit(1);
  }
}

run().catch(err => {
  console.error("PACT test script failed:", err);
  process.exit(1);
});
