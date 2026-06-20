# Apify AI Business Agent Actor Plan

## Executive Summary

The idea is viable and fits the current Apify direction, but it must be a standalone Apify Actor/product owned and configured by each Apify user. It should not be a hosted multi-tenant SaaS where users create tenant accounts under us. It should not access OrbitAI business records, restaurants, menus, POS data, customer data, staff data, private project files, or any other OrbitAI runtime state. Ask Orbit is useful as a UX/design reference only. Apify Actors should handle each user's own website assistant, background automation, site crawling, lead enrichment, monitoring, and niche workflows.

Recommended short product positioning:

**SiteAgent AI: Run a business AI agent from Apify.**

Alternative names:
- **OrbitAgent**: strong continuity with OrbitAI, but may feel tied to restaurants.
- **SiteAgent AI**: clearer for search and broader than Orbit.
- **BusinessAgent Runner**: descriptive, less brandable.
- **Website Knowledge Agent**: clear for Apify search, less broad.

My recommendation is **SiteAgent AI** for the standalone Apify Actor product. **Ask Orbit** should remain an OrbitAI-specific implementation and should not become the data source or runtime dependency for the standalone product.

## Current Evidence Reviewed

Read-only OrbitAI evidence:

- `/Users/danny/Desktop/orbitai/apps/pos/src/components/AskOrbitWidget.tsx`
- `/Users/danny/Desktop/orbitai/apps/pos/src/services/agentRouter.ts`
- `/Users/danny/Desktop/orbitai/apps/pos/src/services/pageAgentRegistry.ts`
- `/Users/danny/Desktop/orbitai/docs/audits/hermes-chat-backend-audit.md`
- `/Users/danny/Desktop/orbitai/docs/audits/hermes-chat-frontend-audit.md`
- `/Users/danny/Desktop/orbitai/docs/audits/hermes-chat-runtime-audit.md`
- `/Users/danny/Desktop/orbitai/docs/architecture/HERMES_BUSINESS_SDK.md`

Key finding: OrbitAI already has a useful UX reference. `AskOrbitWidget.tsx` is a floating assistant with route-aware context, quick prompts, voice playback, action confirmations, debug/audit log affordances, and active page-agent naming. `AgentRouter` has patterns worth copying conceptually: permission checks, deterministic local answers, RAG lookup, backend LLM fallback, audit logging, and approval-gated actions.

The missing piece is building a standalone Apify Actor flow where each Apify user configures their own Actor/Task, knowledge files, API keys, and run settings. Apify handles user identity, API-token access, pay-per-use monetization, runs, storage, and billing. No OrbitAI business data or private OrbitAI project files should be imported, queried, shared, or assumed.

## Locked Product Boundary

Ship the reusable agent logic, not OrbitAI's current business data.

What can be reused:

- The interaction pattern: chat, intent detection, clarifying questions, tool selection, action confirmation, answer summarization, and audit output.
- The conceptual policy model: only run allowed actions, ask before expensive or externally visible actions, and keep a record of tool calls.
- Generic prompt and routing ideas after rewriting them for the standalone Actor.
- Generic UI ideas from Ask Orbit if a UI is added later.

What must not be reused:

- OrbitAI restaurants, customers, staff, orders, menus, POS data, analytics, messages, CRM records, or business profiles.
- OrbitAI local files, private docs, private source code, owner notes, `.env` files, logs, config, keys, databases, or local storage.
- OrbitAI runtime services such as Hermes, POS APIs, `AgentRouter`, `pageAgentRegistry`, or site-specific endpoints.
- Any hidden owner-only context that would let external Apify users access OrbitAI private operations.

The standalone Actor should behave like a clean product installed by an Apify user. On first run, it should know nothing except its packaged generic logic and whatever that Apify user provides in Actor input, Apify storage, Apify secrets, public Apify Store metadata, or allowed public websites.

## Apify-Native Monetization Boundary

The product should rely on Apify's own platform mechanics:

- Apify users authenticate with their own Apify account/token.
- Apify Store handles paid usage through pay-per-use / pay-per-event Actor monetization.
- The Actor should not create separate customer accounts, tenant IDs, or agent IDs.
- The Actor backend should not require an HTML embed script to function, but the product should include an optional token-safe embeddable widget path.
- Website integration must not place Apify tokens or model-provider keys in browser code.
- Configuration should live in Actor input, Task settings, Apify secrets, datasets, and key-value stores owned by the Apify user.

## Standalone Boundary

This product must be independent from OrbitAI business operations and private OrbitAI owner files.

Rules:

- Do not give the Actor or widget access to OrbitAI restaurants, medical businesses, POS records, menus, staff, orders, analytics, localStorage keys, Hermes state databases, private plans, private docs, source files, local `.env` files, logs, or project configuration.
- Do not ship `AskOrbitWidget.tsx` directly as the public widget because it imports OrbitAI-specific services and context.
- Do not call OrbitAI `AgentRouter`, `pageAgentRegistry`, or POS runtime services from the standalone product.
- Do not make OrbitAI a shared backend for external users or integrations.
- Do not build a multi-tenant account system for this version.
- Each Apify user controls their own Actor/task configuration, uploaded documents, knowledge store, API keys, run settings, and outputs.
- Isolation comes from Apify user ownership and Apify storage boundaries, not from our own tenant table.
- Ask Orbit can inform the interaction model, but the standalone Actor must have its own Apify input schema, optional Standby API, Apify storage, and configuration flow.

## Product Definition

The product should sell this promise:

**Run an AI business agent on your own data through Apify.**

Apify user workflow:

1. Find the Actor in Apify Store.
2. Create a Task from the Actor or run it directly.
3. Choose an agent template in Actor input.
4. Add their own LLM API key through Apify secrets/input, or use a supported hosted/provider mode if we offer one later.
5. Upload or reference knowledge: PDFs, menus, FAQs, policies, service docs, product docs.
6. Crawl/sync their own website content.
7. Configure business info, tone, hours, escalation email/phone, lead capture fields, and allowed website origins.
8. Run the Actor through Apify Console, API, schedules, integrations, or Standby if enabled.
9. Apify charges usage through Apify's own pay-per-use / pay-per-event model.
10. Optional embeddable mode: users or the owner can add the widget through a safe proxy/Standby/API layer that keeps Apify and LLM keys server-side.
11. Background Actor runs keep that user's knowledge and lead data fresh.

Core chat workflow:

1. User describes what they want done in plain English.
2. The Actor classifies the intent: chat answer, website sync, document ingestion, lead capture, Apify Actor discovery, or Actor execution.
3. If the user asks for an automation, the Actor searches/matches public Apify Actor metadata and recommends the best Actor candidates.
4. The Actor explains what each candidate does, expected inputs, limitations, and available pricing model metadata such as free, usage-based, pay-per-result, or pay-per-event when available.
5. The Actor asks for missing required inputs from the selected Actor schema.
6. If execution is requested, the Actor runs the selected Actor using the Apify user's own token/context and records the run ID.
7. The Actor summarizes results and writes structured output to the user's dataset.

Pricing language must be conservative: report pricing from current Apify metadata when available, and otherwise tell the user to confirm on the Actor's Store page before running.

## Recommended Architecture

```text
Apify User
  -> Apify Console / API / Schedule / Integration / optional Standby
  -> User's Apify Actor run or Task
  -> Actor-owned config + storage
  -> Actor-owned RAG + business knowledge
  -> User-configured LLM provider
  -> Actor jobs for crawl/sync/enrichment
  -> Optional CRM/Webhook/Email integrations configured by that user
```

### 1. Optional UI Reference

Start from the concepts in `AskOrbitWidget.tsx`, but only as a UI reference. The embeddable widget should be standalone JavaScript that calls a token-safe proxy or authenticated Actor endpoint. It should not require `agent_id` or `tenant_id`; a public `siteKey` may identify local/demo config, but it must not be a secret.

- Floating launcher.
- Chat drawer or compact popover.
- Quick prompts.
- Typing/status states.
- Escalation/contact capture.
- Action confirmation cards.
- Theme configuration.
- Optional voice playback later.

Do not directly ship the current POS widget as-is. It is too Orbit/POS-specific: it depends on React Router, `getActiveConfig`, `pageAgentRegistry`, local POS storage, and session roles.

The website UI must not expose an Apify token in client-side code. The safe pattern is customer-owned proxy, owner demo proxy, or authenticated Apify endpoint, not a public script carrying credentials.

Implemented local demo path:

```text
localhost:8000 landing page
  -> embed/widget.js
  -> localhost:8787 demo proxy
  -> configured site knowledge + optional Gemini
  -> response back to widget
```

The browser sends `siteKey`, `sessionId`, visitor message, and small page context. The proxy validates allowed origins and keeps secrets server-side.

### 2. Actor Runtime

Build the Actor so each Apify user owns their own runtime configuration and data.

The Actor should own:

- Input schema for agent template and business profile.
- Run configuration and optional UI settings.
- Allowed URLs/domains for crawl and sync.
- Knowledge ingestion.
- RAG index/storage.
- Chat action for normal Actor runs.
- Optional Standby chat endpoint for advanced API use.
- Optional embeddable widget assets and token-safe proxy template.
- Lead capture action/output.
- Escalation settings.
- Crawl/sync jobs.
- Dataset output for leads and conversations.
- Key-value store records for configuration and knowledge metadata.
- Optional integration settings provided by the Apify user.

Minimum Actor surface:

```text
Standard Actor run input:
  action: chat | sync-site | ingest-documents | extract-leads | find-actor | run-actor | export-config
  businessProfile
  knowledgeSources
  question
  llmProviderConfig
  actorSearchQuery
  selectedActorId
  selectedActorInput
  outputMode

Optional Standby endpoints:
  POST /chat
  POST /sync-site
  POST /find-actor
  POST /run-actor
  GET  /health
```

### 3. RAG Layer

The RAG layer should support:

- PDFs.
- Website crawl snapshots.
- Menu/product/service pages.
- FAQs.
- Policy docs.
- Business profile.
- Conversation-level memory.
- Per-Apify-user or per-Task storage isolation.

Start simple:

- Store files in object storage.
- Extract text server-side.
- Chunk by headings/pages.
- Store embeddings/chunks under that Actor run/task/user storage context.
- Retrieve top chunks for each chat.

Required guardrail: every answer should know whether it is grounded in business documents, website content, or general model knowledge. For business factual claims, prefer grounded answers with citations or source labels.

### 4. Apify Actor Layer

Apify is the product runtime, storage layer, API access layer, and monetization layer. Normal Actor runs should be the MVP. Standby mode can be added later only if real-time API behavior is worth the extra cost/complexity.

Use Apify Actors for:

- Website crawling and content sync.
- Sitemap discovery.
- Lead enrichment.
- Competitor monitoring.
- Review/reputation checks.
- Local business audits.
- Scheduled page change monitoring.
- Product/menu extraction.
- Marketplace add-on agents.

The Actor should use Apify storage and runs owned by the Apify user:

```text
Actor endpoint or scheduled Task
  -> Actor crawl/sync run
  -> Dataset output
  -> Normalize result
  -> Store in Apify dataset / key-value store / optional external vector store configured by user
```

Never put Apify tokens or LLM provider keys in browser code. Any website-facing integration should use a customer-owned server-side proxy, owner demo proxy, or another safe Apify integration pattern.

### 5. Marketplace

The marketplace should sell templates and automation packs:

- Restaurant website assistant.
- Dental clinic assistant.
- Local service quote assistant.
- Ecommerce product support assistant.
- Real estate lead assistant.
- SaaS documentation assistant.
- Agency prospecting assistant.
- Review response assistant.

Each marketplace item can combine standalone resources for the Apify user's own Actor/Task:

- Prompt/persona.
- RAG schema.
- Business settings form.
- Apify Actor automations.
- Lead capture form.
- Escalation workflow.

## Security Requirements

These are non-negotiable:

- No customer LLM keys in browser code.
- No Apify tokens or LLM provider keys in browser code.
- Store API keys only in Apify secrets or Actor/task input fields marked secret.
- If optional Standby/API access is enabled, scope it to the specific Actor/Task and allowed origins.
- Rate limit by Actor/Task, origin, IP, and session when using Standby/API access.
- Validate allowed origins for any optional website-facing integration.
- Store chat transcripts in the Apify user's Actor storage/datasets with retention guidance.
- Separate setup/admin actions from chat/lead/sync actions.
- Approval-gate any action that changes a site, sends email, triggers billing, or exports data.
- Log tool calls and Actor runs.
- Provide abuse protection for public chat endpoints.

## How OrbitAI Maps Into This

`AskOrbitWidget.tsx` should become the design reference, not the production embed bundle and not the runtime integration point.

Portable ideas to reuse:

- Floating launcher and drawer interaction.
- Status text for handoffs.
- Quick prompts.
- Action confirmation/cancel pattern.
- Audit log concept.
- Route/context-aware greeting.
- Voice playback as premium feature.

Orbit-specific parts that must not be present in the standalone Actor or any optional UI:

- `useLocation`.
- POS session roles.
- `getActiveConfig`.
- POS local storage data reads.
- Direct `AgentRouter` import.
- Page agent registry coupling.
- Kokoro TTS endpoint assumptions.
- Any access to OrbitAI businesses, Hermes state, private OrbitAI files, or owner-only local project data.

`AgentRouter` should inspire the standalone Actor policy engine, but should not be imported directly:

- Permission checks become per-Apify-user run/input policy checks.
- `runVectorSearch` becomes Actor/task-scoped RAG retrieval.
- `callGeminiFallback` becomes provider-router LLM call.
- `logInteraction` becomes Actor dataset audit output.
- `executeAction` becomes approval-gated Actor actions when needed.

## MVP Scope

Build the first monetizable version as one Apify Store Actor:

**Website AI Business Agent**

Target Apify users:

- Business owners using Apify.
- Agencies using their own Apify account for client work.
- Restaurants, dental offices, med spas, home services, and ecommerce operators.
- Builders who want an AI agent run/API workflow without creating a separate SaaS account.

MVP features:

- Actor input schema for setup.
- Actions: `chat`, `sync-site`, `ingest-documents`, `extract-leads`, `export-config`.
- Configure business name, services, hours, tone, escalation email.
- Accept PDFs/FAQs/menus by URL or Apify key-value store reference.
- Crawl the user's own website.
- RAG answers grounded in that user's provided/crawled content.
- Lead capture into Apify dataset.
- Conversation output into Apify dataset.
- Optional email/webhook escalation if configured by the user.
- BYOK OpenAI/Anthropic/Gemini provider via Apify secret input.
- PPE monetization through Apify for chat answers, sync jobs, document chunks, or qualified leads.

Do not start with:

- Our own account system.
- Our own tenant dashboard.
- Agent IDs or tenant IDs.
- Client-side Apify tokens.
- Full marketplace.
- White label custom domains.
- Complex voice.
- Live site editing.
- Multi-agent swarms in the widget.

## Implementation Phases

### Phase 0: Product Naming and Boundaries

Decide product name and boundary:

- Standalone Apify Actor product: SiteAgent AI or Website AI Business Agent.
- OrbitAI implementation: Ask Orbit.
- Apify Creator Factory remains the Actor production engine.
- No multi-tenant SaaS.
- No public credential-bearing widget.
- Embeddable widget is allowed only through a token-safe proxy or authenticated server-side path.

Deliverables:

- Product one-liner.
- Store positioning.
- PPE pricing hypothesis.
- First vertical template.
- Security policy for keys/tokens.

### Phase 1: Build Actor Contract

Create the Apify Actor contract first.

Deliverables:

- `.actor/input_schema.json`.
- `.actor/output_schema.json`.
- `.actor/actor.json`.
- README with run examples.
- Example inputs for chat, sync, ingest, and lead extraction.
- Dataset schema for answers, leads, conversations, and sync results.
- PPE events.

Acceptance criteria:

- Can run from Apify Console.
- Can run from Apify API with the Apify user's own token.
- Does not require OrbitAI, React Router, POS storage, or owner-private files.
- No secrets appear in output, logs, README, or client-side code.

### Phase 2: Build Actor Runtime

Create the Actor runtime for actions and storage.

Deliverables:

- Action router.
- Config loader from input/default key-value store.
- Provider router for BYOK LLM calls.
- RAG retrieval.
- Website crawler/sync.
- Dataset writers.
- Optional Standby `/chat` and `/health` endpoints.

Acceptance criteria:

- One Apify user can configure and run one Actor/Task instance.
- Actor routes requests to the user's configured model.
- Actor stores results in that user's Apify storage.
- Optional Standby works only with authenticated Apify access.

### Phase 3: RAG Ingestion

Add business knowledge ingestion scoped to the Apify user's Actor storage.

Deliverables:

- File upload.
- Text extraction.
- Chunking.
- Embeddings.
- Actor/task-scoped retrieval.
- Website crawl job.
- Source-aware answers.

Acceptance criteria:

- Upload a menu/FAQ PDF and answer from it.
- Crawl a site and answer from crawled pages.
- Chat response shows which source type was used.
- No data crosses Apify user/task boundaries.

### Phase 4: Background Automations

Use the Actor and optional companion Actors for background jobs owned by the Apify user.

Deliverables:

- Scheduled crawl sync.
- First automation pack: website content crawler.
- Second automation pack: lead capture/enrichment.

Acceptance criteria:

- User triggers or schedules sync from Apify.
- Actor crawls only configured user-owned/allowed URLs.
- Results are imported into that Actor's knowledge store.
- Answers improve from synced content.

### Phase 5: Store Monetization

Implement money flow through Apify Store, not our own billing system.

Recommended PPE events:

- `chat-answer`
- `document-ingested`
- `website-page-synced`
- `qualified-lead`
- `export-generated`

Acceptance criteria:

- Actor has PPE events defined.
- README explains likely cost drivers.
- Output schema exposes leads, conversations, and sync results.
- No customer billing system required outside Apify.

### Phase 6: Marketplace

Add template/install mechanics.

Deliverables:

- Agent templates.
- Actor automation packs.
- Niche setup wizards.
- Reviews/usage analytics later.

Acceptance criteria:

- User can choose "Restaurant Assistant" from Actor input.
- User can choose "Dental Assistant" from Actor input.
- Template provisions prompt, settings schema, RAG defaults, and sync behavior without creating a tenant account.

## Actor Storage Model Sketch

```text
Key-value store:
  CONFIG.json
    business_info, agent_template, tone, escalation, allowed_urls

  KNOWLEDGE_INDEX.json
    documents, chunks, source metadata, embedding references

Dataset: answers
  action, question, answer, source_refs, created_at

Dataset: conversations
  session_id, role, content, source_refs, created_at

Dataset: leads
  name, email, phone, question, summary, status, created_at

Dataset: sync_jobs
  source_url, status, pages_crawled, chunks_created, errors, created_at

Optional external vector store:
  Only if the Apify user configures it explicitly.
```

## Major Risks

1. **Trying to reuse OrbitAI widget directly**
   - Risk: it ships POS-specific dependencies into public websites.
   - Fix: extract concepts, not imports.

2. **Client-side secrets**
   - Risk: customer keys or Apify tokens leak.
   - Fix: Apify secret input fields only; no public browser token path in MVP.

3. **Unbounded public chat cost**
   - Risk: bots drain the Apify user's model/API spend if a public widget is added later.
   - Fix: do not make public widget the MVP; if added, require customer-owned server-side proxy and rate limits.

4. **Weak RAG quality**
   - Risk: assistant hallucinates business facts.
   - Fix: source-aware retrieval, refusal when missing info, owner-editable business profile.

5. **Too many verticals too early**
   - Risk: slow build and unclear market.
   - Fix: start with local business assistant and a few Actor input templates.

6. **Standby cost/latency surprises**
   - Risk: users misunderstand Standby idle and usage costs.
   - Fix: document normal run vs Standby mode and make normal Actor runs the MVP.

## Recommended Next Build Step

Create one Apify Actor with three thin vertical slices:

1. **Chat slice**
   - `action: chat`
   - business profile input
   - one question input
   - answer dataset output

2. **Knowledge slice**
   - Manual business profile.
   - One uploaded text/PDF file or file URL.
   - Simple retrieval.

3. **Apify slice**
   - Crawl one website URL.
   - Import results into knowledge.

Once those work end-to-end, add PPE monetization and templates.

## Decision Needed

Before implementation, decide:

- Product name: `SiteAgent AI`, `OrbitAgent`, or another name.
- First customer vertical: restaurant, dental, home services, or agency.
- Runtime stack: Node Actor or Python Actor.
- RAG storage choice: Apify-only lightweight retrieval first, or optional external vector store.
- PPE event model.
- Whether the Store Actor is BYOK only or later supports hosted/provider modes.

My technical recommendation: build a single standalone Apify Actor first. Reuse OrbitAI/Ask Orbit only as design inspiration, not as a backend, file source, tenant system, or runtime dependency.
