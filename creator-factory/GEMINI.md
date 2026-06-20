# Gemini & Antigravity IDE Development Guidelines

This document establishes the environment context, project constraints, and system specifications for AI agents pairing with developers in this project workspace.

---

## 1. Agent Skills Standard Format (agentskills.io)

All project skills in this project and the wider Antigravity IDE ecosystem must strictly conform to the `agentskills.io` standard format.

### Directory Structure
Each skill must reside in its own folder and have the following layout:
```
skill-name/
├── SKILL.md          # Required: YAML metadata + instructions
├── scripts/          # Optional: executable code (JS, Python, Bash)
├── references/       # Optional: documentation (e.g. REFERENCE.md, configurations)
├── assets/           # Optional: templates, assets, or static datasets
```

### `SKILL.md` File Layout
The `SKILL.md` file must contain YAML frontmatter, followed by Markdown instructions:
```markdown
---
name: skill-name
description: A clear, keyword-rich description (max 1024 chars) explaining what the skill does and when the agent should use it.
license: Apache-2.0 (optional)
metadata:
  author: OrbitAI (optional)
  version: "1.0" (optional)
---

# Skill Title

Instructions, step-by-step guidelines, edge cases, and usage examples.
```

### Naming Rules and Constraints
- The `name` in YAML frontmatter must match the parent directory name exactly.
- The `name` must be 1-64 characters, lowercase letters, numbers, and hyphens (`-`) only. It must not start or end with a hyphen, nor contain consecutive hyphens.
- Keep the `SKILL.md` file short (under 500 lines). Offload detailed references to `references/` or `assets/` and use relative links (e.g. `[reference](references/REFERENCE.md)`).

---

## 2. Apify Actor Development Standards

### Outcome-First Design ("Pilot Family" Naming Convention)
- Public Actor titles must end with "Pilot" followed by descriptive subtitle (e.g., `CrunchPilot — Crunchbase Lead Prospector & Company Enricher`).
- Slugs must be machine-friendly and stable (e.g., `crunch-pilot-crunchbase-enricher`).

### Detailed Documentation (No Monetization References)
- All user-facing documentation (`README.md`, `.actor/README.md`) must be highly detailed and professional.
- Absolutely **no monetization or pricing references** are permitted in user-facing documentation. The pricing is configured programmatically via API / Console.
- README must contain:
  1. A clear overview of the actor's capabilities and business outcomes.
  2. A step-by-step **"How It Works" workflow overview** detailing the sequential execution pipeline (e.g. searching engines, scraping profiles, crawling websites, and processing data).
  3. Input parameter description and example JSON input.
  4. Output dataset field tables (fields, types, description) and example JSON output.
  5. Integration guidelines (Node client, Python client, API, CLI).
  6. Legal & compliance disclaimer.

### Quality Gate and Verification
- Every actor must pass the schema audit check locally:
  ```bash
  APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema
  ```
- Running PACT tests locally is mandatory before pushing code.
- We must run the store synchronization script `npm run sync-store` to finalize details in the Apify Store (ensuring that exactly 3 categories are programmatically populated for maximum visibility), and the centralized icon gatherer `npx tsx scripts/gather-icons.ts` to sync the premium App Store style PNG icons.

### Premium True PNG Icon Standard
- All `.actor/icon.png` and `generated-icons/*.png` files must strictly follow the true PNG format rules:
  1. **Corner Transparency & Resolution**: Size must be exactly `1024x1024` in `RGBA` mode with a corner radius of `200` and fully transparent corners `(0, 0, 0, 0)`.
  2. **Anti-Aliasing (4x Supersampling)**: Transparency masks must be drawn at 4x scale (`4096x4096` with `radius=800`) and downsampled using `LANCZOS` interpolation to avoid jagged edges.
  3. **No Outer Borders, Frames, or Shadows**: Icons must focus entirely on the central logo composition (no outer frames, padding, or dark borders).
  4. **Symmetric Cropping with Offset**: Detect padding symmetrically from left/right edges. Apply `padding + 4px` offset crop to discard all border shadows and glows.

