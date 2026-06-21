# Repo Analysis Failure Modes

## Empty Repository
**Symptom**: No files detected.
**Cause**: Repository is empty or path is incorrect.
**Recovery**: Verify the root path. Return an "unknown" profile with empty fields.

## Permission Denied
**Symptom**: Cannot read directory or files.
**Cause**: Insufficient filesystem permissions.
**Recovery**: Log warning, skip inaccessible paths, continue with available data.

## Enormous Repository
**Symptom**: Scanning takes too long or runs out of memory.
**Cause**: Deep tree with millions of files.
**Recovery**: Enforce depth limit. Skip large directories (node_modules, etc.).

## Ambiguous Project Type
**Symptom**: Multiple adapter signals with similar confidence.
**Cause**: Monorepo containing multiple project types.
**Recovery**: Use highest-confidence adapter. Report ambiguity in profile.

## Corrupt Package Manifest
**Symptom**: package.json or pyproject.toml fails to parse.
**Cause**: Invalid JSON/TOML syntax.
**Recovery**: Log the parse error. Skip framework/command detection for that manifest.
