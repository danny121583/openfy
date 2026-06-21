---
name: Bug Report
about: Report a reproducible bug or unexpected behavior in Openfy
title: "[BUG] "
labels: bug
assignees: ''
---

## Bug Description

A clear, concise description of the bug.

## Steps to Reproduce

1. Navigate to `creator-factory/`
2. Run `npm run ...`
3. Observe the error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened. Paste error output or logs here:

```
paste error output here
```

## Environment

| Field | Value |
| --- | --- |
| Operating System | e.g. macOS 14.5 / Windows 11 / Ubuntu 22.04 |
| Node.js version | e.g. v20.14.0 (run `node --version`) |
| npm version | e.g. v10.7.0 (run `npm --version`) |
| Apify CLI version | e.g. v1.6.2 (run `apify --version`) |

## Relevant `.env` Configuration

> ⚠️ **Do NOT paste real tokens.** Replace values with `REDACTED`.

```
APIFY_TOKEN=REDACTED
OPENAI_API_KEY=REDACTED
# other variables you have set
```

## Relevant Logs or Screenshots

Paste any log output, console errors, or attach screenshots. To enable verbose output, try:

```bash
DEBUG=* npm run main-agent
```

## Additional Context

Any other context that might help diagnose the issue (e.g., which actor template was in use, which script was running).
