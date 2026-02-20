# Rules — Auto-Loaded Constraints

This directory holds rules that Claude Code auto-loads at session start.

## What Goes Here

**Code style rules** — Specific to this project:
- Naming conventions (e.g., "API routes use kebab-case")
- File organization patterns (e.g., "Components go in components/, utilities in lib/")
- Comment style (when to add, what format)

**Commit/PR standards:**
- Commit message format (e.g., "feat:", "fix:", "docs:")
- PR description template
- When to squash vs merge

**Testing requirements:**
- What needs tests (e.g., "All API routes must have tests")
- What level of coverage (e.g., "Aim for 80% on algorithm code")
- Mocking strategy (e.g., "Mock Google Maps API calls in tests")

## Format

Create `.md` files in this directory. They're auto-loaded by Claude Code at session start.

Use clear headers and bullet points:

```markdown
# Code Style Rules

## TypeScript
- Always use explicit return types on functions
- Prefer `const` over `let`
- No `any` types — use `unknown` and narrow

## React Components
- Functional components only
- Props interface named `[ComponentName]Props`
- Export component as default

## API Routes
- File names: `route.ts` (Next.js 14 convention)
- Always validate input with Zod
- Return consistent error format: `{error: string, code: number}`
```

## What NOT to include

- General programming knowledge (e.g., "use TypeScript" — this is in stack.md)
- Changing requirements (use PRD instead)
- Temporary preferences (only add rules that should apply long-term)

## Currently Empty

This directory is empty at project start. Add rules as patterns solidify and you find yourself repeating the same feedback.
