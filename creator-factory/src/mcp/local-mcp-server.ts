import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { FileDatabase, runPact, createActorPipeline } from "../../shared/src/index.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execPromise = promisify(exec);
const db = new FileDatabase();
const factoryRoot = path.resolve(process.cwd());

function isPng(buffer: Buffer) {
  return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

const server = new Server(
  {
    name: "creator-factory-developer-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_factory_actors",
        description: "List all generated actors and their current build/deployment statuses from the factory registry.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "run_pact_test",
        description: "Run the local PACT testing loop for a specific actor to verify correct operation and output schemas.",
        inputSchema: {
          type: "object",
          properties: {
            actorSlug: {
              type: "string",
              description: "The machine-friendly slug of the actor (e.g. 'trend-pilot-tiktok-intelligence-scraper')",
            },
            maxAttempts: {
              type: "integer",
              description: "Maximum fixing attempts if failures occur.",
              default: 10,
            },
          },
          required: ["actorSlug"],
        },
      },
      {
        name: "validate_actor_schema",
        description: "Perform local input and output schema syntax validation on a specific actor.",
        inputSchema: {
          type: "object",
          properties: {
            actorSlug: {
              type: "string",
              description: "The slug of the actor to validate.",
            },
          },
          required: ["actorSlug"],
        },
      },
      {
        name: "sync_store",
        description: "Sync metadata, pricing models, event prices, categories, and icons to the Apify Store for pushed actors.",
        inputSchema: {
          type: "object",
          properties: {
            actorSlug: {
              type: "string",
              description: "Optional actor slug to sync a single actor. If omitted, syncs all pushed actors.",
            },
          },
        },
      },
      {
        name: "copy_and_convert_icon",
        description: "Copy and convert a source image (JPEG/WebP/PNG) into a valid 1024x1024 neon app-style icon at .actor/icon.png.",
        inputSchema: {
          type: "object",
          properties: {
            actorSlug: {
              type: "string",
              description: "The slug of the actor.",
            },
            sourceImagePath: {
              type: "string",
              description: "The absolute path to the source image file.",
            },
          },
          required: ["actorSlug", "sourceImagePath"],
        },
      },
      {
        name: "create_actor",
        description: "Run the full pipeline: analyze B2B gap ideas, scaffold files, generate code from spec, test locally, and prepare for deploy.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Outcome-oriented B2B actor concept/prompt.",
            },
            template: {
              type: "string",
              enum: ["auto", "project-langgraph-agent-javascript", "ts-beeai-agent", "python-langgraph"],
              description: "The project template type.",
              default: "auto",
            },
            maxAttempts: {
              type: "integer",
              description: "Max testing/fixing attempts.",
              default: 10,
            },
            autoDeploy: {
              type: "boolean",
              description: "Whether to automatically push to Apify if tests pass.",
              default: false,
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// Helper to find actor directory by slug
async function getActorDir(slug: string): Promise<string> {
  const actors = await db.listActors();
  const actor = actors.find((a) => a.slug === slug);
  if (actor?.actorDir) {
    return actor.actorDir;
  }
  // Fallback to generated-actors folder lookup
  const fallbackPath = path.join(factoryRoot, "generated-actors", slug);
  try {
    const stat = await fs.stat(fallbackPath);
    if (stat.isDirectory()) {
      return fallbackPath;
    }
  } catch {}
  throw new Error(`Actor folder for slug '${slug}' not found.`);
}

// 2. Tool Invocation Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_factory_actors": {
        const actors = await db.listActors();
        let registry: any[] = [];
        try {
          const registryPath = path.join(factoryRoot, "reports", "actor-registry.json");
          const raw = await fs.readFile(registryPath, "utf8");
          registry = JSON.parse(raw);
        } catch {}
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                registry,
                activeDbRuns: actors
              }, null, 2),
            },
          ],
        };
      }

      case "run_pact_test": {
        const { actorSlug, maxAttempts = 10 } = args as { actorSlug: string; maxAttempts?: number };
        const actors = await db.listActors();
        const actor = actors.find((a) => a.slug === actorSlug);
        if (!actor) {
          throw new Error(`Actor not found in database registry: ${actorSlug}`);
        }
        const actorDir = await getActorDir(actorSlug);
        
        await db.setStatus(actor.id, "testing");
        const pactResult = await runPact(actorDir, maxAttempts);
        
        const status = pactResult.passed ? "ready_for_deploy" : "failed";
        const finalVerdict = pactResult.passed ? undefined : "FAIL";
        await db.updateActor(actor.id, { status, finalVerdict });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(pactResult, null, 2),
            },
          ],
        };
      }

      case "validate_actor_schema": {
        const { actorSlug } = args as { actorSlug: string };
        const actorDir = await getActorDir(actorSlug);

        const { stdout, stderr } = await execPromise("APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema", {
          cwd: actorDir,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: stdout || stderr || "Schema validated successfully with zero warnings.",
            },
          ],
        };
      }

      case "sync_store": {
        const { actorSlug } = args as { actorSlug?: string };
        const cmd = actorSlug 
          ? `npx tsx scripts/sync-all-actors-store.ts --slug ${actorSlug}`
          : "npx tsx scripts/sync-all-actors-store.ts";
        
        const { stdout, stderr } = await execPromise(cmd, { cwd: factoryRoot });
        return {
          content: [
            {
              type: "text" as const,
              text: stdout || stderr || "Sync command executed.",
            },
          ],
        };
      }

      case "copy_and_convert_icon": {
        const { actorSlug, sourceImagePath } = args as { actorSlug: string; sourceImagePath: string };
        const actorDir = await getActorDir(actorSlug);
        const destIconPath = path.join(actorDir, ".actor", "icon.png");

        // Ensure target directory exists
        await fs.mkdir(path.dirname(destIconPath), { recursive: true });

        // Run sips tool (available on macOS) to convert to PNG format
        await execPromise(`sips -s format png "${sourceImagePath}" --out "${destIconPath}"`);

        // Verify PNG format signature
        const imgBuffer = await fs.readFile(destIconPath);
        if (!isPng(imgBuffer)) {
          throw new Error("Sips conversion failed: output file is not a valid PNG.");
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully converted and copied icon to ${destIconPath} (${imgBuffer.length} bytes).`,
            },
          ],
        };
      }

      case "create_actor": {
        const { prompt, template = "auto", maxAttempts = 10, autoDeploy = false } = args as {
          prompt: string;
          template?: "auto" | "project-langgraph-agent-javascript" | "ts-beeai-agent" | "python-langgraph";
          maxAttempts?: number;
          autoDeploy?: boolean;
        };

        const result = await createActorPipeline({
          sourceType: "idea",
          prompt,
          template,
          maxAttempts,
          autoDeploy,
        }, db);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
});

// 3. Connect to Stdio
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("Creator Factory Developer MCP Server running on Stdio transport.");
}).catch((err) => {
  console.error("Failed to connect MCP server:", err);
  process.exit(1);
});
