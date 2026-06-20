import { nanoid } from "nanoid";
import type { CreateActorInput } from "./types.js";
import { FileDatabase } from "./database.js";
import { buildActor, deployActor, makeConcept, makeMonetization, makeSpec, runPact, runQualityGate, templateForPrompt } from "./agents.js";
import { deployMarkdown, finalMarkdown, pactMarkdown, saveReport } from "./reports.js";
import { nowIso, sanitizeActorName } from "./utils.js";

export async function createActorPipeline(input: CreateActorInput, db = new FileDatabase()) {
  const selectedTemplate = templateForPrompt(input.template, input.prompt);
  const slug = sanitizeActorName(input.prompt);
  const actor = await db.upsertActor({
    id: nanoid(),
    name: slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    slug,
    sourceType: input.sourceType,
    sourceValue: input.prompt,
    template: selectedTemplate,
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    monetizationScore: 0
  });

  try {
    await db.setStatus(actor.id, "analyzing");
    const concept = makeConcept(input.prompt, input.sourceType);
    const conceptMd = `# Actor Concept\n\n## Concept\n${concept.title}\n\n## Type\n${concept.actorType}\n\n## Target Users\n${concept.targetUsers.map((user) => `- ${user}`).join("\n")}\n\n## Monetization Angle\n${concept.monetizationAngle}\n`;
    let reportPath = await saveReport(actor, "actor-concept.md", conceptMd);
    await db.addReport({ actorId: actor.id, type: "actor-concept", path: reportPath, markdown: conceptMd });

    const spec = makeSpec(input.prompt);
    const specMd = `# Actor Spec\n\n## Steps\n${spec.steps.map((step) => `- ${step}`).join("\n")}\n\n## Input Schema\n\`\`\`json\n${JSON.stringify(spec.inputSchema, null, 2)}\n\`\`\`\n\n## Output Schema\n\`\`\`json\n${JSON.stringify(spec.outputSchema, null, 2)}\n\`\`\`\n\n## Failure Cases\n${spec.failureCases.map((failure) => `- ${failure}`).join("\n")}\n\n## Retry Behavior\n${spec.retryBehavior}\n`;
    reportPath = await saveReport(actor, "actor-spec.md", specMd);
    await db.addReport({ actorId: actor.id, type: "actor-spec", path: reportPath, markdown: specMd });

    const monetization = makeMonetization(concept);
    reportPath = await saveReport(actor, "monetization-report.md", monetization.markdown);
    await db.addReport({ actorId: actor.id, type: "monetization-report", path: reportPath, markdown: monetization.markdown });

    await db.setStatus(actor.id, "building");
    const actorDir = await buildActor(actor, input.prompt, selectedTemplate);
    const built = await db.updateActor(actor.id, { actorDir, monetizationScore: monetization.score, template: selectedTemplate });

    await db.setStatus(actor.id, "testing");
    const pact = await runPact(actorDir, input.maxAttempts ?? 10);
    const pactMd = pactMarkdown(pact);
    reportPath = await saveReport(built, "pact-test-report.md", pactMd);
    await db.addReport({ actorId: actor.id, type: "pact-test-report", path: reportPath, markdown: pactMd });

    const gate = await runQualityGate(built, pact);
    const deploy = input.autoDeploy ? await deployActor(built, gate) : { pushed: false, actorUrl: "", message: "Manual approval required. Deployment not attempted." };
    const deployMd = deployMarkdown(built, gate, deploy);
    reportPath = await saveReport(built, "deploy-report.md", deployMd);
    await db.addReport({ actorId: actor.id, type: "deploy-report", path: reportPath, markdown: deployMd });

    const finalMd = finalMarkdown(built, pact, gate, deploy);
    reportPath = await saveReport(built, "final-report.md", finalMd);
    await db.addReport({ actorId: actor.id, type: "final-report", path: reportPath, markdown: finalMd });

    const finalVerdict = gate.passed && deploy.pushed ? "PASS" : "FAIL";
    const status = deploy.pushed ? "deployed" : gate.passed ? "ready_for_deploy" : "failed";
    return db.updateActor(actor.id, { status, finalVerdict, actorUrl: deploy.actorUrl });
  } catch (error) {
    await db.log(actor.id, "error", error instanceof Error ? error.message : String(error));
    await db.updateActor(actor.id, { status: "failed", finalVerdict: "FAIL" });
    throw error;
  }
}
