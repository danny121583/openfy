import { runRepoAuditWorkflow } from "../workflows/repo-audit.workflow.js";
import { runDependencyReviewWorkflow } from "../workflows/dependency-review.workflow.js";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname ?? ".", "../..");

(async () => {
  console.log("Starting full repo and dependency audit...");
  try {
    const auditReport = await runRepoAuditWorkflow(projectRoot);
    console.log(`Repo audit complete: ${auditReport}`);
    
    const depReport = await runDependencyReviewWorkflow(projectRoot);
    console.log(`Dependency review complete: ${depReport}`);
  } catch (err) {
    console.error("Audit failed:", err);
    process.exit(1);
  }
})();
