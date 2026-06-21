#!/usr/bin/env tsx
/**
 * CLI entry point: npm run harness:workflow -- "your task here"
 * Synthesizes a workflow plan and optionally lists skills.
 */

import path from "node:path";
import { analyzeProject } from "../core/project-analyzer.js";
import { loadSkillRegistry, matchSkillsForTask } from "../core/skill-registry.js";
import { synthesizeWorkflow } from "../core/workflow-synthesizer.js";
import { loadSafetyPolicy } from "../core/safety-gates.js";

const args = process.argv.slice(2);
const goal = args.filter((a) => !a.startsWith("--")).join(" ") || "Full project audit";
const rootArg = args.find((a) => a.startsWith("--root="));
const projectRoot = rootArg ? rootArg.split("=")[1]! : path.resolve(import.meta.dirname ?? ".", "..");

console.log("════════════════════════════════════════════════════════");
console.log("  Adaptive Harness — Workflow Synthesizer");
console.log("════════════════════════════════════════════════════════");
console.log(`  Goal: ${goal}`);
console.log(`  Target: ${projectRoot}`);
console.log("");

try {
  const profile = await analyzeProject(projectRoot);
  const skills = await loadSkillRegistry();
  const policy = await loadSafetyPolicy();

  if (goal.toLowerCase().includes("list") && goal.toLowerCase().includes("skill")) {
    console.log("Available skills:");
    for (const skill of skills) {
      console.log(`  - ${skill.name}: ${skill.description}`);
    }
    console.log("");
    console.log(`Total: ${skills.length} skills loaded.`);
    process.exit(0);
  }

  const plan = synthesizeWorkflow(goal, profile, skills, policy);

  console.log(`  Project Type: ${profile.type}`);
  console.log(`  Adapter: ${profile.adapters[0] ?? "none"}`);
  console.log(`  Phases: ${plan.phases.length}`);
  console.log("");

  for (const phase of plan.phases) {
    console.log(`  Phase ${phase.index}: ${phase.name}`);
    console.log(`    ${phase.description}`);
    console.log(`    Agents: ${phase.agents.join(", ")}`);
    console.log(`    Skills: ${phase.skills.join(", ") || "none"}`);
    if (phase.verificationCommands.length > 0) {
      console.log(`    Verify: ${phase.verificationCommands.join(", ")}`);
    }
    if (phase.safetyGates.length > 0) {
      console.log(`    Safety Gates: ${phase.safetyGates.join(", ")}`);
    }
    console.log("");
  }

  console.log("  Rollback Plan:");
  console.log(`    ${plan.rollbackPlan.split("\n").join("\n    ")}`);
  console.log("");
  console.log("  Matched Skills:");
  const matched = matchSkillsForTask(skills, goal);
  for (const skill of matched) {
    console.log(`    - ${skill.name}: ${skill.description.slice(0, 80)}...`);
  }

  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log("  ✅ Workflow plan generated. Ready for execution.");
  console.log("════════════════════════════════════════════════════════");
} catch (error) {
  console.error("Workflow synthesis failed:", error);
  process.exit(1);
}
