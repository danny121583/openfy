---
name: apify-deployer
description: Deploys and publishes Apify Actors to the platform.
---

# Apify Deployer Skill

## Purpose
Governs the verification of local build/testing constraints, schema compliance, and executing the secure upload of verified Actor codebases to the Apify platform.

## Inputs
- `slug` (string): The slug identifier of the actor to deploy.
- `autoDeploy` (boolean): Flag to bypass manual staging and push directly to Apify.

## Outputs
- Deployed actor status, public console URLs, or validation failure logs indicating quality gate deficiencies.

## When To Use
- Right before preparing a public commit, running a release, or publishing to the Apify Store.
- When validating if an actor package matches standard schemas and licensing guidelines.

## When Not To Use
- During local debugging/code editing cycles where changes are not finalized or PACT tests are still failing.

## Steps
1. Parse inputs (`slug`, `autoDeploy`).
2. Run standard file scan (`package.json`, `.actor/actor.json`, etc.).
3. Scan codebase for hardcoded secrets.
4. Run `apify validate-schema`.
5. Execute `apify push` under target credentials if the quality gate passes.

## Verification
- Run schema check validation command locally.
- Verify status outputs match console credentials.

## Safety Rules
- Strictly abort pushes if any quality gate check fails (e.g. missing files, hardcoded credentials).
- Never log raw `APIFY_TOKEN` or environment secret variables in logs.
