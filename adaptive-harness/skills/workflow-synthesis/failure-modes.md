# Workflow Synthesis Failure Modes

## Ambiguous Goal
**Symptom**: Cannot determine intent from user goal.
**Recovery**: Default to full audit workflow. Note ambiguity in report.

## No Matching Skills
**Symptom**: Skill registry returns empty for the task.
**Recovery**: Use generic phases. Log gap in skill coverage.

## Missing Commands
**Symptom**: Project profile has no build/test/lint commands.
**Recovery**: Skip verification phases. Note in report.

## Circular Dependencies
**Symptom**: Phase ordering has circular dependencies.
**Recovery**: Flatten phases. Log ordering issue.
