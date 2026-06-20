export type TemplateName = "ts-beeai-agent" | "project-langgraph-agent-javascript" | "python-langgraph";

export type ActorStatus =
  | "selected"
  | "spec_created"
  | "project_created"
  | "implemented"
  | "testing"
  | "fixing"
  | "quality_gate"
  | "ready_for_push"
  | "pushing"
  | "pushed"
  | "ready_for_manual_push"
  | "failed";

export type StoreCategoryResearch = {
  category: string;
  url: string;
  status: "fetched" | "failed";
  actorMentions: string[];
  notes: string[];
  error?: string;
};

export type StoreResearch = {
  categories: StoreCategoryResearch[];
  crowdedAreas: string[];
  researchedAt: string;
};

export type GapAnalysis = {
  gaps: string[];
  avoid: string[];
  recommendedAngles: string[];
};

export type ActorIdea = {
  actorName: string;
  slug: string;
  problemSolved: string;
  targetUsers: string[];
  whyNotDuplicate: string;
  inputSchemaDraft: Record<string, unknown>;
  outputSchemaDraft: Record<string, unknown>;
  monetizationAngle: string;
  template: TemplateName;
  difficulty: "low" | "medium" | "high";
  expectedCategory: string;
  behavior: string;
};

export type ActorRunState = {
  idea: ActorIdea;
  status: ActorStatus;
  actorDir: string;
  apifyActorUrl: string;
  pushed: boolean;
  errors: string[];
  commands: CommandResult[];
};

export type CommandResult = {
  command: string;
  cwd: string;
  code: number | null;
  stdout: string;
  stderr: string;
};

export type RegistryEntry = {
  actorName: string;
  slug: string;
  createdAt: string;
  sourceRunId: string;
  status: "generated" | "tested" | "pushed" | "failed";
  apifyActorUrl: string;
  ideaSummary: string;
};

export type MainRunResult = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  research: StoreResearch;
  gaps: GapAnalysis;
  actors: ActorRunState[];
  finalVerdict: "PASS" | "PARTIAL" | "FAIL";
};
