#!/usr/bin/env tsx
/**
 * CLI entry point: npm run harness:apify-review
 * Runs the Apify actor review + marketplace readiness workflow.
 */

import path from "node:path";
import { runApifyActorReviewWorkflow } from "../workflows/apify-actor-review.workflow.js";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="));
const projectRoot = rootArg ? rootArg.split("=")[1]! : path.resolve(import.meta.dirname ?? ".", "..");

console.log("════════════════════════════════════════════════════════");
console.log("  Adaptive Harness — Apify Actor Review");
console.log("════════════════════════════════════════════════════════");
console.log(`  Target: ${projectRoot}`);
console.log("");

try {
  const reportPath = await runApifyActorReviewWorkflow(projectRoot);
  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  ✅ Apify review complete. Report: ${reportPath}`);
  console.log("════════════════════════════════════════════════════════");
} catch (error) {
  console.error("Apify review failed:", error);
  process.exit(1);
}
