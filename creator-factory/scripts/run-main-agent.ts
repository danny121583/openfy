import { runMainFlow } from "../src/main-agent/index.js";

runMainFlow()
  .then((result) => {
    console.log(JSON.stringify({ runId: result.runId, finalVerdict: result.finalVerdict }, null, 2));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
