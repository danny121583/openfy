---
name: repo-analyzer-skill
description: Clones a repository, builds a manifest of files, sizes, and basic metadata for auditing.
license: Apache-2.0
metadata:
  author: Danny
  version: "0.1"
---

# Repo Analyzer Skill

**Purpose**: Clone a Git repository into a temporary workspace and generate a detailed file manifest (paths, sizes, types). This manifest serves as the foundation for further quality checks.

## Inputs
- `repo_url` (string): HTTPS URL of the target repository.
- `target_dir` (string, optional): Path where the repo will be cloned. Defaults to a temporary directory under `/tmp`.

## Outputs
- `manifest` (array of objects): Each entry contains `path`, `size_bytes`, `is_directory`.
- `clone_path` (string): Absolute path to the cloned repository.

## When To Use
- Initial step of any repository quality audit.
- When a downstream skill needs to read file contents.

## When Not To Use
- For local repositories that are already checked out.

## Steps
1. Validate that `repo_url` is a reachable Git URL.
2. Create a temporary directory (`mktemp -d`).
3. Run `git clone --depth 1 <repo_url> <temp_dir>`.
4. Recursively walk the directory, collecting file metadata.
5. Return the manifest and clone path.

## Verification
- Ensure the `git clone` exit code is `0`.
- Verify the manifest contains at least one entry.

## Safety Rules
- Do not clone repositories larger than 500 MiB (abort with an error).
- Remove the temporary directory after the audit completes.
