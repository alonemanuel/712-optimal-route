# UI/UX Design Approach

**Date:** 2026-02-20

## 1. Design System / Component Library

**Chosen:** Tailwind CSS + shadcn/ui (or the Vue equivalent, if Vue is picked)

### Why Tailwind + shadcn

- **Tailwind alone** handles 90% of this project. Two pages, a map, a form, and a stats dashboard. No need for a heavy component library.
- **shadcn/ui** (React) or **shadcn-vue** (Vue) gives us pre-built, unstyled, copy-paste components for the parts that benefit from polish: buttons, dialogs, form inputs, cards, toast notifications. They're built on Radix primitives, so accessibility comes free.
- **DaisyUI** is tempting for speed but adds opinionated styling that's harder to customize for the civic/clean feel we want. shadcn gives us full control.
- **Headless UI** is fine but shadcn already wraps it with sensible defaults — no reason to go lower level for this scope.

### What we actually need from the library

| Component | Source |
|-----------|--------|
| Button, Input, Label | shadcn |
| Card (stats tiles) | shadcn |
| Dialog/Sheet (mobile form) | shadcn |
| Toast (submission confirmation) | shadcn |
| Map, markers, polyline | Google Maps JS API directly |
| Charts (stats page) | Lightweight chart lib (see Stats section) |
| Everything else | Tailwind utilities |

## 2. Layout Approach — Mobile-First, Map-Dominant

### Main Page (`/`)

The map IS the page. Everything else is an overlay or bottom sheet.

```
+---------------------------+
|  [712 logo/title bar]     |   <- Thin header, 48px max
+---------------------------+
|                           |
|                           |
|     Google Map            |   <- Takes remaining viewport height
|     (route + stops)       |
|                           |
|                           |
+---------------------------+
|  [Submit Address]  btn    |   <- Sticky bottom bar, always visible
+---------------------------+
```

**Interaction flow:**

1. User lands -> sees the map with the current proposed route, full screen.
2. Bottom bar has a single CTA: "Submit Your Address" (or "Where do you live?").
3. Tapping the CTA slides up a **bottom sheet** (not a new page) with:
   - Google Sign-In button (if not authenticated)
   - Address input with autocomplete (Google Places)
   - Submit button
4. After submit, the sheet shows: "Your nearest stop is X — Y meters walking distance" with a line drawn on the map.
5. Sheet can be swiped down to dismiss.

**Why bottom sheet, not a separate page or sidebar:**
- On mobile, bottom sheets feel native (Google Maps, Uber, Waze all use them).
- The map stays visible behind the sheet — user maintains spatial context.
- On desktop, the sheet becomes a side panel (400px wide, left side).

**Desktop adaptation:**
```
+------------------------------------------+
| [712 title]              [Stats link]    |
+------------+-----------------------------+
|            |                             |
| Side panel |      Google Map             |
| - Form     |      (route + stops)        |
| - Walking  |                             |
|   distance |                             |
|            |                             |
+------------+-----------------------------+
```

### Key layout decisions

- **No scrolling on main page.** The map fills the viewport. Form is in an overlay.
- **Map controls** (zoom, satellite toggle) stay in default Google Maps positions.
- **Stop markers** are custom: numbered circles (1, 2, 3...) in the brand color. Tapping a marker shows a small info bubble with the stop name/cross streets.
- **The user's submitted address** gets a distinct marker (different color, pulsing dot).

## 3. Color Scheme and Typography

### Colors

A civic/transit palette. Clean, trustworthy, not flashy.

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Transit Blue | `#1E6FD9` | Buttons, route polyline, active states |
| Primary Dark | Deep Blue | `#1553A3` | Hover states, header background |
| Accent | Signal Green | `#22C55E` | Success states, "within 400m" indicators |
| Warning | Warm Amber | `#F59E0B` | "Far from stop" indicators |
| Danger | Red | `#EF4444` | Errors, outlier markers |
| Background | White | `#FFFFFF` | Page background |
| Surface | Light Gray | `#F8FAFC` | Cards, stat tiles |
| Text Primary | Near Black | `#1E293B` | Body text |
| Text Secondary | Slate | `#64748B` | Labels, secondary info |
| Border | Light Border | `#E2E8F0` | Card borders, dividers |

**Why blue:** Blue is the standard for transit/civic UI worldwide (think: Google Maps routes, public transit signs, government sites). It reads as trustworthy and authoritative — exactly what we want when presenting to a mayor.

### Typography

**Font:** `Inter` (Google Fonts, free, excellent Hebrew subset support)

- **Why Inter:** Clean, modern, highly readable at small sizes on mobile. Has Hebrew glyphs. Variable font = one file, all weights.
- **Fallback:** `system-ui, -apple-system, sans-serif`

| Element | Size | Weight |
|---------|------|--------|
| Page title | 24px / 1.5rem | 700 (Bold) |
| Section header | 20px / 1.25rem | 600 (Semibold) |
| Stat number (big) | 36px / 2.25rem | 700 (Bold) |
| Stat label | 14px / 0.875rem | 500 (Medium) |
| Body text | 16px / 1rem | 400 (Regular) |
| Small/caption | 14px / 0.875rem | 400 (Regular) |

**No font smaller than 14px.** Mobile readability is non-negotiable.

## 4. Stats Page Layout — Impress the Mayor

This page needs to tell a story in 5 seconds. The mayor glances at it and thinks: "This is clearly a better route, backed by data from real riders."

### Layout

```
+------------------------------------------+
| [712 Logo]   Proposed Route for Bus 712  |
|              Tel Aviv Stops Optimization  |
+------------------------------------------+
|                                          |
|  [N]          [X m]         [Y%]        |
|  Riders       Avg Walk      Within 400m |
|  Submitted    Distance      of a Stop   |
|                                          |
+------------------------------------------+
|                                          |
|         Demand Heatmap                   |
|         (Google Map with heatmap         |
|          overlay + proposed stops)       |
|                                          |
+------------------------------------------+
|                                          |
|  Before vs After                         |
|  Current route    Proposed route         |
|  avg walk: Xm     avg walk: Ym          |
|  coverage: X%      coverage: Y%         |
|                                          |
+------------------------------------------+
|                                          |
|  Walking Distance Distribution           |
|  [Simple histogram / bar chart]          |
|                                          |
+------------------------------------------+
|  Last updated: [timestamp]               |
+------------------------------------------+
```

### Design details for the stats page

**Hero metrics (top):** Three large stat cards in a row. Big bold number, small label underneath. Use color to convey meaning:
- Submissions count: neutral (blue)
- Avg walk distance: green if <400m, amber if >400m
- Coverage %: green if >80%, amber if 50-80%, red if <50%

**Heatmap section:** A Google Map with:
- Heatmap layer showing address density (red = high, blue = low)
- Proposed stops overlaid as numbered markers
- Route polyline connecting stops
- This is the visual centerpiece — should be at least 400px tall on desktop

**Before vs After (if we have current route data):** Two-column comparison. Simple metric cards. This is the "sell" — shows the improvement quantitatively.

**Distribution chart:** A simple bar chart showing how many riders fall into each walking distance bucket (0-200m, 200-400m, 400-600m, 600m+). Gives a feel for the spread, not just the average.

**Chart library:** Use **Chart.js** or **Recharts** (React) / **vue-chartjs** (Vue). Both are free, lightweight, and produce clean charts. Avoid D3 — overkill for 2 charts.

**Screenshot-friendliness:**
- White background, no dark mode on stats page.
- All content fits in a single scroll on desktop (aim for 1200px viewport height).
- No interactive elements needed — everything is visible statically.
- Add subtle branding: "712 Optimal Route" and a timestamp.

## 5. RTL Support

**Recommendation: English-only for v0. Plan for Hebrew later.**

### Rationale

- The mayor presentation can be in English — it's data and maps, not prose.
- Hebrew RTL adds real complexity: layout mirroring, bidirectional text, RTL-aware components.
- For a civic tool, English is acceptable — most Israeli tech-literate users read English fine.
- The form has exactly one text field (address), which will be in Hebrew naturally — standard `<input>` handles mixed direction fine with `dir="auto"`.

### If Hebrew is needed later

- Tailwind has built-in RTL support via the `rtl:` variant prefix.
- shadcn components respect `dir="rtl"` on the document.
- Use `dir="auto"` on text inputs so Hebrew addresses render correctly.
- Add an `i18next` or similar lib with two locale files (small scope — maybe 30 strings total).
- Cost: ~1 day of work to add after v0. Not worth blocking on.

### One concession now

Set `dir="auto"` on the address input field from day one. This costs nothing and ensures Hebrew addresses display correctly in the form.

## 6. Accessibility Basics

Minimal effort, real impact. These are non-negotiable:

### Must-do (free with shadcn + Tailwind)

| Practice | How |
|----------|-----|
| Semantic HTML | Use `<main>`, `<nav>`, `<section>`, `<button>` (not divs for everything) |
| Color contrast | All text meets WCAG AA (4.5:1 ratio). The palette above passes. |
| Focus indicators | shadcn includes visible focus rings by default. Don't remove them. |
| Alt text on map | Add `aria-label="Map showing proposed bus route"` to the map container |
| Form labels | Every input has a visible `<label>`. shadcn handles this. |
| Touch targets | Minimum 44x44px for all tappable elements (buttons, markers). Tailwind: `min-h-11 min-w-11` |
| Skip to content | Not needed — only 2 pages, minimal nav |

### Nice-to-have (skip for v0)

- Screen reader announcements for route recalculation ("Route updated with your submission")
- Keyboard navigation for map markers
- Reduced motion preference for animations

### Map accessibility caveat

Google Maps is not fully accessible by nature. The map is supplementary — the stats page provides the same data in text form. This is the standard approach for map-heavy civic tools.

## Summary Table

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component lib | shadcn/ui + Tailwind | Minimal, accessible, full control |
| Layout | Map-full-screen + bottom sheet | Native-feeling mobile UX |
| Colors | Transit Blue primary | Civic, trustworthy, standard for transit |
| Font | Inter | Clean, free, Hebrew support |
| Stats layout | Hero metrics + heatmap + chart | Tells the story in 5 seconds |
| Chart lib | Chart.js (or framework equivalent) | Lightweight, clean output |
| RTL | English-only v0, `dir="auto"` on inputs | Avoid complexity, easy to add later |
| Accessibility | Semantic HTML + contrast + touch targets | Low effort, high impact |
