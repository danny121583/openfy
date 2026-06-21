/**
 * Project Profile — normalized representation of any analyzed repository.
 * This is the central data contract that all adapters, workflows, and agents consume.
 */

export interface ProjectProfile {
  name: string;
  root: string;
  detectedAt: string;
  type: "node" | "python" | "monorepo" | "apify" | "unknown";
  languages: string[];
  packageManager?: "npm" | "pnpm" | "yarn" | "bun" | "pip" | "poetry" | "uv" | "unknown";
  frameworks: string[];
  commands: {
    install?: string;
    build?: string;
    test?: string;
    lint?: string;
    typecheck?: string;
    dev?: string;
    start?: string;
  };
  manifests: string[];
  lockfiles: string[];
  ciFiles: string[];
  envFiles: string[];
  docs: string[];
  entrypoints: string[];
  adapters: string[];
  risks: {
    auth: string[];
    payments: string[];
    security: string[];
    env: string[];
    deployment: string[];
    database: string[];
  };
  apify?: ApifyProfile;
}

export interface ApifyProfile {
  hasActorJson: boolean;
  hasInputSchema: boolean;
  usesApifySdk: boolean;
  usesCrawlee: boolean;
  actorEntrypoint?: string;
  inputSchemaPath?: string;
  storagePath?: string;
  actorDirs: string[];
  hasMonetizationMetadata: boolean;
  hasOutputSchema: boolean;
  usesProxy: boolean;
  usesDataset: boolean;
  usesKeyValueStore: boolean;
  usesRequestQueue: boolean;
}

export interface WorkflowPlan {
  id: string;
  goal: string;
  createdAt: string;
  projectProfile: ProjectProfile;
  phases: WorkflowPhase[];
  rollbackPlan: string;
  reportPath: string;
}

export interface WorkflowPhase {
  index: number;
  name: string;
  description: string;
  agents: string[];
  skills: string[];
  filesToInspect: string[];
  filesThatMayBeEdited: string[];
  verificationCommands: string[];
  safetyGates: string[];
}

export interface MemoryEntry {
  id: string;
  timestamp: string;
  type: "lesson" | "failure" | "success" | "update";
  projectRoot: string;
  adapter: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface VerificationResult {
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  passed: boolean;
}

export interface SafetyGateResult {
  gate: string;
  target: string;
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
}

export interface HarnessReport {
  task: string;
  date: string;
  projectProfile: ProjectProfile;
  detectedAdapter: string;
  workflowUsed: string;
  agentsUsed: string[];
  skillsUsed: string[];
  filesInspected: string[];
  filesChanged: string[];
  commandsRun: VerificationResult[];
  verificationResult: "pass" | "fail" | "skipped";
  failures: string[];
  fixesApplied: string[];
  safetyGatesTriggered: SafetyGateResult[];
  lessonsLearned: string[];
  recommendations: string[];
}

export interface FailureClassification {
  type:
    | "install_failure"
    | "build_failure"
    | "test_failure"
    | "type_error"
    | "lint_failure"
    | "runtime_failure"
    | "dependency_mismatch"
    | "missing_env"
    | "broken_adapter"
    | "stale_docs"
    | "bad_workflow"
    | "bad_prompt"
    | "external_api_change";
  likelyCause: string;
  relevantFiles: string[];
  proposedFix: string;
  isSafeToAutoFix: boolean;
}

export interface UpdateRecommendation {
  package: string;
  currentVersion: string;
  latestVersion: string;
  updateType: "patch" | "minor" | "major";
  hasSecurityAdvisory: boolean;
  advisoryDetails?: string;
  isBreaking: boolean;
  recommendation: "apply" | "review" | "skip";
}

export interface SkillMeta {
  name: string;
  description: string;
  path: string;
  whenToUse: string[];
  whenNotToUse: string[];
}

export interface AdapterDetection {
  adapter: string;
  confidence: number;
  signals: string[];
}
