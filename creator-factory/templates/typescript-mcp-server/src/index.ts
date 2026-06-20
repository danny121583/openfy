import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ApifyClient } from "apify-client";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Apify Client
const apifyToken = process.env.APIFY_TOKEN;
const client = new ApifyClient({ token: apifyToken });

const server = new Server(
  {
    name: "{{actor-slug}}-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// We load the schema from input_schema.json copied to the wrapper folder
let inputSchema: any = null;
try {
  // Supports both dev (src/index.ts) and prod (dist/index.js) paths
  const possiblePaths = [
    path.resolve(__dirname, "../input_schema.json"),
    path.resolve(__dirname, "../../input_schema.json")
  ];
  
  for (const p of possiblePaths) {
    try {
      const rawSchema = await fs.readFile(p, "utf8");
      inputSchema = JSON.parse(rawSchema);
      break;
    } catch {}
  }
} catch (error) {
  console.error("Failed to load input schema, using fallback tool definition:", error);
}

// Map input_schema properties
const toolProperties = inputSchema?.properties || {
  startUrls: {
    type: "array",
    description: "Array of start URLs to crawl/process.",
    items: { type: "object", properties: { url: { type: "string" } } }
  },
  maxItems: {
    type: "integer",
    description: "Max number of items to crawl/process",
    default: 10
  }
};

const requiredFields = inputSchema?.required || [];

const toolName = "run_{{actor-tool-name}}";
const toolDescription = inputSchema?.description || "Run {{actor-title}} to extract structured audit results from target websites.";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: toolName,
        description: toolDescription,
        inputSchema: {
          type: "object",
          properties: toolProperties,
          required: requiredFields,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== toolName) {
    throw new Error(`Tool not found: ${name}`);
  }

  if (!apifyToken) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Error: APIFY_TOKEN environment variable is not configured. Please set it in your environment or .env file.",
        },
      ],
    };
  }

  try {
    const actorId = "{{actor-slug}}";
    console.error(`Starting Apify Actor run for ${actorId} with arguments:`, JSON.stringify(args));
    
    const run = await client.actor(actorId).call(args || {});
    console.error(`Actor run succeeded: ${run.id}. Fetching dataset items...`);

    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(dataset.items, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Failed to run actor: ${error?.message || String(error)}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("{{actor-title}} MCP Server running on Stdio transport.");
}).catch((err) => {
  console.error("Failed to connect MCP server:", err);
  process.exit(1);
});
