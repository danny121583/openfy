# Danny Actors Agentic Guidelines

This document establishes the architecture, folder layout, skill standards, and interactive run guidelines for custom actors under the `danny-actors/` workspace.

---

## 1. Directory Structure

Custom developer actors are stored under the `/danny-actors` root directory:

```
danny-actors/
├── AGENTS.md                                # This policy file
├── reports/                                 # Run reports and plans
└── [actor-slug]/                            # Specific Actor directory
    ├── .actor/
    │   ├── actor.json
    │   ├── input_schema.json
    │   ├── output_schema.json
    │   └── dataset_schema.json
    ├── src/
    │   └── main.js
    ├── package.json
    ├── Dockerfile
    ├── README.md
    └── CHANGELOG.md
```

---

## 2. Skill Standard (agentskills.io)

All custom agent skills in `danny-actors` must strictly conform to the `agentskills.io` standard:
1. **Directory Layout**:
   - `danny-actors/skills/[skill-name]/SKILL.md` (YAML frontmatter + instructions)
   - `danny-actors/skills/[skill-name]/scripts/` (utility scripts)
   - `danny-actors/skills/[skill-name]/references/` (documentation and details)
2. **Naming Convention**:
   - Lowercase, alphanumeric, hyphens only.
3. **Length constraint**: Keep `SKILL.md` short (under 500 lines) and offload complex code to `scripts/`.

---

## 3. Local Actor Run Guidelines (Interactive Prompting)

Whenever running actors locally in this workspace, the agent must adhere to the following:
1. **Interactive Prompting**: Do not execute runs silently with mock inputs. Prompt the user for input parameters (like a text-based Apify input form) if they are present.
2. **Project Codebase Study**: The target project must exist locally on the machine. The agent must read and study the actual codebase, package files, and documents of that project to understand what it does and know how to pitch it.
3. **Dynamic VC Discovery**: Do not rely on static lists. Auto-discover active VCs using search engines and current online trends.
4. **Agent LLM Capabilities**: For AI operations, use the agent's own LLM engine (Antigravity/Windsurf's model, or local API key fallback) so that the user does not have to provide external credentials or pay extra fees.
5. **Direct Notification**: If an email alert/outreach recipient is configured, the actor must attempt to send the compiled pitches directly (e.g. using local system `mail` utility or SMTP fallback).
