/**
 * Self-Healer — classifies failures, identifies likely causes,
 * proposes minimal patches, and determines if auto-fix is safe.
 */

import type { FailureClassification, VerificationResult } from "./project-profile.js";

export function classifyFailure(result: VerificationResult): FailureClassification {
  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  const command = result.command.toLowerCase();

  // Install failures
  if (command.includes("install") && !result.passed) {
    if (combined.includes("enoent") || combined.includes("not found")) {
      return {
        type: "install_failure",
        likelyCause: "Package manager or dependency not found.",
        relevantFiles: ["package.json", "package-lock.json"],
        proposedFix: "Verify package manager is installed. Run `npm install` with clean node_modules.",
        isSafeToAutoFix: true,
      };
    }
    if (combined.includes("peer dep") || combined.includes("conflict")) {
      return {
        type: "dependency_mismatch",
        likelyCause: "Peer dependency conflict between packages.",
        relevantFiles: ["package.json"],
        proposedFix: "Review conflicting peer dependencies. Consider using --legacy-peer-deps.",
        isSafeToAutoFix: false,
      };
    }
    return {
      type: "install_failure",
      likelyCause: "Generic install failure.",
      relevantFiles: ["package.json", "package-lock.json"],
      proposedFix: "Delete node_modules and package-lock.json, then run fresh install.",
      isSafeToAutoFix: true,
    };
  }

  // Build failures
  if (command.includes("build") && !result.passed) {
    if (combined.includes("ts") && (combined.includes("error") || combined.includes("cannot find"))) {
      return {
        type: "type_error",
        likelyCause: "TypeScript compilation error — missing types or incorrect type usage.",
        relevantFiles: ["tsconfig.json"],
        proposedFix: "Fix TypeScript errors in the identified files. Check for missing @types packages.",
        isSafeToAutoFix: false,
      };
    }
    return {
      type: "build_failure",
      likelyCause: "Build process failed.",
      relevantFiles: ["package.json", "tsconfig.json"],
      proposedFix: "Review build output for specific errors. Check build configuration.",
      isSafeToAutoFix: false,
    };
  }

  // Test failures
  if (command.includes("test") && !result.passed) {
    return {
      type: "test_failure",
      likelyCause: "One or more tests failed.",
      relevantFiles: [],
      proposedFix: "Review test output to identify failing assertions. Check for stale snapshots.",
      isSafeToAutoFix: false,
    };
  }

  // Lint failures
  if (command.includes("lint") && !result.passed) {
    return {
      type: "lint_failure",
      likelyCause: "Lint rules violated.",
      relevantFiles: [".eslintrc", ".eslintrc.json", ".prettierrc"],
      proposedFix: "Run linter with --fix flag for auto-fixable issues.",
      isSafeToAutoFix: true,
    };
  }

  // Typecheck failures
  if (command.includes("typecheck") || command.includes("tsc") && !result.passed) {
    return {
      type: "type_error",
      likelyCause: "TypeScript type checking errors.",
      relevantFiles: ["tsconfig.json"],
      proposedFix: "Review TypeScript errors. May need type assertions or missing type definitions.",
      isSafeToAutoFix: false,
    };
  }

  // Missing env
  if (combined.includes("env") && (combined.includes("missing") || combined.includes("undefined") || combined.includes("required"))) {
    return {
      type: "missing_env",
      likelyCause: "Required environment variable is not set.",
      relevantFiles: [".env.example", ".env"],
      proposedFix: "Set the required environment variable. Check .env.example for required vars.",
      isSafeToAutoFix: false,
    };
  }

  // External API change
  if (combined.includes("api") && (combined.includes("deprecated") || combined.includes("breaking") || combined.includes("changed"))) {
    return {
      type: "external_api_change",
      likelyCause: "External API has changed or been deprecated.",
      relevantFiles: [],
      proposedFix: "Update API calls to match new specification. Check API changelog.",
      isSafeToAutoFix: false,
    };
  }

  // Runtime failure
  if (combined.includes("runtime") || combined.includes("uncaught") || combined.includes("unhandled")) {
    return {
      type: "runtime_failure",
      likelyCause: "Runtime error during execution.",
      relevantFiles: [],
      proposedFix: "Review stack trace, add error handling, check for null/undefined access.",
      isSafeToAutoFix: false,
    };
  }

  // Default
  return {
    type: "runtime_failure",
    likelyCause: "Unknown failure. Manual investigation required.",
    relevantFiles: [],
    proposedFix: "Review command output manually.",
    isSafeToAutoFix: false,
  };
}

export function classifyFailureFromError(error: string): FailureClassification {
  const lower = error.toLowerCase();

  if (lower.includes("module not found") || lower.includes("cannot find module")) {
    return {
      type: "dependency_mismatch",
      likelyCause: "Missing module or incorrect import path.",
      relevantFiles: ["package.json"],
      proposedFix: "Install the missing module or fix the import path.",
      isSafeToAutoFix: true,
    };
  }

  if (lower.includes("enoent") || lower.includes("no such file")) {
    return {
      type: "runtime_failure",
      likelyCause: "File or directory not found.",
      relevantFiles: [],
      proposedFix: "Create the missing file or update the path reference.",
      isSafeToAutoFix: false,
    };
  }

  if (lower.includes("stale") || lower.includes("outdated") || lower.includes("out of date")) {
    return {
      type: "stale_docs",
      likelyCause: "Documentation or configuration is out of date.",
      relevantFiles: ["README.md"],
      proposedFix: "Update documentation to reflect current state.",
      isSafeToAutoFix: true,
    };
  }

  if (lower.includes("workflow") || lower.includes("phase") || lower.includes("plan")) {
    return {
      type: "bad_workflow",
      likelyCause: "Workflow plan was invalid or incomplete.",
      relevantFiles: [],
      proposedFix: "Re-analyze the project and regenerate the workflow plan.",
      isSafeToAutoFix: true,
    };
  }

  if (lower.includes("prompt") || lower.includes("instruction") || lower.includes("agent")) {
    return {
      type: "bad_prompt",
      likelyCause: "Agent instruction was ambiguous or incorrect.",
      relevantFiles: [],
      proposedFix: "Clarify the task goal and regenerate the workflow.",
      isSafeToAutoFix: false,
    };
  }

  return {
    type: "runtime_failure",
    likelyCause: "Unclassified error. Manual investigation required.",
    relevantFiles: [],
    proposedFix: "Review the error details manually.",
    isSafeToAutoFix: false,
  };
}

export function buildHealingSteps(classification: FailureClassification): string[] {
  const steps: string[] = [];
  steps.push(`1. Identified failure type: ${classification.type}`);
  steps.push(`2. Likely cause: ${classification.likelyCause}`);
  if (classification.relevantFiles.length > 0) {
    steps.push(`3. Inspect files: ${classification.relevantFiles.join(", ")}`);
  }
  steps.push(`4. Proposed fix: ${classification.proposedFix}`);
  steps.push(`5. Safe to auto-fix: ${classification.isSafeToAutoFix ? "YES" : "NO — requires manual approval"}`);
  steps.push("6. After fix: rerun verification commands");
  steps.push("7. Record lesson in memory store");
  steps.push("8. Generate report");
  return steps;
}
