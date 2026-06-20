import path from "node:path";
import type { ActorRecord, PactResult, QualityGateResult } from "./types.js";
import { ensureDir, factoryRoot, writeText } from "./utils.js";

export async function saveReport(actor: ActorRecord, filename: string, markdown: string) {
  const dir = path.resolve(factoryRoot(), "reports", actor.slug);
  await ensureDir(dir);
  const reportPath = path.join(dir, filename);
  await writeText(reportPath, markdown);
  return reportPath;
}

export function pactMarkdown(result: PactResult) {
  return `# PACT Test Report
## Summary
${result.passed ? "PASS" : "FAIL"}
## Tests Run
${result.testsRun.map((test) => `- ${test}`).join("\n") || "- None"}
## Failures Found
${result.failures.map((failure) => `- ${failure}`).join("\n") || "- None"}
## Fixes Applied
${result.fixesApplied.map((fix) => `- ${fix}`).join("\n") || "- None"}
## Remaining Risks
${result.remainingRisks.map((risk) => `- ${risk}`).join("\n") || "- None"}
## Final Verdict
${result.passed ? "PASS" : "FAIL"}
`;
}

export function deployMarkdown(actor: ActorRecord, gate: QualityGateResult, deploy: { pushed: boolean; actorUrl: string; message: string }) {
  const item = (label: string) => gate.items.find((entry) => entry.label.includes(label))?.passed ?? false;
  return `# Deploy Report
## Actor Name
${actor.name}
## Local Run Status
${item("Runs locally") ? "PASS" : "FAIL"}
## Build Status
${item("approved template") ? "PASS" : "FAIL"}
## Input Schema Status
${item("INPUT_SCHEMA") ? "PASS" : "FAIL"}
## Output Dataset Status
${item("structured results") ? "PASS" : "FAIL"}
## README Status
${item("README.md") ? "PASS" : "FAIL"}
## Secret Scan Status
${item("no hardcoded secrets") ? "PASS" : "FAIL"}
## License Status
${item("license review") ? "PASS" : "FAIL"}
## Monetization Readiness
${item("monetization") ? "PASS" : "FAIL"}
## Apify Push Status
${deploy.pushed ? "PUSHED" : "BLOCKED"}
${deploy.message}
## Actor URL
${deploy.actorUrl || "N/A"}
## Final Verdict
${gate.passed && deploy.pushed ? "PASS" : "FAIL"}
`;
}

export function finalMarkdown(actor: ActorRecord, pact: PactResult, gate: QualityGateResult, deploy: { pushed: boolean; actorUrl: string }) {
  return `# Final Actor Report
## Actor Name
${actor.name}
## Source Type
${actor.sourceType}
## Template Used
${actor.template}
## What It Does
${actor.sourceValue}
## Target Users
Growth teams, agencies, operators, and data buyers.
## Monetization Angle
Usage-priced structured data or recurring monitoring workflow.
## Files Created
${actor.actorDir}
## Tests Run
${pact.testsRun.join("\n")}
## Fixes Applied
${pact.fixesApplied.join("\n") || "None"}
## Quality Gate Result
${gate.passed ? "PASS" : "FAIL"}
## Deployment Result
${deploy.pushed ? "PUSHED" : "BLOCKED"}
## Actor URL
${deploy.actorUrl || "N/A"}
## Recommended Next Improvements
- Replace generated placeholder logic with source-specific production extraction.
- Add integration tests against live target fixtures.
- Add marketplace screenshots after verified live runs.
## Final Verdict
${gate.passed && deploy.pushed ? "PASS" : "FAIL"}
`;
}
