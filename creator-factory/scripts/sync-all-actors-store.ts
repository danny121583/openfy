import { readRegistry } from "../src/main-agent/reportWriter.js";
import { publishActorToStore } from "../src/main-agent/storePublication.js";
import { candidateIdeas, overflowIdeas } from "../src/main-agent/actorIdeaSelector.js";
import { generatedActorsDir } from "../src/main-agent/config.js";
import path from "node:path";

import { spawnSync } from "node:child_process";

async function sync() {
  const registry = await readRegistry();
  const allIdeas = [...candidateIdeas(), ...overflowIdeas()];
  const ideasBySlug = new Map(allIdeas.map((idea) => [idea.slug, idea]));

  console.log(`Syncing store listings for all pushed actors in the registry...`);

  let successCount = 0;
  let failCount = 0;

  for (const entry of registry) {
    if (entry.status !== "pushed" && entry.status !== "published") {
      console.log(`Skipping ${entry.slug} (status is ${entry.status})`);
      continue;
    }
    const idea = ideasBySlug.get(entry.slug);
    if (!idea) {
      console.warn(`No ActorIdea found in selector candidates/overflow for slug: ${entry.slug}`);
      continue;
    }

    console.log(`\n--- Syncing ${entry.actorName} (${entry.slug}) ---`);
    const actorState = {
      idea,
      status: "pushed",
      actorDir: path.join(generatedActorsDir, idea.slug),
      apifyActorUrl: entry.apifyActorUrl,
      pushed: true,
      errors: [],
      commands: []
    };

    try {
      const publication = await publishActorToStore(actorState);
      if (publication.passed) {
        console.log(`Successfully published ${entry.slug}: ${publication.message}`);
        successCount++;
        
        // Trigger automated task publishing
        console.log(`Triggering automated task publishing for ${entry.slug}...`);
        spawnSync("npx", ["tsx", "scripts/publish-tasks.ts", `--slug=${entry.slug}`], { stdio: "inherit" });
      } else {
        console.error(`Failed to publish ${entry.slug}: ${publication.message}`);
        failCount++;
      }
    } catch (err) {
      console.error(`Error syncing ${entry.slug}:`, err);
      failCount++;
    }
  }

  console.log(`\nSync finished: ${successCount} succeeded, ${failCount} failed.`);
}

sync().catch(console.error);
