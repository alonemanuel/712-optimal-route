# Knowledge Base

This directory holds domain knowledge and technical learnings discovered during development.

## What Goes Here

**Domain knowledge** — Facts about the problem space:
- Bus route constraints and regulations
- Tel Aviv / Israeli address patterns
- Google Maps API quirks for Hebrew addresses
- Mayor/city approval process insights

**Technical discoveries** — Non-obvious learnings:
- Library behavior and gotchas (e.g., "ml-kmeans doesn't handle empty clusters well")
- Algorithm performance benchmarks (e.g., "K-means on 10K points takes ~2s on Vercel")
- API integration patterns (e.g., "Supabase real-time requires X")
- Debugging solutions (e.g., "Map not rendering? Check CORS policy")

**When to add a file:**
- You spent >10 minutes solving a problem that could recur
- You learned something that isn't documented in official docs
- A future Claude session would benefit from this context

## Format

One file per topic. Use descriptive filenames like:
- `google-maps-hebrew.md` — Google Maps API behavior with Hebrew addresses
- `tel-aviv-neighborhoods.md` — Relevant neighborhoods for route planning
- `k-means-edge-cases.md` — K-means algorithm gotchas and solutions

Append to existing files when the topic already exists. Add a date header (`## 2026-02-20`) when appending.

## What NOT to include

- Obvious facts (e.g., "Next.js uses React" — this is common knowledge)
- Temporary notes (use session summaries instead)
- Task tracking (use backlog.md)
- Decision rationale (use history/decisions.md)

## Currently Empty

This directory is empty at project start. It will grow as development progresses.
