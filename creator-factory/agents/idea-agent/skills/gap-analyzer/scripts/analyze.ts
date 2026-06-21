#!/usr/bin/env tsx
import { makeConcept } from "../../../../../shared/src/agents.js";

const args = process.argv.slice(2);
const prompt = args.find(a => a.startsWith("--prompt="))?.split("=")[1];
const sourceType = args.find(a => a.startsWith("--sourceType="))?.split("=")[1] as any || "idea";

if (!prompt) {
  console.error("Usage: tsx analyze.ts --prompt=<prompt> [--sourceType=<sourceType>]");
  process.exit(1);
}

console.log(`Analyzing idea: "${prompt}" using source type ${sourceType}...`);

async function run() {
  const concept = await makeConcept(prompt, sourceType);
  console.log("Generated Actor Concept:");
  console.log(JSON.stringify(concept, null, 2));
}

run().catch(err => {
  console.error("Idea analysis failed:", err);
  process.exit(1);
});
