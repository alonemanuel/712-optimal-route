# UX Patterns Spec — Cross-Cutting

**Parent:** `overview.md`
**Date:** 2026-02-20

Shared patterns referenced by `main-page.md` and `stats-page.md`. Defines the design system, mobile behavior, navigation, error handling, and accessibility rules that apply across all pages.

---

## 1. Navigation

### Structure

Two pages: `/` (main) and `/stats` (stats). No router needed — standard `<a>` links with full page load (or a minimal SPA router if using a framework).

### Nav Between Pages

| From | To | Trigger | Location |
|------|----|---------|----------|
| Main | Stats | "סטטיסטיקה" text link | Header, left side (RTL) |
| Stats | Main | Browser back, or logo/title click | Header |
| Stats (no data) | Main | "שליחת כתובת" CTA | Empty state message |
| Main (after submit) | Stats | "צפו בסטטיסטיקה המלאה" link | Success panel (desktop) |

### Header

Both pages share the same header structure. The main page header includes a subtitle ("?מאיפה אתם עולים ל-712"). The stats page header omits the subtitle and shows the page heading instead.

---

## 2. Design Tokens (Canonical)

This is the single source of truth. Both pages use these values.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color-primary` | `#2563EB` (blue-600) | Buttons, links, proposed route polyline, stop markers |
| `color-primary-dark` | `#1D4ED8` (blue-700) | Button hover |
| `color-good` | `#16A34A` (green-600) | Success states, good metrics, walking line, start stop |
| `color-moderate` | `#CA8A04` (yellow-600) | Moderate metrics, sparse data warning |
| `color-poor` | `#DC2626` (red-600) | Error states, bad metrics |
| `color-current-route` | `#9CA3AF` (gray-400) | Current route polyline |
| `color-surface` | `#FFFFFF` | Page background, card background |
| `color-surface-muted` | `#F8F9FA` | Sidebar background, action panel |
| `color-text-primary` | `#111827` (gray-900) | Body text, headings |
| `color-text-secondary` | `#6B7280` (gray-500) | Labels, secondary info, comparisons |
| `color-text-on-primary` | `#FFFFFF` | Text on primary-colored buttons |
| `color-border` | `#E5E7EB` (gray-200) | Card borders, dividers |
| `color-error-bg` | `#FEF2F2` (red-50) | Error banner background |
| `color-warning-bg` | `#FFFBEB` (yellow-50) | Warning banner background |
| `color-user-pin` | `#EF4444` (red-500) | User's address marker |
| `color-preview-pin` | `#93C5FD` (blue-300, 50% opacity) | Address preview pin before submit |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `font-family` | `system-ui, -apple-system, sans-serif` | All text |
| `font-hero` | 48px / 700 weight | Stats page hero metric |
| `font-metric` | 32px / 700 weight | Stats secondary metrics |
| `font-heading` | 24px / 700 weight | Page headings |
| `font-subheading` | 18px / 600 weight | Section headings, panel titles |
| `font-body` | 16px / 400 weight | Body text, labels |
| `font-small` | 14px / 400 weight | Captions, comparison text, privacy note |
| `font-tiny` | 12px / 400 weight | Footer, timestamps |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | 4px | Tight gaps |
| `space-sm` | 8px | Icon-to-text, inline gaps |
| `space-md` | 16px | Paragraph gaps, card padding (mobile) |
| `space-lg` | 24px | Card padding (desktop), section spacing |
| `space-xl` | 32px | Section gaps |
| `space-2xl` | 48px | Major section dividers |

### Shapes

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Buttons, inputs |
| `radius-md` | 12px | Cards, panels |
| `radius-lg` | 16px | Bottom sheet top corners |
| `radius-full` | 999px | Pill buttons (toggle controls), badges |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `shadow-md` | `0 1px 3px rgba(0,0,0,0.1)` | Cards |
| `shadow-lg` | `0 4px 6px rgba(0,0,0,0.1)` | Bottom sheet, dropdowns |

---

## 3. Responsive Layout

### Breakpoint

Single breakpoint: **768px**.

| | Mobile (< 768px) | Desktop (>= 768px) |
|---|---|---|
| Main page | Full-width map + bottom sheet | Map (65%) + sidebar (35%) |
| Stats page | Single column, 2x2 metric grid | Full width, 3-col metrics |
| Header | Compact (short text) | Full (subtitle visible) |
| Footer | Hidden | Visible |

No tablet-specific breakpoint. 768px+ is "desktop."

### Mobile-First Approach

CSS is written mobile-first. Desktop styles use `@media (min-width: 768px)`.

---

## 4. RTL & Hebrew

### Global Setup

```html
<html lang="he" dir="rtl">
```

### RTL Implications

| Element | Behavior |
|---------|----------|
| Text alignment | Default right-aligned |
| Input fields | Cursor starts right, text flows right-to-left |
| Autocomplete dropdown | Right-aligned |
| Buttons | Text centered, icons on the right side |
| Map controls | Moved to LEFT side (non-RTL side, avoids overlap with sidebar) |
| Info windows | Text right-aligned |
| Numbers | Display LTR within RTL context (browser default — "280 מ'" renders correctly) |
| Arrows | "←" means "forward/next" in RTL context |
| Metric comparisons | "במקום 520 מ' היום" flows naturally in RTL |

### No English Fallback

All user-facing text is Hebrew. No language toggle. Error messages include Hebrew (`message_he`) from the API. Code/admin-facing strings (console logs, API codes) remain English.

---

## 5. Loading Patterns

### Skeleton Placeholders

Used for content that hasn't loaded yet. Replaces the content area with gray pulsing blocks that match the expected content size.

```
Pulse animation: opacity 0.4 → 0.7, 1.5s ease-in-out loop
Color: #E5E7EB (gray-200)
Border radius: same as the content it replaces
```

Used in: metric cards (stats page), action panel content.

### Spinner

Centered within its container. Used for actions in progress (form submit, map loading).

```
Size: 24px (inline), 40px (centered/full-area)
Color: color-primary (#2563EB)
Style: CSS border spinner (border-top colored, rotating)
Speed: 0.8s per rotation
```

Used in: submit button, map area loading, retry loading.

### Shimmer

Used specifically for the route polyline while route data loads (map is visible but route data is pending).

```
A faint gray polyline traces a generic path, pulsing in opacity.
Replaced by the real route once data loads.
```

### Loading Order

1. HTML shell renders immediately (header, empty map container, empty panel)
2. Map JS loads (show skeleton → map tiles appear)
3. Route data fetches (show shimmer → route polyline + markers appear)
4. Auth check runs (if session cookie exists → panel updates to signed-in state)
5. Submission check (if signed in → check for existing submission → panel updates)

Steps 2-3 and 4-5 run in parallel.

---

## 6. Error Patterns

Three tiers of error UI, used consistently across pages.

### Tier 1: Toast (Transient Errors)

For non-blocking errors that don't prevent page use.

```
┌─────────────────────────────────────────┐
│  ⚠ [Message text]                  [✕]  │
└─────────────────────────────────────────┘
```

- Position: Top of viewport, below header, centered horizontally
- Width: max 500px (or full width on mobile with 16px margin)
- Background: `color-error-bg` with left border `color-poor`
- Auto-dismiss: 5 seconds
- Manual dismiss: X button
- Stacking: max 2 toasts visible, newest on top
- Animation: slide down 300ms ease-out

**Used for:** auth failure, generic API errors that don't block the page.

### Tier 2: Banner (Persistent, Non-Blocking)

For errors that need attention but don't prevent all page use.

```
┌──────────────────────────────────────────────┐
│  ⚠ [Message text]                       [↻]  │
└──────────────────────────────────────────────┘
```

- Position: Full width, below header
- Background: `color-error-bg`
- Persistent: does NOT auto-dismiss
- Action button: retry (↻) when applicable
- Animation: slide down, push content below

**Used for:** network errors (route loading failure, submission failure with retry).

### Tier 3: Inline Error (Field-Level)

For form validation errors.

```
  ┌──────────────────────┐
  │  Input field          │
  └──────────────────────┘
  ⚠ Error message text
```

- Position: directly below the relevant field
- Color: `color-poor` text
- Icon: ⚠ inline
- No auto-dismiss — clears when the field is corrected
- Animation: fade in 200ms

**Used for:** geocoding failure, address validation, "select from list" hint.

---

## 7. Button Styles

### Primary Button

Used for the main CTA (submit, sign-in).

```
Background: color-primary (#2563EB)
Text: color-text-on-primary (#FFFFFF)
Font: font-body (16px), 600 weight
Padding: 12px 24px
Border radius: radius-sm (8px)
Full width on mobile, auto width on desktop (min 200px)

Hover: color-primary-dark (#1D4ED8)
Disabled: opacity 0.5, cursor not-allowed
Loading: text replaced with spinner, button disabled
```

### Google Sign-In Button

Follow Google's branding guidelines:
- White background, dark text
- Google "G" logo on the right (RTL)
- "התחברות עם Google" text
- Rounded corners per Google Brand Guidelines

### Toggle Pills (Stats Page)

```
Active: color-primary background, white text
Inactive: white background, color-text-secondary, 1px border
Border radius: radius-full (pill shape)
Padding: 8px 16px
Font: font-small (14px)
● indicator dot for active state
```

---

## 8. Map Styling (Shared)

Both pages use Google Maps. These styles are consistent across pages.

### Proposed Route

| Property | Value |
|----------|-------|
| Polyline color | `#2563EB` (color-primary) |
| Polyline weight | 4px |
| Polyline opacity | 0.8 |
| Final segment (to highway) | Dashed, same color |
| Stop markers | White circle, blue border, blue number |
| Stop marker size | 32x32px |
| Highway endpoint | Gray marker, highway icon |

### Current Route (Stats Page Only)

| Property | Value |
|----------|-------|
| Polyline color | `#9CA3AF` (color-current-route) |
| Polyline weight | 3px |
| Polyline opacity | 0.5 |
| Stop markers | Gray circle, no number |

### User Pin (Main Page Only)

| Property | Value |
|----------|-------|
| Pin color | `#EF4444` (color-user-pin) |
| Style | Standard Google Maps marker (drop shape) |
| Walking line | 2px dashed, `#16A34A` (color-good) |
| Walk label | Small floating label at line midpoint |

---

## 9. Animations

Minimal. Performance over polish.

| Animation | Duration | Easing | Where |
|-----------|----------|--------|-------|
| Panel crossfade | 300ms | ease-in-out | Main page state transitions |
| Toast slide-in | 300ms | ease-out | Toast notifications |
| Toast auto-dismiss | 300ms | ease-in | Toast fade out |
| Pin drop | Standard Google Maps bounce | - | Main page after submit |
| Walking line draw | 500ms | ease-out | Main page after submit |
| Walk label fade-in | 200ms | ease-in | Main page after submit |
| Counter roll-up | 800ms | ease-out | Stats page metric load |
| Skeleton pulse | 1.5s loop | ease-in-out | Loading placeholders |
| Heatmap fade-in | 300ms | ease-in | Stats page map layer |
| Route crossfade | 300ms | ease-in-out | Main page route update |
| Inline error fade-in | 200ms | ease-in | Form validation |

### Prefers-Reduced-Motion

Respect `@media (prefers-reduced-motion: reduce)`:
- Skip counter roll-up (show final value immediately)
- Skip pin drop animation
- Skip walking line draw
- Keep skeleton pulse (it's informational, not decorative)

---

## 10. Accessibility

### Minimum Requirements

This is a public-facing civic tool. Basic accessibility is important.

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | All text meets WCAG AA (4.5:1 normal, 3:1 large) |
| Focus indicators | Visible focus rings on all interactive elements |
| Keyboard navigation | Tab order: header → form fields → submit → map (map skippable) |
| Screen reader labels | `aria-label` on map markers, form inputs, buttons |
| Live regions | `aria-live="polite"` on toast container, walk distance display |
| Image alt text | Stop markers: "תחנה 3, רחוב דיזנגוף" |
| Form labels | All inputs have associated `<label>` elements |
| Error association | `aria-describedby` linking inputs to error messages |
| Skip link | "Skip to content" hidden link for keyboard users |
| Focus management | After sign-in → focus address input. After submit → focus success message. |

### Map Accessibility

Google Maps has built-in keyboard support. Additional considerations:
- Map is `tabindex="0"` with `role="application"` and `aria-label="מפת המסלול המוצע"` (Proposed route map)
- Stop info windows are keyboard-accessible (Enter to open when marker is focused)
- A non-visual route summary is available as a hidden `aria-live` region that describes the route in text: "המסלול עובר דרך 8 תחנות, מתחיל ב-דיזנגוף ומסתיים בכביש המהיר"

---

## 11. Page Metadata

### Main Page

```html
<title>712 אופטימלי — מסלול מותאם לנוסעים</title>
<meta name="description" content="עזרו לנו לבנות מסלול טוב יותר לקו 712 — הוסיפו את הכתובת שלכם ותראו את המסלול המוצע">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta property="og:title" content="712 אופטימלי — מסלול מותאם לנוסעים">
<meta property="og:description" content="עזרו לנו לבנות מסלול טוב יותר לקו 712">
<meta property="og:type" content="website">
```

### Stats Page

```html
<title>קו 712 — נתונים | מסלול מותאם לנוסעים</title>
<meta name="description" content="כלי מבוסס נתונים לשיפור תחנות קו 712 בתל אביב — מרחק הליכה, כיסוי, ומפת חום של ביקוש">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="קו 712 — מסלול מותאם לנוסעים">
<meta property="og:description" content="כלי מבוסס נתונים לשיפור תחנות קו 712 בתל אביב">
<meta property="og:type" content="website">
<meta name="robots" content="index, follow">
```

Note: Stats page does NOT have `maximum-scale=1` — users may want to zoom in on metrics. Main page has it to prevent accidental zoom on the map.

---

## 12. Performance Budget

| Metric | Target | Notes |
|--------|--------|-------|
| First Contentful Paint | < 1.5s | Header + skeleton visible |
| Largest Contentful Paint | < 3s | Map tiles loaded (NF2 from PRD) |
| Total JS bundle | < 150 KB (gzipped) | Excludes Google Maps JS (loaded async) |
| Google Maps JS | Loaded async | `loading=async` on script tag |
| API response (route) | < 200ms | Cached in memory/SQLite |
| Route recalculation | < 10s | NF3 from PRD, for up to 1000 submissions |

### Image Optimization

- No images except map tiles (Google-served) and Google "G" logo (SVG)
- Favicons: SVG (single file) preferred. "712" in blue circle.

---

## 13. Print Styles

Both pages should be printable, but the stats page has a dedicated presentation mode.

### Global Print CSS

```css
@media print {
  header { display: none; }
  .toast, .banner { display: none; }
  .bottom-sheet { display: none; }
  body { background: white; }
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```

### Stats Page Print (Presentation Mode)

See `stats-page.md` Section 8.2 for the detailed presentation mode spec.
