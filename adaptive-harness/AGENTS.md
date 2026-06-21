# Adaptive Harness Operating Rules

You are working inside a project-agnostic adaptive harness. These rules are non-negotiable.

## Core Rules

1. **Always analyze the project before planning.** Never assume the stack, language, or framework. Run the project analyzer first.
2. **Never assume the stack.** Even if the directory looks like Node.js, verify via the project profile.
3. **Never assume Apify unless detected.** Apify support activates only when the analyzer detects Apify signals (.actor/, actor.json, Apify SDK).
4. **Never edit before inspecting.** Read the file first. Understand the context. Then propose changes.
5. **Prefer minimal patches.** The smallest change that fixes the problem is the best change.
6. **Always run verification when commands exist.** If the profile has build/test/lint commands, run them after any change.
7. **Always save a report.** Every run produces a timestamped report. No exceptions.
8. **Always update memory after success or failure.** Record lessons in the memory store.
9. **Never expose secrets.** Do not log, display, or include actual secret values in reports or output.
10. **Never auto-publish.** Publishing to any platform (Apify Store, npm, PyPI) requires explicit human approval.
11. **Never auto-change pricing.** Pricing changes on any platform require explicit human approval.
12. **Never auto-change production deployment configs.** Deployment configurations require explicit human approval.
13. **Never auto-change auth, payments, migrations, or security-sensitive files without explicit approval.** These files are in the never-auto-change list for a reason.
14. **If verification fails, trigger self-healing.** Classify the failure, propose a fix, and attempt remediation.
15. **If self-healing fails, write a clear report and stop.** Do not retry endlessly. One healing attempt, then report and await human guidance.

## Workflow Rules

- Always start with Phase 0: Project Analysis.
- Always end with a Report phase.
- Never skip safety gates.
- Never generate file edits without a subsequent verification phase.
- Respect the safety policy at `config/safety-policy.json`.

## Adapter Rules

- Use the highest-confidence adapter from the project profile.
- If confidence is below 0.3, use generic adapter.
- Apify adapter adds: schema validation, actor analysis, marketplace readiness.
- Apify safety: no auto-push, no auto-pricing, no secret changes, no storage deletion.

## Memory Rules

- Append, don't overwrite.
- Every lesson needs: timestamp, project root, adapter, summary, details.
- Deduplicate only during curation (memory-curator agent), not during writes.
- Never delete memory entries during a run.

## Reporting Rules

- Every report gets a timestamp: `YYYY-MM-DD-HHMM-<type>.md`
- Include all sections: task, date, profile, adapter, workflow, agents, skills, files, commands, verification, failures, fixes, safety gates, lessons, recommendations.
- Truncate command output to 5000 chars max.
- Never include secrets in reports.

## Agent & Skill Format Rules (agentskills.io)

- **All files under `agents/` and `skills/` must follow the agentskills.io standard.**
- Every agent/skill must be a **named subdirectory** containing a **`SKILL.md`** with **YAML frontmatter** (`name`, `description`).
- The `name` field must match the directory name exactly.
- **Never create flat `.md` files** directly inside `agents/` or `skills/` (e.g. `agents/planner.md` is forbidden — use `agents/planner/SKILL.md` instead).
- See the root `AGENTS.md` for full rules and anti-patterns.

