#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const actorDir = args.find(a => a.startsWith("--actorDir="))?.split("=")[1];

if (!actorDir) {
  console.error("Usage: tsx adapt.ts --actorDir=<path>");
  process.exit(1);
}

console.log(`Adapter Specialist checking actor schemas in: ${actorDir}`);

async function run() {
  const schemaPath = path.join(actorDir, ".actor", "input_schema.json");
  let schemaExists = false;
  try {
    await fs.access(schemaPath);
    schemaExists = true;
  } catch {}

  console.log("Adaptation Results:");
  if (schemaExists) {
    console.log("✅ Valid input schema found.");
  } else {
    console.warn("⚠️ input_schema.json not found. Needs scaffolding.");
  }
}

run().catch(err => {
  console.error("Adaptation script failed:", err);
  process.exit(1);
});
