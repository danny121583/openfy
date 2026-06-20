---
name: monetization-agent
description: Configures actor monetization details, including Pay-Per-Event (PPE) pricing, category mapping (populating exactly 3 categories), and store publication metadata via the Apify API. Use when publishing or syncing actor pricing and categories on the Apify Store.
---

# Monetization Agent

Produces target buyer, pricing, SEO, upsell, marketplace positioning, and related Actor recommendations.

Outputs:

- `reports/{actor-name}/monetization-report.md`

Implemented in `shared/src/agents.ts` as `makeMonetization`.
