# 712 Optimal Route

A data-driven tool to optimize bus 712's Tel Aviv stops based on rider address data, for a proposal to the Modi'in mayor.

## Project Structure

```
.claude/
  CLAUDE.md             # Project instructions (this file, loaded every session)
  settings.json         # Permissions and configuration
  rules/                # Auto-loaded rule files (*.md)
  skills/               # Reusable workflows and knowledge
  prd/                  # Product requirement documents (versioned)
  knowledge/            # Domain knowledge and research
  history/              # Session summaries and decision log
  stack/                # Tech stack choices and rationale
```

## Working Style

- **Ask questions before assuming.** When unsure about a design choice, implementation approach, or requirement, use the AskUserQuestion tool to present options and get input. Don't guess — collaborate.
- **Present options, not monologues.** When there are multiple valid approaches, lay them out concisely with trade-offs and let the user choose.
- **Be proactive about gaps.** If something in the PRD is ambiguous or a technical decision hasn't been made yet, raise it.
- **Don't over-explain.** Be concise. The user is technical and prefers short, direct communication.

## Session Start

At the beginning of every session:
1. Read the **current PRD** (highest version in `.claude/prd/`)
2. Read **`.claude/backlog.md`** to understand current tasks and priorities
3. Skim the **latest session summary** in `.claude/history/` for recent context
4. If the user references a past decision, check `.claude/history/decisions.md`

## PRD Versioning

PRDs live in `.claude/prd/` and follow the naming convention `prd-v{N}-{DDMMYY}.md` (e.g., `prd-v0-200226.md`). The highest version number is the current PRD. Always read it at the start of a session to understand what we're building.

When requirements change significantly, create a new version rather than editing the current one. Minor clarifications can be edited in-place.

**Current PRD:** `.claude/prd/prd-v0-200226.md`

## Knowledge Capture

When you learn something during a session that would be useful in future sessions, **write it down** in `.claude/knowledge/`. This includes:

- **Technical discoveries** — gotchas, API quirks, library behavior (e.g., `google-maps-api.md`)
- **Domain knowledge** — bus route constraints, city rules, geographic facts (e.g., `tel-aviv-routes.md`)
- **Debugging insights** — problems encountered and how they were solved (e.g., `debugging.md`)
- **Research findings** — algorithm comparisons, benchmark results (e.g., `clustering-algorithms.md`)

**Rules:**
- One file per topic. Use descriptive filenames.
- Append to existing files when the topic already has a file.
- Keep entries concise — future Claude sessions will read these.
- Add a date header (`## 2026-02-20`) when appending to an existing file.
- Don't document obvious things. Only capture what would save time if encountered again.

## Session History

### Session Summaries

At the end of each session (or when the user signals they're done), write a summary to `.claude/history/sessions/DDMMYY-summary.md`. If multiple sessions happen on the same day, append `-N` (e.g., `200226-summary-2.md`).

**Format:**
```markdown
# Session — YYYY-MM-DD

## What was done
- [Bullet points of completed work]

## Decisions made
- [Key decisions and their rationale]

## Open items
- [Things left unfinished or blocked]

## Knowledge gained
- [Anything new learned, with refs to knowledge/ files if written]
```

### Decision Log

When a significant technical or product decision is made, append it to `.claude/history/decisions.md`.

**Format:**
```markdown
## [YYYY-MM-DD] Decision title
**Context:** Why this came up
**Decision:** What was decided
**Rationale:** Why this option was chosen
**Alternatives considered:** What else was on the table
```

Only log decisions that would be non-obvious to a future reader. Don't log trivial choices.

## Task Management

### Backlog

`.claude/backlog.md` is the single source of truth for tasks. Structure:

```markdown
# Backlog

## In Progress
- [ ] Task description — brief context

## Up Next
- [ ] Task description — brief context

## Done
- [x] Task description — completion date
```

**Rules:**
- Read the backlog at session start.
- When starting work on a task, move it to "In Progress".
- When finishing a task, move it to "Done" with the date.
- When new tasks are discovered during work, add them to "Up Next".
- Keep task descriptions short but actionable.
- The PRD defines *what* to build. The backlog tracks *granular progress*.

## Stack Documentation

`.claude/stack/` documents technology choices. One file per major choice (e.g., `hosting.md`, `database.md`, `maps-api.md`, `frontend.md`).

**Format:**
```markdown
# [Technology Area]

**Chosen:** [Technology name and version]
**Date:** YYYY-MM-DD

## Why
[Rationale for choosing this]

## Alternatives considered
[What else was evaluated and why it was rejected]

## Notes
[Setup quirks, limitations, free tier details, links]
```

Update stack docs when technologies are added or changed.

## Development

<!-- Updated as the stack is chosen -->

## Architecture

<!-- Updated as the system is designed -->
