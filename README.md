# 712 Optimal Route

A data-driven tool to optimize bus route 712's Tel Aviv stops. Collects rider addresses, computes optimal stop placement using clustering, and visualizes the proposed route on an interactive map — for a proposal to the Modi'in mayor.

## What It Does

1. **Collects rider addresses** via a mobile-first web form (Google auth, one submission per person)
2. **Computes optimal stops** (5–15) that minimize average walking distance using clustering algorithms
3. **Displays the route** on an interactive Google Map with live updates as submissions come in
4. **Provides stats** (avg walk distance, coverage %, submission count) for the mayor presentation

## Status

Early stage — PRD complete, stack selection pending. See `.claude/backlog.md` for current progress.

## Project Structure

```
.claude/              # Claude Code project config and living docs
  prd/                # Versioned product requirement documents
  backlog.md          # Task tracking
  knowledge/          # Accumulated domain and technical knowledge
  history/            # Session summaries and decision log
  stack/              # Tech stack decisions and rationale
  rules/              # Coding conventions and rules
```
