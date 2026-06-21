#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const lesson = args.find(a => a.startsWith("--lesson="))?.split("=")[1] || "Default run verification";

console.log("Memory Curator Agent updating operational memory...");

async function run() {
  const memDir = path.resolve(process.cwd(), "adaptive-harness", "reports");
  await fs.mkdir(memDir, { recursive: true });
  const memPath = path.join(memDir, "memory-log.json");

  const logEntry = {
    timestamp: new Date().toISOString(),
    lesson
  };

  let logList = [];
  try {
    const raw = await fs.readFile(memPath, "utf8");
    logList = JSON.parse(raw);
  } catch {}

  logList.push(logEntry);
  await fs.writeFile(memPath, JSON.stringify(logList, null, 2), "utf8");
  console.log(`Saved lesson to memory log: ${memPath}`);
}

run().catch(err => {
  console.error("Memory curation failed:", err);
  process.exit(1);
});
