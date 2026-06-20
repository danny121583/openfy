import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { candidateIdeas, overflowIdeas } from "../src/main-agent/actorIdeaSelector.js";
import { OraclePilot } from "../src/main-agent/oraclePilot.js";
import { generatedActorsDir } from "../src/main-agent/config.js";
import { inputSchema, mainJs, packageJson } from "../src/main-agent/mainFlow.js";

async function run() {
  console.log("Starting OraclePilot Self-Learning Feedback Loop...");
  const oracle = new OraclePilot();
  await oracle.loadPreferences();

  const allIdeas = [...candidateIdeas(), ...overflowIdeas()];
  const ideasBySlug = new Map(allIdeas.map((idea) => [idea.slug, idea]));

  let folders: string[] = [];
  try {
    const entries = await readdir(generatedActorsDir, { withFileTypes: true });
    folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (err) {
    console.log("No generated-actors directory found.");
    return;
  }

  console.log(`Scanning ${folders.length} actor folders for manual edits...`);

  let rulesLearned = 0;

  for (const slug of folders) {
    const idea = ideasBySlug.get(slug);
    if (!idea) {
      console.log(`Skipping ${slug} (no preset ActorIdea found in selector)`);
      continue;
    }

    const actorDir = path.join(generatedActorsDir, slug);

    // File 1: input_schema.json
    try {
      const currentInputSchemaPath = path.join(actorDir, ".actor", "input_schema.json");
      const currentInputSchemaText = await readFile(currentInputSchemaPath, "utf8");
      
      const originalInputSchemaText = JSON.stringify(inputSchema(idea), null, 2);
      
      const learned = await oracle.learnFromUserEdits(
        slug,
        ".actor/input_schema.json",
        originalInputSchemaText,
        currentInputSchemaText
      );
      if (learned) {
        console.log(`[${slug}] Learned new rule from input_schema: "${learned}"`);
        rulesLearned++;
      }
    } catch (err) {
      // File or directory might be missing/modified, skip
    }

    // File 2: actor.json
    try {
      const currentActorJsonPath = path.join(actorDir, ".actor", "actor.json");
      const currentActorJsonText = await readFile(currentActorJsonPath, "utf8");
      
      const originalActorJsonText = JSON.stringify(
        {
          actorSpecification: 1,
          name: idea.slug,
          title: idea.actorName,
          description: idea.problemSolved.slice(0, 240),
          version: "0.1",
          buildTag: "latest",
          input: "./input_schema.json",
          output: "./output_schema.json",
          dockerfile: "../Dockerfile",
          dockerContextDir: ".."
        },
        null,
        2
      );
      
      const learned = await oracle.learnFromUserEdits(
        slug,
        ".actor/actor.json",
        originalActorJsonText,
        currentActorJsonText
      );
      if (learned) {
        console.log(`[${slug}] Learned new rule from actor.json: "${learned}"`);
        rulesLearned++;
      }
    } catch (err) {
      // Skip
    }

    // File 3: main.js
    try {
      const currentMainPath = path.join(actorDir, "main.js");
      const currentMainText = await readFile(currentMainPath, "utf8");
      
      const originalMainText = mainJs(idea);
      
      const learned = await oracle.learnFromUserEdits(
        slug,
        "main.js",
        originalMainText,
        currentMainText
      );
      if (learned) {
        console.log(`[${slug}] Learned new rule from main.js: "${learned}"`);
        rulesLearned++;
      }
    } catch (err) {
      // Skip
    }
  }

  console.log(`\nSelf-learning loop completed. Total new rules learned: ${rulesLearned}`);
}

run().catch((err) => {
  console.error("Self-learning execution error:", err);
  process.exit(1);
});
