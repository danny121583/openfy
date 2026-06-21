# Apify Actor Patterns

## Standard Actor Directory Structure
```
actor-slug/
├── .actor/
│   ├── actor.json
│   ├── input_schema.json
│   ├── output_schema.json
│   ├── icon.png
│   ├── README.md
│   └── CHANGELOG.md
├── src/
│   └── main.ts
├── test/
│   └── run-tests.js
├── reports/
│   ├── pact-test-report.md
│   ├── deploy-report.md
│   └── final-report.md
├── storage/
│   └── key_value_stores/
│       └── default/
│           └── INPUT.json
├── main.js
├── package.json
├── tsconfig.json
├── Dockerfile
├── README.md
├── CHANGELOG.md
├── SPEC.md
├── ACTOR.md
├── EXAMPLES.md
├── .actorignore
├── .env.example
└── .gitignore
```

## Naming Convention (Pilot Family)
- Display title: `BrandPilot — Descriptive Subtitle`
- Slug: `brand-pilot-descriptive-subtitle`
- Examples: `TrendPilot — TikTok Scraper & Creator Leads`, `CrunchPilot — Crunchbase Lead Prospector`

## Input Schema Patterns
- Always include `schemaVersion: 1`
- Every property must have an `editor` field:
  - `boolean` → `"editor": "checkbox"`
  - `integer` / `number` → `"editor": "number"`
  - `string` → `"editor": "textfield"`
  - `string` with `enum` → `"editor": "select"`
  - `array` (start URLs) → `"editor": "requestListSources"`
  - `array` / `object` (other) → `"editor": "json"`
  - proxy → `"editor": "proxy"`

## Output Schema Pattern
```json
{
  "$schema": "https://apify-projects.github.io/actor-json-schemas/output.json?v=0.3",
  "actorOutputSchemaVersion": 1,
  "title": "Actor Output Title",
  "description": "Description of output dataset.",
  "properties": {
    "results": {
      "type": "string",
      "title": "Results",
      "description": "Link to output dataset items.",
      "template": "{{links.apiDefaultDatasetUrl}}/items"
    }
  }
}
```

## Standard Main Entry Pattern
```javascript
import { Actor } from 'apify';

await Actor.init();
const input = await Actor.getInput() ?? {};
// ... process input ...
await Actor.pushData(results);
await Actor.exit();
```

## PPE (Pay-Per-Event) Pricing
- Start event: `apify-actor-start` at $0.10005
- Result event: `apify-default-dataset-item` at $0.10001 per item ($100.01 per 1,000)
- Platform usage: paid by platform (`isPPEPlatformUsagePaidByUser: false`)

## Deployment Commands
```bash
# Local validation
npm install && npm run build && npm test
APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema

# Push (requires approval)
apify push --force --wait-for-finish 300

# Verify remote
apify actors info USERNAME/ACTOR-NAME --readme | sed -n '1,24p'
```
