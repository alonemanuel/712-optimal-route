# Task Workflow Rules

## Task Directory Structure

When assigned a task, create a dedicated directory to organize work:

```
.claude/tasks/
└── [task-name]/
    ├── plan.md              # Subtasks, breakdown, approach
    ├── notes.md             # Progress, decisions, learnings
    └── [subtask-dirs]/      # For complex subtasks (optional)
```

## Requirements

**Every task directory MUST include:**
1. **`plan.md`** — Break down the task into actionable subtasks
   - Start with the goal and acceptance criteria
   - List subtasks in order with clear descriptions
   - Update as new work is discovered

2. **`notes.md`** — Track progress and decisions
   - What's been done, what's in progress, what's blocked
   - Key decisions made and rationale
   - Technical discoveries worth retaining for future sessions
   - Any learnings from this task

## Workflow

1. **When starting a task:** Create the task directory and `plan.md`
2. **As you work:** Update `notes.md` with progress and discoveries
3. **Before finishing:** Ensure both files are complete and informative for the next session
4. **After task completion:** Commit both files to git so they persist as project history

## Why This Matters

- **Context retention:** Future agents (or you in later sessions) can quickly understand what was done
- **Planning transparency:** Clear subtasks help track progress and identify blockers
- **Knowledge capture:** Discoveries and decisions are preserved, not lost at session end
- **Git history:** Task directories become part of the repo, creating a living record of work

## Example

```markdown
# plan.md
## Task: Implement k-means clustering algorithm

### Goal
Build k-means from scratch in TypeScript to cluster bus stops into groups

### Subtasks
- [ ] Implement distance calculation function
- [ ] Implement centroid initialization (k-means++)
- [ ] Implement main clustering loop
- [ ] Add convergence detection
- [ ] Write unit tests for each component
- [ ] Performance test with 1K points

---

# notes.md
## Session 2026-02-20

### Completed
- Distance calculation function (Haversine formula)
- K-means++ initialization

### In Progress
- Main clustering loop (loop logic done, needs convergence check)

### Discovered
- k-means runs in <100ms for 1K points on modern CPU
- Haversine gives more accurate distances than Euclidean for geographic coords

### Blockers
- None
```
