#!/usr/bin/env bash
# Pushes to danny121583/openfy, bypassing the IDE's injected dummy GITHUB_TOKEN.
# Usage:
#   ./scripts/git-push-danny.sh              → pushes main branch
#   ./scripts/git-push-danny.sh --force      → force push
#   ./scripts/git-push-danny.sh my-branch    → push specific branch
set -e

# Unset the IDE-injected dummy token so the gh keyring credential helper takes over
unset GITHUB_TOKEN

# Ensure danny121583 is the active gh account
gh auth switch --user danny121583 --hostname github.com 2>/dev/null || true

# Push (pass through any extra args; defaults to main)
git push origin "${@:-main}"

echo "✅ Pushed to danny121583/openfy"
