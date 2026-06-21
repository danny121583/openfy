---
name: pricing-estimator
description: Analyzes commercial feasibility and recommends store listing settings.
---

# Pricing Estimator Skill

## Purpose
Evaluates actor concepts for B2B monetization feasibility, scoring each on a scale of 0 to 100, and drafts pricing models (like Pay-Per-Event) for store listings.

## Inputs
- `slug` (string): The slug of the actor concept to evaluate.

## Outputs
- Score result (0-100) and generated `monetization-report.md` stored in the reports database directory.

## When To Use
- When planning packaging, pricing strategies, or SEO listing details for an actor concept before publishing.
- When performing financial viability reviews on the registry.

## When Not To Use
- When debugging local run scripts or writing spec guidelines.

## Steps
1. Parse inputs (`slug`).
2. Read the actor record and compile its B2B categorization metadata.
3. Call monetization analyst LLM endpoints to score the package.
4. Output scoring and the detailed markdown report structure.

## Verification
- Confirm that the generated score falls between 0 and 100.
- Verify that standard Pay-Per-Event start/result pricing levels are suggested.

## Safety Rules
- Avoid referencing specific commercial numbers or pricing guarantees in user-facing codebase docs.
- Do not store or process proprietary client invoicing credentials in local state.
