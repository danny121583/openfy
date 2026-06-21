# Contributing to Openfy

Thank you for your interest in contributing to Openfy! This guide covers everything you need to know to submit a pull request, add new features, or fix bugs.

---

## Table of Contents

1. [How to Contribute](#1-how-to-contribute)
2. [Testing Before Submit](#2-testing-before-submit)
3. [Code Quality Standards](#3-code-quality-standards)
4. [Areas for Contribution](#4-areas-for-contribution)

---

## 1. How to Contribute

### Fork & Branch Workflow

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/openfy.git
cd openfy

# 2. Add the upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/openfy.git

# 3. Create a feature branch from main
git checkout -b feature/my-new-feature

# 4. Make your changes, then push
git push origin feature/my-new-feature

# 5. Open a Pull Request on GitHub
```

### Branch Naming Convention

| Type | Pattern | Example |
| --- | --- | --- |
| New feature | `feature/description` | `feature/add-python-template` |
| Bug fix | `fix/description` | `fix/schema-validation-crash` |
| Documentation | `docs/description` | `docs/add-migration-guide` |
| Refactor | `refactor/description` | `refactor/simplify-pact-runner` |
| Chore/tooling | `chore/description` | `chore/update-dependencies` |

### Commit Message Format

We follow **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — code change without new feature or fix
- `test` — adding or modifying tests
- `chore` — tooling, CI, build scripts

**Examples**:
```
feat(templates): add python-langgraph actor template
fix(pact): handle missing input schema gracefully
docs(readme): add supported platforms section
```

### Submitting a Pull Request

1. Ensure your branch is up to date with `upstream/main`
2. Fill out the PR template completely
3. Link any relevant GitHub Issues
4. Request a review from a maintainer
5. Wait for CI checks to pass before merging

---

## 2. Testing Before Submit

### Run the Test Suite

```bash
cd creator-factory
npm install
npm test            # Runs shared package unit tests
npm run typecheck   # TypeScript strict mode check across all workspaces
```

### Test the Main Agent Locally (Dry Run)

```bash
cd creator-factory
MAIN_AGENT_ACTORS_PER_RUN=1 npm run main-agent
```

This generates one actor end-to-end and verifies:
- Schema generation (`input_schema.json`, `output_schema.json`)
- PACT test loop (`npm install`, `npm run build`, `npm test`, `apify run`)
- Quality gate evaluation
- Report writing

### Validate Actor Schemas

```bash
cd creator-factory/generated-actors/<actor-slug>
APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema
```

### Cross-Platform Notes

- **macOS**: Full support, including the `sips`-based icon pipeline.
- **Windows**: Test with `npm test` only (icon pipeline requires ImageMagick — see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)).
- **Linux**: Full support when `imagemagick` is installed.

If you cannot test on all three platforms, note which platform(s) you tested in your PR description.

### New Dependencies Policy

Do **not** add new `npm` dependencies without prior discussion in a GitHub Issue. Open an issue first, describe the dependency and why it is needed, and wait for maintainer approval before submitting code that relies on it.

---

## 3. Code Quality Standards

### TypeScript Strict Mode

All code in `creator-factory/` must pass TypeScript strict mode:

```bash
npm run typecheck
```

Violations will block PR merges.

### No `any` Types

Avoid `any` types. If you genuinely need one (e.g., third-party library has no types), add a comment explaining why:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = JSON.parse(data) as any; // Apify SDK returns untyped JSON here
```

### JSDoc for Exported Functions

All exported functions must have a JSDoc comment:

```typescript
/**
 * Runs the full PACT test loop for a single actor.
 * Returns whether all tests passed and the list of failures encountered.
 */
export async function runPact(actor: ActorRunState): Promise<{ passed: boolean }> {
  // ...
}
```

### File Organization

- All new TypeScript source files belong in `creator-factory/src/`.
- Scripts (one-off runners, CLI entrypoints) belong in `creator-factory/scripts/`.
- Shared types belong in `creator-factory/shared/`.
- New actor templates belong in `creator-factory/templates/<template-name>/`.

---

## 4. Areas for Contribution

### New Actor Templates

Openfy supports multiple actor templates. To add a new one:

1. Create a directory under `creator-factory/templates/<template-name>/`
2. Add the required files: `package.json`, `tsconfig.json`, `Dockerfile`, `src/index.ts`, `README.md`
3. Register the template name in `creator-factory/src/main-agent/types.ts` under the `ActorTemplate` type
4. Update the `selectActorIdeas` logic in `actorIdeaSelector.ts` to assign the new template when appropriate
5. Add an integration test in `creator-factory/shared/`
6. Document the template in [CLI_REFERENCE.md](./creator-factory/CLI_REFERENCE.md)

### Documentation Improvements

Areas that need more documentation (see the [Audit Report](./AUDIT_REPORT_2026-06-21.md)):
- Real-world examples in [EXAMPLES.md](./EXAMPLES.md)
- Platform-specific troubleshooting in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Extension points for the MCP wrapper in [ARCHITECTURE.md](./ARCHITECTURE.md)

### Bug Fixes

Check open GitHub Issues labeled `bug`. When submitting a bug fix:
1. Reproduce the bug locally first
2. Write a test that fails before your fix
3. Apply the fix
4. Confirm the test passes

### Open Source Push Enhancements

The `open-source-push/` module handles secret sweeping and repo sanitization. Contribution areas:
- Improved secret detection regex patterns
- New audit rules (e.g., checking for hardcoded API keys in template files)
- Cross-platform path normalization improvements

---

## Questions?

Open a [GitHub Discussion](https://github.com/ORIGINAL_OWNER/openfy/discussions) or file an [Issue](https://github.com/ORIGINAL_OWNER/openfy/issues) with the `question` label.

All contributors are expected to follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
