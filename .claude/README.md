# 712 Optimal Route — Documentation Guide

**Start here.** This file explains how the `.claude/` directory is organized and what to read when.

## Quick Navigation

| When you need... | Read this |
|------------------|-----------|
| **Session start** | `CLAUDE.md` → `docs/prd.md` → `backlog.md` |
| **Project overview** | `docs/prd.md` |
| **Tech stack** | `docs/stack.md` |
| **System architecture** | `docs/architecture.md` |
| **UI details** | `specs/ui-*.md` |
| **Algorithm details** | `specs/algorithm.md` |
| **API/data model** | `specs/api-data.md` |
| **Past decisions** | `history/decisions.md` |
| **Current tasks** | `backlog.md` |

## Directory Structure

```
.claude/
├── README.md              # This file — navigation guide
├── CLAUDE.md              # Session behavior and workflows
├── settings.json          # Permissions and config
├── backlog.md             # Current tasks and priorities
│
├── docs/                  # Core project docs (read at session start)
│   ├── prd.md             # Product requirements — what we're building
│   ├── architecture.md    # System design — how it fits together
│   └── stack.md           # Tech stack decisions — tools and libraries
│
├── specs/                 # Detailed specifications (read as needed)
│   ├── ui-main-page.md    # Main page wireframes and behavior
│   ├── ui-stats-page.md   # Stats page wireframes and behavior
│   ├── algorithm.md       # Route optimization algorithm
│   └── api-data.md        # API endpoints and data model
│
├── history/               # Living log
│   ├── decisions.md       # Key decisions and rationale
│   └── sessions/          # Session summaries
│
├── knowledge/             # Domain knowledge (grows over time)
│   └── README.md          # What goes here
│
├── skills/                # Reusable workflows
│   └── README.md          # What goes here
│
├── rules/                 # Auto-loaded rules
│   └── README.md          # What goes here
│
└── archive/               # Old docs (not actively used)
    ├── stack-proposals/   # Initial stack exploration
    └── prd-versions/      # Superseded PRDs
```

## Reading Order

### First Session
1. **`CLAUDE.md`** — Understand session behavior and workflows
2. **`docs/prd.md`** — What problem we're solving and for whom
3. **`docs/architecture.md`** — How the system works
4. **`docs/stack.md`** — What technologies we're using
5. **`backlog.md`** — What's the current state

### During Work
- **Need UI details?** → `specs/ui-*.md`
- **Need algorithm details?** → `specs/algorithm.md`
- **Need API reference?** → `specs/api-data.md`
- **Forgot why we chose X?** → `history/decisions.md` or `docs/stack.md`
- **What was discussed last session?** → `history/sessions/`

## Document Hierarchy

**3 tiers:**

1. **Core (`docs/`)** — High-level, stable, read at session start
   - PRD defines *what* to build
   - Architecture defines *how* it fits together
   - Stack defines *which tools* to use

2. **Detailed (`specs/`)** — Implementation specs, reference as needed
   - UI wireframes and interaction patterns
   - Algorithm pseudocode and parameters
   - API contracts and data schemas

3. **Living (`backlog.md`, `history/`)** — Changes constantly
   - Backlog tracks current work
   - History logs decisions and summaries

## When to Update What

| File | Update when... |
|------|----------------|
| `docs/prd.md` | Requirements change significantly |
| `docs/architecture.md` | System design evolves |
| `docs/stack.md` | Tech choices change |
| `specs/*.md` | Implementation details are finalized |
| `backlog.md` | Starting/finishing tasks |
| `history/decisions.md` | Making a significant decision |
| `history/sessions/*.md` | End of each session |
| `knowledge/*.md` | Learning something non-obvious |

## Empty Directories

- **`knowledge/`** — Will hold domain knowledge (e.g., Google Maps API quirks, Israeli address patterns)
- **`skills/`** — Will hold reusable Claude Code workflows (e.g., "add API endpoint", "run algorithm benchmark")
- **`rules/`** — Will hold auto-loaded rules (e.g., code style, commit message format)
- **`archive/`** — Holds old docs for reference (not actively used)

These are empty at project start but will grow during development.
