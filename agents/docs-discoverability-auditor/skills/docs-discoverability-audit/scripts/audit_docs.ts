#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const repoPath = args.find(a => a.startsWith("--repoPath="))?.split("=")[1] || process.cwd();

console.log(`Auditing documentation discoverability in: ${repoPath}`);

async function run() {
  const files = await fs.readdir(repoPath).catch(() => [] as string[]);
  const requiredDocs = ["README.md", "CONTRIBUTING.md", "LICENSE", "CHANGELOG.md", "SECURITY.md"];
  const findings: string[] = [];
  const missing: string[] = [];

  for (const doc of requiredDocs) {
    if (files.includes(doc)) {
      findings.push(`- [x] ${doc} is present.`);
    } else {
      missing.push(`- [ ] ${doc} is missing.`);
    }
  }

  const date = new Date().toISOString().split("T")[0];
  const reportPath = path.join(repoPath, `AUDIT_REPORT_${date}.md`);
  const reportContent = `# Documentation Discoverability Audit Report (${date})

## Findings
${findings.join("\n")}

## Gaps
${missing.length > 0 ? missing.join("\n") : "- No missing documentation."}

## Recommendations
${missing.map(doc => `Add missing ${doc.split(" ")[2]} file to project root.`).join("\n") || "No documentation gaps found."}
`;

  await fs.writeFile(reportPath, reportContent, "utf8");
  console.log(`Documentation audit report successfully saved to: ${reportPath}`);
}

run().catch(err => {
  console.error("Documentation audit failed:", err);
  process.exit(1);
});
