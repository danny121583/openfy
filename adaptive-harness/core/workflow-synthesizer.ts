/**
 * Workflow Synthesizer — takes a user goal + project profile + available skills + safety policy
 * and generates a structured workflow plan with phases, agents, tools, verification, and rollback.
 */

import { randomUUID } from "node:crypto";
import type { ProjectProfile, WorkflowPlan, WorkflowPhase } from "./project-profile.js";
import type { SkillMeta } from "./project-profile.js";

export interface SafetyPolicy {
  defaultMode: string;
  allowAutoFix: boolean;
  allowAutoDependencyPatch: boolean;
  allowAutoMajorUpdates: boolean;
  requireApprovalFor: string[];
  neverAutoChange: string[];
}

export function synthesizeWorkflow(
  goal: string,
  profile: ProjectProfile,
  availableSkills: SkillMeta[],
  safetyPolicy: SafetyPolicy
): WorkflowPlan {
  const phases = buildPhases(goal, profile, availableSkills, safetyPolicy);
  const reportPath = `reports/${formatTimestamp()}-agent-report.md`;

  return {
    id: randomUUID(),
    goal,
    createdAt: new Date().toISOString(),
    projectProfile: profile,
    phases,
    rollbackPlan: buildRollbackPlan(profile),
    reportPath,
  };
}

// ---------------------------------------------------------------------------
// Phase builders
// ---------------------------------------------------------------------------

function buildPhases(
  goal: string,
  profile: ProjectProfile,
  skills: SkillMeta[],
  policy: SafetyPolicy
): WorkflowPhase[] {
  const goalLower = goal.toLowerCase();
  const phases: WorkflowPhase[] = [];

  // Phase 0: Always start with analysis
  phases.push({
    index: 0,
    name: "Project Analysis",
    description: "Analyze project structure, detect stack, and build profile.",
    agents: ["planner"],
    skills: matchSkills(skills, ["repo-analysis"]),
    filesToInspect: [...profile.manifests, ...profile.entrypoints],
    filesThatMayBeEdited: [],
    verificationCommands: [],
    safetyGates: [],
  });

  // Goal-specific phases
  if (goalLower.includes("update") || goalLower.includes("dependency") || goalLower.includes("outdated")) {
    phases.push(...buildDependencyUpdatePhases(profile, skills, policy));
  } else if (goalLower.includes("heal") || goalLower.includes("fix") || goalLower.includes("repair") || goalLower.includes("error")) {
    phases.push(...buildSelfHealPhases(profile, skills, policy));
  } else if (goalLower.includes("audit") || goalLower.includes("review") || goalLower.includes("readiness")) {
    phases.push(...buildAuditPhases(profile, skills, policy));
  } else if (goalLower.includes("security") || goalLower.includes("vulnerability")) {
    phases.push(...buildSecurityPhases(profile, skills, policy));
  } else if (goalLower.includes("test") || goalLower.includes("coverage")) {
    phases.push(...buildTestPhases(profile, skills, policy));
  } else if (goalLower.includes("apify") || goalLower.includes("actor") || goalLower.includes("marketplace")) {
    phases.push(...buildApifyPhases(profile, skills, policy));
  } else {
    // Generic goal — full audit + recommendation
    phases.push(...buildAuditPhases(profile, skills, policy));
  }

  // Final phase: always report and update memory
  phases.push({
    index: phases.length,
    name: "Report & Memory Update",
    description: "Generate timestamped report, save lessons learned, update memory store.",
    agents: ["memory-curator"],
    skills: matchSkills(skills, ["report-writing"]),
    filesToInspect: [],
    filesThatMayBeEdited: [],
    verificationCommands: [],
    safetyGates: [],
  });

  // Re-index phases
  phases.forEach((p, i) => (p.index = i));

  return phases;
}

function buildDependencyUpdatePhases(profile: ProjectProfile, skills: SkillMeta[], policy: SafetyPolicy): WorkflowPhase[] {
  return [
    {
      index: 0,
      name: "Dependency Scan",
      description: "Check for outdated packages, security advisories, and deprecated dependencies.",
      agents: ["update-watcher"],
      skills: matchSkills(skills, ["dependency-updates"]),
      filesToInspect: [...profile.manifests, ...profile.lockfiles],
      filesThatMayBeEdited: [],
      verificationCommands: profile.commands.install ? [profile.commands.install] : [],
      safetyGates: [],
    },
    {
      index: 0,
      name: "Security Advisory Check",
      description: "Scan for known vulnerabilities in dependencies.",
      agents: ["update-watcher"],
      skills: matchSkills(skills, ["security-review"]),
      filesToInspect: [...profile.manifests],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: ["security"],
    },
    {
      index: 0,
      name: "Apply Safe Updates",
      description: policy.allowAutoDependencyPatch
        ? "Apply non-breaking patch updates automatically."
        : "Generate update recommendations only (auto-patch disabled).",
      agents: ["executor"],
      skills: matchSkills(skills, ["dependency-updates"]),
      filesToInspect: [...profile.manifests],
      filesThatMayBeEdited: policy.allowAutoDependencyPatch ? [...profile.manifests, ...profile.lockfiles] : [],
      verificationCommands: buildVerifyCommands(profile),
      safetyGates: ["deployment"],
    },
  ];
}

function buildSelfHealPhases(profile: ProjectProfile, skills: SkillMeta[], _policy: SafetyPolicy): WorkflowPhase[] {
  return [
    {
      index: 0,
      name: "Failure Classification",
      description: "Identify failure type, likely cause, and relevant files.",
      agents: ["critic", "self-healer"],
      skills: matchSkills(skills, ["self-healing"]),
      filesToInspect: [...profile.entrypoints, ...profile.manifests],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
    {
      index: 0,
      name: "Minimal Patch",
      description: "Propose and apply the smallest possible fix.",
      agents: ["self-healer", "executor"],
      skills: matchSkills(skills, ["self-healing"]),
      filesToInspect: [],
      filesThatMayBeEdited: [...profile.entrypoints],
      verificationCommands: buildVerifyCommands(profile),
      safetyGates: ["auth", "payments", "security", "database"],
    },
    {
      index: 0,
      name: "Verification",
      description: "Rerun build, test, and lint to confirm fix.",
      agents: ["verifier"],
      skills: matchSkills(skills, ["test-runner"]),
      filesToInspect: [],
      filesThatMayBeEdited: [],
      verificationCommands: buildVerifyCommands(profile),
      safetyGates: [],
    },
  ];
}

function buildAuditPhases(profile: ProjectProfile, skills: SkillMeta[], _policy: SafetyPolicy): WorkflowPhase[] {
  const phases: WorkflowPhase[] = [
    {
      index: 0,
      name: "Structure Audit",
      description: "Verify project structure, entrypoints, manifests, and CI configuration.",
      agents: ["critic"],
      skills: matchSkills(skills, ["repo-analysis"]),
      filesToInspect: [...profile.manifests, ...profile.ciFiles, ...profile.docs, ...profile.entrypoints],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
    {
      index: 0,
      name: "Dependency Audit",
      description: "Check for outdated, vulnerable, or unused dependencies.",
      agents: ["update-watcher"],
      skills: matchSkills(skills, ["dependency-updates", "security-review"]),
      filesToInspect: [...profile.manifests, ...profile.lockfiles],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
    {
      index: 0,
      name: "Test & Build Verification",
      description: "Run available build, test, lint, and typecheck commands.",
      agents: ["verifier"],
      skills: matchSkills(skills, ["test-runner"]),
      filesToInspect: [],
      filesThatMayBeEdited: [],
      verificationCommands: buildVerifyCommands(profile),
      safetyGates: [],
    },
    {
      index: 0,
      name: "Documentation Review",
      description: "Check documentation completeness and freshness.",
      agents: ["critic"],
      skills: matchSkills(skills, ["docs-updater"]),
      filesToInspect: [...profile.docs],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
  ];

  // Add Apify-specific audit if detected
  if (profile.type === "apify" && profile.apify) {
    phases.push({
      index: 0,
      name: "Apify Actor Audit",
      description: "Verify actor structure, schemas, SDK usage, deployment readiness.",
      agents: ["adapter-specialist"],
      skills: matchSkills(skills, ["apify-adapter"]),
      filesToInspect: profile.apify.actorDirs.flatMap((d) => [`${d}/.actor/actor.json`, `${d}/.actor/input_schema.json`, `${d}/main.js`]),
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: ["publishing", "pricing"],
    });
  }

  return phases;
}

function buildSecurityPhases(profile: ProjectProfile, skills: SkillMeta[], _policy: SafetyPolicy): WorkflowPhase[] {
  return [
    {
      index: 0,
      name: "Secret Scan",
      description: "Scan for exposed secrets, credentials, API keys in source code.",
      agents: ["critic"],
      skills: matchSkills(skills, ["security-review"]),
      filesToInspect: [...profile.envFiles, ...profile.risks.security],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: ["secrets", "security"],
    },
    {
      index: 0,
      name: "Dependency Vulnerabilities",
      description: "Check for known CVEs in dependencies.",
      agents: ["update-watcher"],
      skills: matchSkills(skills, ["dependency-updates", "security-review"]),
      filesToInspect: [...profile.manifests, ...profile.lockfiles],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: ["security"],
    },
  ];
}

function buildTestPhases(profile: ProjectProfile, skills: SkillMeta[], _policy: SafetyPolicy): WorkflowPhase[] {
  return [
    {
      index: 0,
      name: "Test Execution",
      description: "Run all available test suites.",
      agents: ["verifier"],
      skills: matchSkills(skills, ["test-runner"]),
      filesToInspect: [...profile.entrypoints],
      filesThatMayBeEdited: [],
      verificationCommands: buildVerifyCommands(profile),
      safetyGates: [],
    },
    {
      index: 0,
      name: "Coverage Analysis",
      description: "Analyze test coverage and identify gaps.",
      agents: ["critic"],
      skills: matchSkills(skills, ["test-runner"]),
      filesToInspect: [],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
  ];
}

function buildApifyPhases(profile: ProjectProfile, skills: SkillMeta[], _policy: SafetyPolicy): WorkflowPhase[] {
  const apifyFiles = profile.apify
    ? profile.apify.actorDirs.flatMap((d) => [
        `${d}/.actor/actor.json`,
        `${d}/.actor/input_schema.json`,
        `${d}/.actor/output_schema.json`,
        `${d}/main.js`,
        `${d}/package.json`,
        `${d}/README.md`,
      ])
    : [];

  return [
    {
      index: 0,
      name: "Actor Structure Analysis",
      description: "Inspect all actor directories, configurations, and schemas.",
      agents: ["adapter-specialist"],
      skills: matchSkills(skills, ["apify-adapter"]),
      filesToInspect: apifyFiles,
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
    {
      index: 0,
      name: "SDK & Framework Usage Review",
      description: "Check Apify SDK version, Crawlee usage patterns, proxy configuration.",
      agents: ["adapter-specialist", "critic"],
      skills: matchSkills(skills, ["apify-adapter"]),
      filesToInspect: [...profile.manifests, ...profile.entrypoints],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: [],
    },
    {
      index: 0,
      name: "Schema Validation",
      description: "Validate input and output schemas against Apify standards.",
      agents: ["verifier"],
      skills: matchSkills(skills, ["apify-adapter"]),
      filesToInspect: [],
      filesThatMayBeEdited: [],
      verificationCommands: ["APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema"],
      safetyGates: [],
    },
    {
      index: 0,
      name: "Marketplace Readiness Assessment",
      description: "Evaluate deployment readiness, documentation, pricing, and publication status.",
      agents: ["adapter-specialist", "critic"],
      skills: matchSkills(skills, ["apify-adapter", "docs-updater"]),
      filesToInspect: [...profile.docs, ...apifyFiles],
      filesThatMayBeEdited: [],
      verificationCommands: [],
      safetyGates: ["publishing", "pricing"],
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchSkills(available: SkillMeta[], names: string[]): string[] {
  return available
    .filter((s) => names.some((n) => s.name === n || s.name.includes(n)))
    .map((s) => s.name);
}

function buildVerifyCommands(profile: ProjectProfile): string[] {
  const cmds: string[] = [];
  if (profile.commands.install) cmds.push(profile.commands.install);
  if (profile.commands.build) cmds.push(profile.commands.build);
  if (profile.commands.test) cmds.push(profile.commands.test);
  if (profile.commands.lint) cmds.push(profile.commands.lint);
  if (profile.commands.typecheck) cmds.push(profile.commands.typecheck);
  return cmds;
}

function buildRollbackPlan(profile: ProjectProfile): string {
  const steps = [
    "1. Discard all uncommitted changes: `git checkout -- .`",
    "2. Re-install dependencies: `" + (profile.commands.install ?? "npm install") + "`",
    "3. Verify build: `" + (profile.commands.build ?? "echo 'no build command'") + "`",
  ];
  if (profile.commands.test) {
    steps.push("4. Run tests: `" + profile.commands.test + "`");
  }
  return steps.join("\n");
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}
