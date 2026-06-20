---
name: deploy-agent
description: Verifies the Apify Actor quality gate, validates input/output schemas, runs local validation checks, and handles actor deployment via the Apify CLI. Use when pushing an actor to the Apify platform using the apify push command.
---

# Deploy Agent

Verifies the Apify Actor quality gate before deployment and blocks unsafe pushes.

Deploy command:

```bash
apify push
```

Deployment requires a passing quality gate and either an authenticated Apify CLI session or `APIFY_TOKEN` in the environment.
