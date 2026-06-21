# The Layered Agentic Stack

In agentic software development, the structure of an AI system shifts from simple "text generation" to active "action execution." In tools like [Cursor](https://cursor.com/) and similar environments, the agentic architecture relies on a clear, layered stack consisting of the **Agent Core**, **Skills**, and **MCP Connectors**.

---

## 1. The Core Agentic Architecture

At the top level sits the **Host/Agent Loop** (e.g., Cursor's Composer or Agent mode, or Factory's autonomous loops). It doesn't just predict the next token; it operates on a continuous, autonomous loop:

```
[ User Prompt ] ──> [ Reasoning Engine ] ──> [ Tools Discovery ]
                            ▲                       │
                            │                       ▼
                    [ State Evaluator ] <─── [ Tool Execution (MCP) ]
```

* **Reasoning Engine:** Powered by frontier long-context or reasoning models, the engine decides *how* to approach a problem. Instead of outputting code immediately, it generates a task plan.
* **The Autonomy Slider:** Modern architectures allow you to control the level of independence given to the agent. It can range from low autonomy (inline `Cmd+K` tab completion) to high autonomy (**Cursor Agent mode** or **Factory Autonomy mode**), where the agent operates asynchronously, running parallel sub-agents to solve complex tasks.

---

## 2. Agent Skills (The Domain Knowledge)

While an agent has access to raw tools, it often lacks the strategic expertise to use them safely or efficiently. **Agent Skills** bridge that gap. They are pre-packaged plugins or modules containing **specialized domain knowledge, guardrails, and guided workflows**.

* **What they do:** Skills tell the agent *how* to reason about a platform. For example, a Confluent Kafka Skill teaches the agent streaming best practices, while a DataRobot Skill teaches it how to execute feature engineering and model training cleanly.
* **Why they matter:** Without skills, an LLM might attempt to brute-force a problem with generic Python code. With skills, the agent adopts platform-specific frameworks and structural rules (like `cursorrules` or `factoryrules`) instantly, preventing hallucinations and breaking the task into logical, predictable chunks.

---

## 3. MCP Connectors (The "USB" Interface for AI)

The **Model Context Protocol (MCP)**, originally introduced by Anthropic, is an open standard built on JSON-RPC 2.0. It solves the "$M \times N$ problem"—the inefficiency of writing unique API wrappers for every combination of AI model ($M$) and development tool ($SaaS/DBs$).

MCP treats tools like hardware peripherals. The IDE acts as the **MCP Host**, and external systems run as **MCP Servers**.

### How MCP Connectors Bridge the Gap

An MCP connector exposes three main primitives to the AI agent:

1. **Tools:** Executable functions the agent can invoke (e.g., `run_sql_query`, `create_linear_ticket`, `trigger_github_pr`, `run_pact_test`).
2. **Resources:** Static or dynamic data files the agent can read for context (e.g., database schemas, API logs, local filesystem paths).
3. **Prompts:** Pre-defined templates provided by the server to help the user guide the agent effectively.

### Real-World Execution Types

When you plug an MCP server into your local environment (configured via `.cursor/mcp.json` or `.factory/mcp.json`), the connection typically operates through two transport mechanisms:

* **`stdio` (Standard Input/Output):** The MCP server runs locally as a child process on your computer. Factory talks to it over command-line streams. This is common for local databases, local filesystems, or CLI tools.
* **Streamable HTTP/SSE:** The server runs independently on a remote host or cloud container, communicating via web protocols. This is ideal for team environments or secure corporate platforms.

---

## Mapping the Entire Agentic Stack

| Layer | Component | What it Handles | Examples |
| --- | --- | --- | --- |
| **Cognition** | Coding Agent / Host | Orchestration, parallel task planning, and user review loops. | Cursor Agent, Composer, Claude Code, Factory Core |
| **Expertise** | Agent Skills | Guardrails, best practices, framework rules, and logical flow. | `.cursorrules`, `.factoryrules`, DataRobot Skills, Confluent Agent Skills |
| **Connection** | MCP Connectors | Standardized API schemas, tool-calling definitions, and execution layers. | PostgreSQL MCP, GitHub/Linear MCP, Slack MCP, Local Factory MCP |
| **Infrastructure** | Target Environment | The actual systems being queried, modified, or deployed to. | Your database, local directory, cloud environment (Vercel, Apify) |

**The Resulting Workflow:** Instead of copying and pasting code snippets, logs, and database definitions back and forth, you prompt the agent: *"Fix the broken data pipeline and alert the team."* The **Agent** creates a plan; uses its **Skills** to know how data schemas should format; invokes the PostgreSQL and Slack **MCP Connectors** to query the live DB and post the notification; and executes the entire cycle natively from your workspace.
