#!/usr/bin/env tsx
import { analyzeProject } from "../../../../../core/project-analyzer.js";
import { loadSkillRegistry } from "../../../../../core/skill-registry.js";
import { synthesizeWorkflow } from "../../../../../core/workflow-synthesizer.js";
import { loadSafetyPolicy } from "../../../../../core/safety-gates.js";
import path from "node:path";

const args = process.argv.slice(2);
const goal = args.find(a => a.startsWith("--goal="))?.split("=")[1] || "Full project audit";
const projectRoot = args.find(a => a.startsWith("--projectRoot="))?.split("=")[1] || path.resolve(process.cwd());

console.log(`Planner Agent running workflow synthesis for: ${projectRoot}`);

async function run() {
  const profile = await analyzeProject(projectRoot);
  const skills = await loadSkillRegistry();
  const policy = await loadSafetyPolicy();

  const plan = synthesizeWorkflow(goal, profile, skills, policy);
  console.log("Synthesized Workflow Plan:");
  console.log(JSON.stringify(plan, null, 2));
}

run().catch(err => {
  console.error("Workflow synthesis failed:", err);
  process.exit(1);
});
