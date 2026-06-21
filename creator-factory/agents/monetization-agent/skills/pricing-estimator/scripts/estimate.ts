#!/usr/bin/env tsx
import { makeMonetization } from "../../../../../shared/src/agents.js";
import { FileDatabase } from "../../../../../shared/src/database.js";

const args = process.argv.slice(2);
const slug = args.find(a => a.startsWith("--slug="))?.split("=")[1];

if (!slug) {
  console.error("Usage: tsx estimate.ts --slug=<slug>");
  process.exit(1);
}

const db = new FileDatabase();
console.log(`Evaluating monetization potential for actor slug: ${slug}`);

async function run() {
  const actors = await db.listActors();
  const actor = actors.find(a => a.slug === slug);
  if (!actor) {
    throw new Error(`Actor not found in database: ${slug}`);
  }

  // Construct a concept parameter for makeMonetization
  const concept = {
    title: actor.name,
    category: actor.template.includes("python") ? "Automation" : "Lead Generation",
    targetUsers: ["growth teams", "operations"],
    actorType: "workflow automation",
    monetizationAngle: actor.sourceValue,
    sourceType: actor.sourceType
  };

  const monetization = await makeMonetization(concept);
  console.log("Monetization Potential Score:", monetization.score);
  console.log("Monetization Report Markdown Preview:");
  console.log(monetization.markdown.slice(0, 500) + "...");
}

run().catch(err => {
  console.error("Monetization estimation failed:", err);
  process.exit(1);
});
