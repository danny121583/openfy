---
name: pact-test-agent
description: Runs local PACT (Post-Activation Compatibility Testing) verification loops using the apify run command and parses execution logs to perform self-healing code iterations. Use when testing local actor compatibility and fixing run-time errors.
---

# PACT Test Agent

Runs the Plan, Act, Check, Tune loop up to `maxAttempts`.

Required command:

```bash
apify run
```

If Apify CLI is missing, the local smoke test may run, but the PACT verdict remains `FAIL` because the required Apify local run was not verified.
