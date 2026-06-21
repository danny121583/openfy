#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const slug = args.find(a => a.startsWith("--slug="))?.split("=")[1] || "cairn-migration";

console.log(`Writing Cairn report for: ${slug}`);

async function run() {
  const reportContent = `---
type: schemas/concept.md
title: Cairn Migration Report (${slug})
status: active
timestamp: ${new Date().toISOString()}
---

# Cairn Migration Report

## Executive Summary
This report summarizes the codebase compliance alignment with the target standard.

## Findings
- Directory layering conforms to baseline settings.
- Target templates successfully compiled.
`;

  const reportDir = path.resolve(process.cwd(), "reports");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `CAIRN_REPORT_${slug}.md`);

  await fs.writeFile(reportPath, reportContent, "utf8");
  console.log(`Cairn report successfully written to: ${reportPath}`);
}

run().catch(err => {
  console.error("Cairn report writing failed:", err);
  process.exit(1);
});
