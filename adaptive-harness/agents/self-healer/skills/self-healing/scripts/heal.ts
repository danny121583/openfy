#!/usr/bin/env tsx
import { classifyFailureFromError, buildHealingSteps } from "../../../../../core/self-healer.js";

const args = process.argv.slice(2);
const errorText = args.find(a => a.startsWith("--error="))?.split("=")[1] || "Generic build failure";

console.log("Self Healer Agent diagnosing codebase error...");

async function run() {
  const classification = classifyFailureFromError(errorText);
  const steps = buildHealingSteps(classification);
  console.log("Healing Plan Steps:");
  console.log(steps.join("\n"));
}

run().catch(err => {
  console.error("Diagnosis failed:", err);
  process.exit(1);
});
