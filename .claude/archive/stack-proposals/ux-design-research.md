# UX/UI Design Research and Proposal

**Author:** ux-designer
**Date:** 2026-02-20

---

## 1. Color Palette

A civic/transit-blue palette built on Tailwind CSS defaults for consistency with the frontend stack. Colors chosen for projector readability, WCAG AA contrast compliance, and institutional credibility.

### Primary Palette

| Role | Name | Hex | Tailwind Class | Usage |
|------|------|-----|----------------|-------|
| **Primary** | Transit Blue | `#2563EB` | `blue-600` | Route polyline, CTA buttons, active states, links |
| **Primary Hover** | Deep Blue | `#1D4ED8` | `blue-700` | Button hover, header bar |
| **Primary Light** | Sky | `#DBEAFE` | `blue-100` | Selected/active backgrounds, subtle highlights |
| **Primary Surface** | Ice | `#EFF6FF` | `blue-50` | Hero stat card backgrounds |

### Neutral Palette

| Role | Name | Hex | Tailwind Class | Usage |
|------|------|-----|----------------|-------|
| **Text Primary** | Slate 800 | `#1E293B` | `slate-800` | Headings, body text, stat numbers |
| **Text Secondary** | Slate 500 | `#64748B` | `slate-500` | Labels, captions, metadata |
| **Text Tertiary** | Slate 400 | `#94A3B8` | `slate-400` | Placeholders, disabled text |
| **Background** | White | `#FFFFFF` | `white` | Page background |
| **Surface** | Slate 50 | `#F8FAFC` | `slate-50` | Card backgrounds, stats page sections |
| **Border** | Slate 200 | `#E2E8F0` | `slate-200` | Card borders, dividers, input borders |
| **Border Focus** | Blue 500 | `#3B82F6` | `blue-500` | Input focus ring |

### Semantic Colors

| Role | Name | Hex | Tailwind Class | Usage |
|------|------|-----|----------------|-------|
| **Success** | Green 600 | `#16A34A` | `green-600` | Good metrics (<400m walk, >80% coverage) |
| **Success Light** | Green 50 | `#F0FDF4` | `green-50` | Success stat card background |
| **Warning** | Amber 500 | `#F59E0B` | `amber-500` | Moderate metrics (400-600m walk, 50-80% coverage) |
| **Warning Light** | Amber 50 | `#FFFBEB` | `amber-50` | Warning stat card background |
| **Error** | Red 500 | `#EF4444` | `red-500` | Errors, poor metrics, validation messages |
| **Error Light** | Red 50 | `#FEF2F2` | `red-50` | Error state backgrounds |

### Map-Specific Colors

| Role | Hex | Usage |
|------|-----|-------|
| Route Polyline | `#2563EB` (Primary) | Proposed route line on map |
| Stop Marker Fill | `#2563EB` (Primary) | Numbered stop circles |
| Stop Marker Text | `#FFFFFF` | Number inside stop circles |
| User Address Pin | `#16A34A` (Success) | User's submitted address marker |
| Walking Line | `#16A34A` dashed | Dashed line from address to nearest stop |
| Current Route (Before) | `#94A3B8` (Slate 400) | Existing route, shown muted for comparison |

### Contrast Verification

All text combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Foreground | Background | Ratio | Pass? |
|-----------|-----------|-------|-------|
| Slate 800 on White | `#1E293B` / `#FFFFFF` | 12.6:1 | AA |
| Slate 500 on White | `#64748B` / `#FFFFFF` | 4.6:1 | AA |
| White on Blue 600 | `#FFFFFF` / `#2563EB` | 4.7:1 | AA |
| White on Green 600 | `#FFFFFF` / `#16A34A` | 4.5:1 | AA |
| Slate 800 on Blue 50 | `#1E293B` / `#EFF6FF` | 11.3:1 | AA |

---

## 2. Typography

### Font Stack

**Primary Font:** Inter (Google Fonts)

- **Why Inter:** Purpose-built for screens. Has tabular figures (`font-variant-numeric: tabular-nums`) for aligned stat numbers. Variable font = one file, all weights. Excellent x-height for small-screen readability. Supports Hebrew glyphs for address input. Free and open source.
- **Fallback:** `system-ui, -apple-system, "Segoe UI", sans-serif`

**Stats Numbers Font:** Inter with tabular figures

- No separate mono font needed. Inter's `tnum` OpenType feature aligns digits perfectly.
- Apply via CSS: `font-variant-numeric: tabular-nums;` or Tailwind: `tabular-nums`

### Type Scale

| Element | Size (rem/px) | Weight | Line Height | Tracking | Tailwind |
|---------|---------------|--------|-------------|----------|----------|
| Page Title | 1.875/30 | 700 Bold | 1.2 | -0.02em | `text-3xl font-bold tracking-tight` |
| Section Heading | 1.25/20 | 600 Semi | 1.3 | -0.01em | `text-xl font-semibold` |
| **Hero Stat Number** | **3/48** | **700 Bold** | **1.0** | **-0.02em** | **`text-5xl font-bold tracking-tight tabular-nums`** |
| Stat Label | 0.875/14 | 500 Med | 1.4 | 0.01em | `text-sm font-medium tracking-wide` |
| Body | 1/16 | 400 Reg | 1.5 | 0 | `text-base` |
| Small / Caption | 0.875/14 | 400 Reg | 1.4 | 0 | `text-sm` |
| Button | 0.875/14 | 600 Semi | 1.0 | 0.01em | `text-sm font-semibold` |
| Input | 1/16 | 400 Reg | 1.5 | 0 | `text-base` (never smaller on mobile to prevent iOS zoom) |

**Rules:**
- Minimum font size: 14px. Nothing smaller, especially on mobile.
- Stat numbers at 48px are readable from 3 meters on a projector — critical for the mayor presentation.
- `text-base` (16px) on form inputs prevents iOS Safari from zooming on focus.

---

## 3. Main Page Wireframes

### Mobile (375px viewport)

```
+-----------------------------------+
|  712 Route          [Stats ->]    |  <- 48px thin header, white bg
+-----------------------------------+    semi-transparent or solid
|                                   |
|                                   |
|         GOOGLE MAP                |
|         (full viewport)           |
|                                   |
|     [3]----[4]----[5]            |  <- Blue numbered stop markers
|      |              |             |     on route polyline
|     [2]            [6]           |
|      |              |             |
|     [1]----START   [7]           |
|                     |             |
|                    ...            |
|                                   |
|  "127 riders submitted"          |  <- Subtle counter, bottom-left
|                                   |     above the CTA bar
+-----------------------------------+
| Where do you live?  [Submit ->]  |  <- 64px sticky bottom bar
+-----------------------------------+    blue bg, white text, always visible
```

**After tapping "Submit"** -- Bottom sheet slides up:

```
+-----------------------------------+
|  712 Route          [Stats ->]    |
+-----------------------------------+
|                                   |
|         GOOGLE MAP                |  <- Map still visible, dimmed
|         (partially visible)       |
|                                   |
+-----------------------------------+
|  ====  (drag handle)              |  <- Bottom sheet, 60% height
|                                   |
|  Help optimize the 712 route      |
|                                   |
|  +-----------------------------+  |
|  |  [G] Continue with Google   |  |  <- Google Sign-In button
|  +-----------------------------+  |     44px height minimum
|                                   |
|  --- or, if already signed in --- |
|                                   |
|  Your address in Tel Aviv         |  <- Label
|  +-----------------------------+  |
|  |  Start typing...            |  |  <- Google Places autocomplete
|  +-----------------------------+  |     dir="auto" for Hebrew
|                                   |
|  +-----------------------------+  |
|  |        Submit Address       |  |  <- Primary blue button
|  +-----------------------------+  |     full width, 48px height
|                                   |
+-----------------------------------+
```

**After submission** -- Sheet updates in place:

```
+-----------------------------------+
|  712 Route          [Stats ->]    |
+-----------------------------------+
|                                   |
|    MAP with:                      |
|    - Green pin at user address    |  <- Distinct from stop markers
|    - Dashed green line to         |
|      nearest stop                 |
|                                   |
+-----------------------------------+
|  ====  (drag handle)              |
|                                   |
|  [checkmark icon]                 |
|  Your nearest stop                |
|                                   |
|  Stop 7 — Rothschild Blvd        |  <- Bold, large
|  280m walking distance            |  <- Green if <400m
|                                   |
|  +---------+  +-----------------+ |
|  | [x] Done|  | Update Address  | |  <- Secondary actions
|  +---------+  +-----------------+ |
|                                   |
+-----------------------------------+
```

### Desktop (1280px+ viewport)

```
+------------------------------------------------------------------+
| [bus icon] 712 Route Optimization              [View Stats ->]   |
+------------------------------------------------------------------+
|                  |                                                |
|  LEFT SIDEBAR    |              GOOGLE MAP                       |
|  (360px wide)    |              (remaining width)                |
|                  |                                                |
|  Help optimize   |         [3]----[4]----[5]                    |
|  the 712 route   |          |              |                     |
|                  |         [2]            [6]                    |
|  [G] Sign in     |          |              |                     |
|  with Google     |         [1]----START   [7]                   |
|                  |                         |                     |
|  Your address    |                        ...                    |
|  in Tel Aviv     |                                               |
|  [_____________] |                                               |
|                  |                                               |
|  [Submit Addr ]  |         127 riders submitted                  |
|                  |                                                |
|  ----------      |                                                |
|  After submit:   |                                                |
|  Stop 7          |                                                |
|  280m walk       |                                                |
|                  |                                                |
+------------------------------------------------------------------+
```

**Desktop behavior:**
- Sidebar replaces bottom sheet. Always visible, no slide-up needed.
- Map fills the remaining viewport width.
- Sidebar has a subtle right border (`slate-200`).
- After submission, the result appears below the form in the same sidebar.

---

## 4. Stats Page Wireframes

### Mobile (375px viewport)

```
+-----------------------------------+
|  [<- Map]  712 Route              |  <- Back link to main page
+-----------------------------------+
|                                   |
|  Proposed Route for Bus 712       |  <- text-xl font-semibold
|  Tel Aviv Stops Optimization      |  <- text-sm text-slate-500
|                                   |
+-----------------------------------+
|                                   |
|  +------+  +------+  +------+   |  <- 3 stat cards in a row
|  | 127  |  | 320m |  |  84% |   |     Hero numbers: text-5xl
|  |Riders|  | Avg  |  |Within|   |     Labels: text-sm
|  |      |  | Walk |  | 400m |   |
|  +------+  +------+  +------+   |
|   (blue     (green    (green     |  <- Semantic color coding
|    bg)       bg)       bg)       |
|                                   |
+-----------------------------------+
|                                   |
|  Address Density & Stops          |  <- Section heading
|                                   |
|  +-------------------------------+|
|  |                               ||
|  |    HEATMAP                    ||  <- Google Map, 300px height
|  |    (density overlay           ||     on mobile
|  |     + numbered stops          ||
|  |     + route polyline)         ||
|  |                               ||
|  +-------------------------------+|
|                                   |
+-----------------------------------+
|                                   |
|  Route Comparison                 |
|                                   |
|  Current       Proposed           |
|  +----------+  +----------+      |  <- Two comparison cards
|  | 580m avg |  | 320m avg |      |     side by side
|  | 52%      |  | 84%      |      |
|  | coverage |  | coverage |      |
|  +----------+  +----------+      |
|   (muted)       (green accent)   |
|                                   |
+-----------------------------------+
|                                   |
|  Walking Distance Distribution    |
|                                   |
|  [BAR CHART]                      |  <- Simple horizontal bars
|  0-200m    ████████████  45       |     or vertical bar chart
|  200-400m  ██████████    38       |
|  400-600m  ████          15       |
|  600m+     ██            6        |
|                                   |
+-----------------------------------+
|                                   |
|  Based on 127 submissions         |  <- Footer metadata
|  Last updated: Feb 20, 2026       |
|  12 stops selected                |
|                                   |
|  712 Optimal Route                |  <- Subtle branding
+-----------------------------------+
```

### Desktop (1280px+ viewport) -- "The Presentation Slide"

The desktop stats page is designed to fit in a single viewport (1280x800) for screenshot/projector use.

```
+------------------------------------------------------------------+
|                                                                    |
|  Proposed Route for Bus 712                           [<- Map]    |
|  Tel Aviv Stops Optimization                                       |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  |                  |  |                  |  |                  | |
|  |       127        |  |      320m        |  |       84%        | |
|  |                  |  |                  |  |                  | |
|  |  Riders          |  |  Avg Walking     |  |  Within 400m     | |
|  |  Submitted       |  |  Distance        |  |  of a Stop       | |
|  +------------------+  +------------------+  +------------------+ |
|     (blue-50 bg)          (green-50 bg)        (green-50 bg)      |
|                                                                    |
+-----------------------------+--------------------------------------+
|                             |                                      |
|   HEATMAP                   |   Route Comparison                   |
|   (Google Map, ~500px       |                                      |
|    tall)                    |   Current Route    Proposed Route     |
|                             |   +-------------+  +-------------+   |
|   Address density overlay   |   |  580m avg   |  |  320m avg   |   |
|   + proposed stops          |   |  52%        |  |  84%        |   |
|   + route polyline          |   |  coverage   |  |  coverage   |   |
|                             |   +-------------+  +-------------+   |
|                             |                                      |
|                             |   Walking Distance Distribution      |
|                             |                                      |
|                             |   [VERTICAL BAR CHART]               |
|                             |   0-200 | 200-400 | 400-600 | 600+  |
|                             |                                      |
+-----------------------------+--------------------------------------+
|  Based on 127 submissions  |  12 stops selected  |  Feb 20, 2026  |
+-----------------------------+--------------------------------------+
```

**Desktop stats page layout details:**
- Max-width container: `max-w-6xl` (1152px) centered.
- Two-column layout below the hero stats: heatmap left (60%), data right (40%).
- Hero stat cards span full width in a 3-column grid.
- All content fits in one viewport at 1280x800 — no scrolling needed for the core story.
- White background throughout for projector/screenshot readability.
- The bar chart uses horizontal bars on mobile (better for narrow screens) and vertical bars on desktop.

---

## 5. Component Inventory

All components should be built with shadcn/ui + Tailwind. Components marked with (shadcn) have direct equivalents in the library.

### Layout Components

| Component | Description | Source |
|-----------|-------------|--------|
| **AppHeader** | Thin 48px header with logo text + nav link | Custom Tailwind |
| **SidePanel** | Desktop sidebar for the main page form (360px, left-docked) | Custom Tailwind |
| **BottomSheet** | Mobile slide-up drawer for the form | Vaul (drawer lib) or shadcn Sheet |
| **PageContainer** | Max-width centered container for stats page | Custom Tailwind (`max-w-6xl mx-auto`) |
| **SectionDivider** | Horizontal rule between stats page sections | Custom Tailwind |

### Map Components

| Component | Description | Source |
|-----------|-------------|--------|
| **RouteMap** | Full-viewport Google Map with route polyline | `@vis.gl/react-google-maps` |
| **StopMarker** | Numbered circle marker (blue fill, white number) | Custom SVG / `AdvancedMarker` |
| **UserPin** | Green pulsing dot for user's submitted address | Custom SVG / `AdvancedMarker` |
| **WalkingLine** | Dashed green polyline from address to nearest stop | Google Maps Polyline |
| **StopInfoBubble** | Popup on stop marker tap (stop name, cross streets) | `InfoWindow` from Maps API |
| **HeatmapOverlay** | Address density visualization on stats map | deck.gl HeatmapLayer (note: Google's native HeatmapLayer is deprecated May 2026, use deck.gl as replacement) |

### Form Components

| Component | Description | Source |
|-----------|-------------|--------|
| **GoogleSignInButton** | Standard Google sign-in button | NextAuth / Google Identity Services |
| **AddressInput** | Text input with Google Places autocomplete, `dir="auto"` | shadcn Input + Google Places API |
| **SubmitButton** | Primary CTA button, full width on mobile | shadcn Button |
| **InlineError** | Error message below input (e.g., "Tel Aviv addresses only") | Custom Tailwind |

### Stats Components

| Component | Description | Source |
|-----------|-------------|--------|
| **HeroStatCard** | Large stat number + label + semantic color bg | Custom Tailwind card |
| **ComparisonCard** | Before/after metric pair (current vs proposed route) | Custom Tailwind card |
| **DistributionChart** | Bar chart of walking distance buckets | Recharts `BarChart` |
| **MetadataFooter** | "Based on N submissions, last updated..." | Custom Tailwind |

### Feedback Components

| Component | Description | Source |
|-----------|-------------|--------|
| **SubmissionResult** | "Your nearest stop: Stop 7, 280m" result card | Custom Tailwind |
| **Toast** | Brief notification (e.g., "Address submitted") | shadcn Toast / Sonner |
| **LoadingSpinner** | Simple spinner for form submission | Custom Tailwind animation |

### Total: ~18 components

This is intentionally small. Most are thin wrappers around Tailwind markup, not heavy abstractions.

---

## 6. Animation Recommendations

Animations should be subtle and purposeful. Per Design Principle P2 (Civic Credibility): "No playful animations, no trendy gradients, no gimmicks."

### Recommended Animations

| Animation | Where | Library | Duration | Details |
|-----------|-------|---------|----------|---------|
| **Number counter** | Hero stat numbers on stats page | `number-flow` (React) | 800ms | Numbers count up from 0 when they enter the viewport. Uses spring physics for natural deceleration. Dependency-free, ~3KB. |
| **Bottom sheet slide** | Mobile form sheet | Vaul or CSS | 300ms | Slides up from bottom with slight spring. Standard mobile pattern. Vaul handles this natively with drag-to-dismiss. |
| **Route draw** | Map polyline on first load | Google Maps API | 1500ms | Polyline draws progressively from first to last stop. Achievable by incrementally adding points to the polyline path with `requestAnimationFrame`. No library needed. |
| **Walking line draw** | Dashed line after submission | Google Maps API | 500ms | Dashed line extends from user pin to nearest stop. Same technique as route draw. |
| **Fade in** | Stats page sections | CSS | 400ms | Sections fade in as they enter viewport. Use `IntersectionObserver` + CSS `opacity` transition. Zero dependencies. |
| **Card hover lift** | Stat cards on desktop | CSS | 150ms | Subtle `translateY(-2px)` + shadow increase on hover. Tailwind: `hover:-translate-y-0.5 hover:shadow-md transition-all` |
| **Marker drop** | Stop markers on map load | Google Maps API | 300ms | Markers drop in sequentially (50ms stagger between each). Built into `AdvancedMarker` animation options. |
| **Pulse** | User's address pin | CSS | 2s loop | Gentle pulsing ring around the green user pin. CSS `@keyframes` with scale + opacity. |

### Animations to AVOID

- Parallax scrolling
- Page transitions / route animations
- Bouncing or wobbling elements
- Confetti or celebration effects
- Loading skeleton screens (pages load fast enough)
- Animated gradients or backgrounds
- Scroll-hijacking

### Implementation Notes

- **number-flow**: Install via `npm install @number-flow/react`. Wraps a `<NumberFlow value={127} />` component. Animates automatically when value changes. Accessible (respects `prefers-reduced-motion`). Only 3KB gzipped.
- **Vaul**: For the bottom sheet drawer. Has built-in spring animation, snap points, drag-to-dismiss. If Vaul's unmaintained status is a concern, shadcn Sheet with CSS transitions works fine.
- **No Framer Motion / Motion needed**: The animations here are simple enough for CSS transitions and native browser APIs. Adding a 30KB animation library for a fade and a counter is not justified under Design Principle P7 (Free Means Lean).

---

## 7. Icon and Asset Recommendations

### Icon Library: Lucide Icons

**Why Lucide:**
- 1,688 icons, MIT licensed, free
- Tree-shakeable: only bundle the icons you import
- React package: `lucide-react`
- Clean, consistent 24px grid, 2px stroke weight
- Matches the professional/institutional aesthetic
- Made by the community that forked Feather Icons (same clean style, more icons)

**Specific icons needed:**

| Use | Lucide Icon Name | Where |
|-----|-----------------|-------|
| Bus / transit | `Bus` | Header logo area, stat labels |
| Map pin | `MapPin` | Address input icon |
| Navigation | `Navigation` | Walking direction indicator |
| Check | `CircleCheck` | Submission success |
| Arrow right | `ArrowRight` | CTA buttons, nav links |
| Chart | `BarChart3` | Stats page section header |
| Users | `Users` | "Riders submitted" stat |
| Route | `Route` | Route-related labels |
| Clock | `Clock` | "Last updated" metadata |
| External link | `ExternalLink` | "View Stats" link |
| X / Close | `X` | Sheet close button |
| Grip handle | `GripHorizontal` | Bottom sheet drag handle |
| Alert | `AlertCircle` | Error / validation states |
| Info | `Info` | Tooltip triggers |
| Walking | `Footprints` | Walking distance indicator |

**Why NOT other libraries:**
- Heroicons: Only 316 icons. Missing transit-specific icons (no bus). Made by Tailwind team but Lucide has better coverage.
- Phosphor: 9,000+ icons but many are duplicates across 6 weight variants. Larger bundle risk. Lucide is leaner.
- Tabler: Good but slightly less polished stroke consistency than Lucide.
- Font Awesome: Heavy, requires font loading, commercial for some icons.

### Map Markers: Custom SVG

Do not use default Google Maps pin markers. Custom SVGs for stops:

**Stop Marker (numbered circle):**
```svg
<svg width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
  <text x="16" y="21" text-anchor="middle" fill="#FFFFFF"
        font-family="Inter" font-size="14" font-weight="700">7</text>
</svg>
```
- 32x32px, meets 44px touch target with padding
- Blue fill matches primary color
- White stroke provides contrast against any map background
- White number centered inside

**User Address Pin:**
```svg
<svg width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8" fill="#16A34A" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
</svg>
```
- Green with white center dot
- Smaller than stop markers to avoid visual competition
- CSS pulse animation ring added around it

### Illustrations / Graphics

**Recommendation: None.** This project does not need illustrations.

- The map IS the visual. Adding illustrations competes with it.
- Civic/institutional tools do not use cartoon illustrations (undraw, humaaans, etc.).
- The heatmap provides visual richness on the stats page.
- If a loading state is needed, a simple spinner is sufficient.

### Favicon / Open Graph

- **Favicon:** A simplified 32x32 bus icon or the number "712" in a blue circle. Generate from the stop marker SVG.
- **Open Graph image:** Screenshot the stats page hero section (title + 3 stat cards) at 1200x630. This is what appears when the link is shared in WhatsApp/social media — exactly the right content to preview.

---

## 8. Responsive Breakpoints

Use Tailwind's default breakpoints:

| Breakpoint | Width | Layout Change |
|-----------|-------|---------------|
| Default (mobile) | 0-639px | Bottom sheet, stacked stat cards (1 row of 3 small cards), single-column stats |
| `sm` | 640px+ | Minor spacing adjustments |
| `md` | 768px+ | Stats page: 2-column layout (heatmap + data) |
| `lg` | 1024px+ | Main page: sidebar replaces bottom sheet. Stats: larger heatmap. |
| `xl` | 1280px+ | Max-width container kicks in. Full "presentation slide" stats layout. |

---

## 9. Spacing and Grid System

Consistent spacing using Tailwind's 4px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| `p-4` / `gap-4` | 16px | Default padding inside cards, gap between elements |
| `p-6` | 24px | Section padding on stats page |
| `p-8` | 32px | Stats page container horizontal padding (desktop) |
| `gap-3` | 12px | Gap between stat cards on mobile |
| `gap-6` | 24px | Gap between stat cards on desktop |
| `space-y-8` | 32px | Vertical spacing between stats page sections |

**Grid:**
- Stat cards: `grid grid-cols-3 gap-3 md:gap-6`
- Stats two-column: `grid md:grid-cols-5 gap-6` (3 cols map, 2 cols data)
- Form elements: `flex flex-col gap-4`

---

## 10. Interaction States

| Element | Default | Hover (desktop) | Active/Pressed | Focus | Disabled |
|---------|---------|-----------------|----------------|-------|----------|
| Primary Button | Blue 600 bg, white text | Blue 700 bg | Blue 800 bg, scale(0.98) | Blue 500 ring, 2px offset | Blue 300 bg, slate 400 text |
| Secondary Button | White bg, slate 300 border | Slate 50 bg | Slate 100 bg | Blue 500 ring | Slate 100 bg |
| Input | White bg, slate 200 border | Slate 300 border | - | Blue 500 ring, border changes to blue 500 | Slate 100 bg |
| Stat Card | White/blue-50 bg | translateY(-2px), shadow-md | - | - | - |
| Map Marker | Normal size | Scale 1.1, shadow | Opens info bubble | - | - |
| Link | Blue 600 text | Blue 700, underline | Blue 800 | Blue 500 ring | - |

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Color palette | Tailwind blue-600 primary, slate neutrals, green/amber/red semantic | Civic credibility, WCAG AA compliant, projector-friendly |
| Typography | Inter, single font family, tabular-nums for stats | Free, screen-optimized, Hebrew support, aligned numbers |
| Main page layout | Map full-viewport + bottom sheet (mobile) / sidebar (desktop) | Map-dominant per design brief, native mobile UX |
| Stats page layout | Hero stats + heatmap + comparison + chart, single-viewport on desktop | 5-second glanceable story, screenshot = presentation slide |
| Component count | ~18 components | Minimal set, avoids over-engineering |
| Animations | number-flow counters + CSS transitions + Maps API polyline draw | Subtle, purposeful, zero heavy dependencies |
| Icons | Lucide Icons (lucide-react) | 1,688 icons, tree-shakeable, MIT, transit icons available |
| Illustrations | None | Map IS the visual; illustrations would compete |
| Heatmap | deck.gl HeatmapLayer (Google's native layer deprecated May 2026) | Future-proof, integrates with @vis.gl/react-google-maps |
