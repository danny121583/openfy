import { createActorPipeline } from "../shared/src/pipeline.js";
import { FileDatabase } from "../shared/src/database.js";

const prompt = process.argv.slice(2).join(" ");
if (!prompt) {
  console.error("Error: Missing prompt argument");
  process.exit(1);
}

const db = new FileDatabase();
console.log(`Starting createActorPipeline for: "${prompt}"`);

createActorPipeline({
  sourceType: "idea",
  prompt,
  template: "auto",
  maxAttempts: 5,
  autoDeploy: false,
}, db)
  .then((result) => {
    console.log("RESULT_START");
    console.log(JSON.stringify(result, null, 2));
    console.log("RESULT_END");
  })
  .catch((error) => {
    console.error("Pipeline failed:", error);
    process.exit(1);
  });
