#!/usr/bin/env tsx
import { makeSpec } from "../../../../../shared/src/agents.js";

const args = process.argv.slice(2);
const prompt = args.find(a => a.startsWith("--prompt="))?.split("=")[1];

if (!prompt) {
  console.error("Usage: tsx write_spec.ts --prompt=<prompt>");
  process.exit(1);
}

console.log(`Writing specification for workflow prompt: "${prompt}"`);

async function run() {
  const spec = await makeSpec(prompt);
  console.log("Generated Actor Specification:");
  console.log(JSON.stringify(spec, null, 2));
}

run().catch(err => {
  console.error("Specification writing failed:", err);
  process.exit(1);
});
