export type SourceType = "idea" | "github" | "workflow" | "api" | "script";

export type ActorStatus =
  | "queued"
  | "analyzing"
  | "building"
  | "testing"
  | "fixing"
  | "ready_for_deploy"
  | "deploying"
  | "deployed"
  | "failed";

export type TemplateId =
  | "auto"
  | "project-langgraph-agent-javascript"
  | "ts-beeai-agent"
  | "python-langgraph";

export type ActorRecord = {
  id: string;
  name: string;
  slug: string;
  sourceType: SourceType;
  sourceValue: string;
  template: TemplateId;
  status: ActorStatus;
  createdAt: string;
  updatedAt: string;
  monetizationScore: number;
  actorDir?: string;
  finalVerdict?: "PASS" | "FAIL";
  actorUrl?: string;
};

export type ActorReport = {
  id: string;
  actorId: string;
  type:
    | "actor-concept"
    | "actor-spec"
    | "github-ingest-report"
    | "license-review"
    | "pact-test-report"
    | "deploy-report"
    | "monetization-report"
    | "final-report";
  path: string;
  markdown: string;
  createdAt: string;
};

export type ActorLog = {
  id: string;
  actorId: string;
  level: "info" | "warn" | "error";
  message: string;
  createdAt: string;
};

export type FileDatabaseShape = {
  actors: ActorRecord[];
  actor_sources: unknown[];
  actor_reports: ActorReport[];
  actor_runs: unknown[];
  actor_tests: unknown[];
  actor_deployments: unknown[];
  actor_logs: ActorLog[];
  actor_monetization: unknown[];
};

export type CreateActorInput = {
  sourceType: SourceType;
  prompt: string;
  template: TemplateId;
  maxAttempts?: number;
  autoDeploy?: boolean;
};

export type PactResult = {
  passed: boolean;
  attempts: number;
  testsRun: string[];
  failures: string[];
  fixesApplied: string[];
  remainingRisks: string[];
  command: string;
};

export type QualityGateResult = {
  passed: boolean;
  items: { label: string; passed: boolean; details?: string }[];
};
