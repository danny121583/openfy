# Vercel Integration Report: Hosting MCP Servers & Serverless Agent Workflows

This report details the architectural design and deployment models for hosting **Model Context Protocol (MCP) servers** and **serverless AI agents** on the **Vercel** platform. It provides a blueprint for expanding the Apify Creator Factory to support Vercel-native serverless deployments.

---

## 1. Executive Summary

Vercel is the industry standard for frontends and serverless functions. By integrating Vercel hosting into our Creator Factory, we can:
1.  **Expose Hosted MCP Toolkits**: Build and host our "Pilot Family" tools as serverless, API-key secured SSE endpoints.
2.  **Enable "One-Click" SaaS Deployments**: Allow users of our platform to deploy their customized MCP servers directly to their personal Vercel accounts via OAuth.
3.  **Optimize AI Costs & Resilience**: Route LLM calls through Vercel AI Gateway for unified request caching, logging, and automated retry handling.

---

## 2. Serverless MCP Architecture: Stdio vs. SSE

Standard MCP servers communicate using **JSON-RPC over Standard I/O (Stdio)**, which requires a persistent node process. This is incompatible with serverless environments (like Vercel Lambdas or Edge Functions) that spin down after a request.

To host MCP servers on Vercel, we must transition to the **Server-Sent Events (SSE)** transport protocol:

```
[Cursor/Claude Desktop Client] ─── (GET /api/mcp/sse) ───► [Vercel Serverless Endpoint]
                                                           │ (Opens SSE connection)
                                                           ▼
[Client sends tool calls] ─────── (POST /api/mcp/msg) ───► [Handler executes tool]
                                                           │ (Pipes result to SSE)
                                                           ▼
[Result text streams back] ◄────── (SSE Stream) ───────────┘
```

### 2.1 Next.js Route Handler Implementation
Using `@vercel/mcp-adapter` or standard Next.js Route Handlers, we can define our MCP server endpoints:

**SSE Handshake Route (`/api/mcp/sse/route.ts`):**
```typescript
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { NextRequest, NextResponse } from "next/server";

const mcpServer = new Server({ name: "pilot-family-server", version: "1.0.0" }, { capabilities: { tools: {} } });

// Register tools
mcpServer.tool("audit_site", ...);

export async function GET(request: NextRequest) {
  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const transport = new SSEServerTransport("/api/mcp/message");
  
  // Establish connection in the background
  const stream = new ReadableStream({
    async start(controller) {
      transport.send = (message) => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      };
      await mcpServer.connect(transport);
    }
  });

  return new NextResponse(stream, { headers: responseHeaders });
}
```

**Message Route (`/api/mcp/message/route.ts`):**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Route JSON-RPC message to the active transport session
  await activeTransport.handleMessage(body);
  return NextResponse.json({ ok: true });
}
```

---

## 3. Multi-Tenant Deployment Strategy (SaaS OAuth)

To allow the Creator Factory to deploy generated servers directly to the user's Vercel account, we implement the **Vercel OAuth 2.0 flow**:

```
[User App] ─── (Connect Vercel) ───► [Vercel OAuth Grant] ───► [Receive Access Token]
                                                                      │
[Push code files as JSON payload] ◄─── [Call Vercel Deploy API] ◄─────┘
```

### 3.1 Direct Deployment API Flow
We can deploy projects programmatically without Git using the Vercel Deployments API (`POST /v13/deployments`):
*   **Request Payload**: Includes the project name, target environment variables, and the raw text files as a file tree map:
    ```json
    {
      "name": "site-pilot-mcp",
      "files": [
        { "file": "package.json", "data": "{...}" },
        { "file": "src/index.ts", "data": "...code..." }
      ],
      "projectSettings": {
        "framework": "nextjs"
      }
    }
    ```
*   **Authentication**: Passed as `Authorization: Bearer <user_oauth_token>`.
*   **Benefit**: Gives our web dashboard a "Deploy to Vercel" button that executes in under 15 seconds.

---

## 4. Vercel AI Platform Integrations

Integrating Vercel’s platform features will significantly lower our operating costs and raise pipeline reliability:

### 4.1 Vercel AI Gateway (LLM Optimization)
Instead of calling OpenAI or Gemini endpoints directly, we wrap our LLM requests through the AI Gateway.
*   **Caching**: If the Main Agent selection runs or PACT fixing cycles ask the same questions repeatedly, AI Gateway serves the cached response instantly, reducing OpenAI/Claude token costs to $0.
*   **Retries & Rate Limits**: AI Gateway automatically performs exponential backoffs if we trigger a rate limit, preventing pipeline failures.

### 4.2 Vercel Workflow (Durable Execution)
By shifting our `runActorFlow` pipeline to Vercel Workflows:
*   We get durably preserved state-machines for every run.
*   The system can pause for a day (e.g. waiting for the Apify Store rate limit to reset) and resume automatically without keeping an active server container running, saving execution resources.

---

## 5. Implementation Roadmap

1.  **Add Next.js MCP SSE Template**:
    Create `/creator-factory/templates/nextjs-mcp-sse` containing the serverless SSE API routes.
2.  **Add `deploy_to_vercel` MCP Tool**:
    Update `local-mcp-server.ts` to include a deployment tool that takes a Vercel project token and pushes the code programmatically.
3.  **Vercel AI Gateway Proxy Configuration**:
    Add an optional `AI_GATEWAY_URL` to `.env` to transparently route all `oraclePilot` requests.
