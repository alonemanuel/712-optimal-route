# Skills — Reusable Workflows

This directory holds reusable Claude Code workflows for common development tasks.

## What Goes Here

**Repeatable workflows** — Step-by-step procedures for recurring tasks:
- Adding a new API endpoint (with tests, types, and validation)
- Setting up a new page in Next.js (with layout, metadata, and SSR)
- Running algorithm benchmarks (with profiling and reporting)
- Deploying to production (with verification steps)

**Project-specific patterns** — How we do things in *this* project:
- Code style preferences beyond what's in linters
- Commit message format
- PR description template
- Testing strategy (what level, what coverage, what mocking)

## Format

One file per workflow. Use verb-phrase filenames like:
- `add-api-endpoint.md` — How to add and test a new API route
- `add-map-layer.md` — How to add a new Google Maps layer
- `benchmark-algorithm.md` — How to profile and report on algorithm performance

Structure each skill as:

```markdown
# [Workflow Name]

**When to use:** [Triggering condition]

## Steps

1. Step one with specific commands/tools
2. Step two...

## Validation

How to verify the workflow succeeded.

## Common Issues

Problems that might come up and how to fix them.
```

## What NOT to include

- One-off tasks (use backlog instead)
- Domain knowledge (use knowledge/ instead)
- Architecture explanations (use docs/ instead)

## Currently Empty

This directory is empty at project start. Add workflows as patterns emerge.
