# 712 Optimal Route

A data-driven tool to optimize bus 712's Tel Aviv stops based on rider address data, for a proposal to the Modi'in mayor.

## Project Structure

```
.claude/
  README.md             # Documentation guide (start here for navigation)
  CLAUDE.md             # Project instructions (this file, loaded every session)
  settings.json         # Permissions and configuration
  backlog.md            # Current tasks and priorities
  docs/                 # Core project docs (PRD, architecture, stack)
  specs/                # Detailed implementation specs (UI, algorithm, API)
  history/              # Session summaries and decision log
  knowledge/            # Domain knowledge and research (grows over time)
  skills/               # Reusable workflows (grows over time)
  rules/                # Auto-loaded rule files (*.md)
  archive/              # Old docs (not actively used)
```

**See `README.md` for the full directory structure and navigation guide.**

## Working Style

- **Ask questions before assuming.** When unsure about a design choice, implementation approach, or requirement, use the AskUserQuestion tool to present options and get input. Don't guess — collaborate.
- **Present options, not monologues.** When there are multiple valid approaches, lay them out concisely with trade-offs and let the user choose.
- **Be proactive about gaps.** If something in the PRD is ambiguous or a technical decision hasn't been made yet, raise it.
- **Don't over-explain.** Be concise. The user is technical and prefers short, direct communication.

## Session Start

At the beginning of every session:
1. Read **`README.md`** to understand the documentation structure (first time only)
2. Read **`docs/prd.md`** for the current product requirements
3. Read **`backlog.md`** to understand current tasks and priorities
4. Skim the **latest session summary** in `history/sessions/` for recent context
5. If the user references a past decision, check `history/decisions.md`

**Quick references:**
- Architecture overview: `docs/architecture.md`
- Tech stack: `docs/stack.md`
- UI specs: `specs/ui-*.md`
- Algorithm: `specs/algorithm.md`
- API reference: `specs/api-data.md`

## PRD Versioning

The current PRD is at `docs/prd.md`. When requirements change significantly, create a new version:
1. Move the current `docs/prd.md` to `archive/prd-versions/prd-v{N}-{DDMMYY}.md`
2. Update `docs/prd.md` with the new requirements
3. Update the version number at the top of the file
4. Log the change in `history/decisions.md`

Minor clarifications can be edited in-place without versioning.

**Current PRD:** `docs/prd.md` (v0, created 2026-02-20)

## Knowledge Capture

When you learn something during a session that would be useful in future sessions, **write it down** in `knowledge/`. See `knowledge/README.md` for guidelines.

**What to capture:**
- Technical discoveries — API quirks, library gotchas (e.g., `google-maps-hebrew.md`)
- Domain knowledge — bus route constraints, geographic facts (e.g., `tel-aviv-neighborhoods.md`)
- Debugging insights — recurring problems and solutions (e.g., `k-means-edge-cases.md`)

**Rules:**
- One file per topic. Use descriptive filenames.
- Append to existing files when the topic already exists (add date header).
- Keep entries concise — future sessions will read these.
- Don't document obvious things. Only capture what would save time if encountered again.

## Session History

### Session Summaries

At the end of each session (or when the user signals they're done), write a summary to `history/sessions/DDMMYY-summary.md`. If multiple sessions happen on the same day, append `-N` (e.g., `200226-summary-2.md`).

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

When a significant technical or product decision is made, append it to `history/decisions.md`.

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

`backlog.md` is the single source of truth for tasks. Structure:

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

`docs/stack.md` documents all technology choices in one place. It includes:
- Rationale for each choice
- Alternatives considered
- Free tier limits and constraints
- Key decisions log

Update `docs/stack.md` when technologies are added or changed.

For detailed technical implementation notes (e.g., API quirks, setup gotchas), add to `knowledge/` instead.

## Development

<!-- Updated as the stack is chosen -->

## Architecture

<!-- Updated as the system is designed -->
