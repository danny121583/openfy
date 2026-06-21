---
name: gap-analyzer
description: Researches market niches and generates unique B2B Apify Actor concepts.
---

# Gap Analyzer Skill

## Purpose
Enables analyzing the Apify Store to find underserved market segments and drafting distinct, outcome-specific concepts mapped to high-conversion B2B demographics.

## Inputs
- `prompt` (string): Plain-English description or keyword describing the niche/feature.
- `sourceType` (string): The origin context (`idea`, `github`, `spec`).

## Outputs
- Structured JSON concept detailing the branded Pilot title, category tags, target demographics, and primary monetization angles.

## When To Use
- When planning new actors or determining which developer hooks/APIs have high monetization potential.
- When searching for gaps in the Apify Store listing directory.

## When Not To Use
- When detailing code implementation steps (use spec-writing skills instead) or validating code safety.

## Steps
1. Parse inputs (`prompt`, `sourceType`).
2. Run database/registry overlap checks to avoid duplicates.
3. Call standard LLM strategists to categorize the concept.
4. Output the concept JSON.

## Verification
- Confirm that the output title adheres to the premium "Pilot Family" naming format (e.g. `TrendPilot — TikTok Scraper`).
- Verify that exactly 3 appropriate store tags are identified.

## Safety Rules
- Do not design actors that violate trademarks or duplicate existing pushed factory actors.
- Never output sensitive target API secrets in target user specifications.
