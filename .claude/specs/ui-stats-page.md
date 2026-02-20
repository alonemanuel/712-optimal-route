# Stats Page Spec — `/stats`

**Parent:** `overview.md`
**PRD refs:** F7, F8
**Purpose:** A presentation-grade dashboard that makes the case for changing bus 712's route. Designed to convince the Modi'in mayor in under 30 seconds of viewing.

---

## 1. Page Purpose & Audience

The stats page is a **persuasion tool**, not an analytics dashboard. Every element answers one of three questions a city official asks:

1. **Is there real demand?** (submission count, growth over time)
2. **Does the new route help people?** (walk distance reduction, coverage)
3. **Is this proposal credible?** (data density heatmap, geographic spread)

The page is **public** — no authentication required. Anyone with the URL can view it. See [Section 10: Access Control](#10-access-control) for details.

---

## 2. Key Metrics

### 2.1 Hero Metric — Average Walk Distance Reduction

| Property | Value |
|----------|-------|
| **Label (HE)** | "מרחק הליכה ממוצע לתחנה" |
| **Label (EN)** | "Avg. walk to nearest stop" |
| **Calculation** | For each submission, compute haversine distance to nearest proposed stop. Average all values. |
| **Display format** | `XXX מ'` (meters, rounded to nearest 10). E.g., "280 מ'" |
| **Comparison** | Show current route's avg walk distance alongside, with delta. E.g., "280 מ' (במקום 520 מ' היום) — שיפור של 46%" |
| **"Good" threshold** | Under 400m is good. Under 300m is excellent. Color the metric green if <400m, yellow if 400-600m. |
| **Data source** | `computed_route.avg_walk_distance_m` for proposed; pre-computed constant for current route (based on same submissions against current stops) |

### 2.2 Coverage Percentage

| Property | Value |
|----------|-------|
| **Label (HE)** | "כיסוי — נוסעים עד 400 מ' מתחנה" |
| **Label (EN)** | "Coverage — riders within 400m of a stop" |
| **Calculation** | Count submissions with nearest-stop distance <= 400m, divide by total submissions, multiply by 100. |
| **Display format** | `XX%` — e.g., "87%" |
| **Comparison** | Show current route coverage alongside. E.g., "87% (במקום 54% היום)" |
| **"Good" threshold** | Above 80% is good (green). 60-80% is moderate (yellow). Below 60% is poor (red). |
| **Data source** | `computed_route.coverage_400m_pct` for proposed; pre-computed for current route |

### 2.3 Total Submissions

| Property | Value |
|----------|-------|
| **Label (HE)** | "נוסעים שהצביעו" |
| **Label (EN)** | "Riders who submitted" |
| **Calculation** | Count of all submissions (including seed data) |
| **Display format** | Whole number, with thousands separator. E.g., "1,247" |
| **No comparison** | This is absolute — there's no "current route" equivalent. |
| **"Good" threshold** | Higher is more credible. No color coding — just the number. But if <20, show a note: "עדיין אוספים נתונים" (Still collecting data). |
| **Data source** | `computed_route.total_submissions` |

### 2.4 Number of Stops

| Property | Value |
|----------|-------|
| **Label (HE)** | "תחנות מוצעות" |
| **Label (EN)** | "Proposed stops" |
| **Calculation** | Length of `computed_route.stops` array |
| **Display format** | Whole number. E.g., "8 תחנות" |
| **Context** | Show alongside: "הקו הנוכחי: 12 תחנות" (Current route: 12 stops) — to show the proposal is simpler or comparable |
| **Data source** | `computed_route.stops.length` |

### 2.5 Maximum Walk Distance (90th Percentile)

| Property | Value |
|----------|-------|
| **Label (HE)** | "90% מהנוסעים הולכים פחות מ-" |
| **Label (EN)** | "90% of riders walk less than" |
| **Calculation** | Sort all walk distances, take the value at the 90th percentile. |
| **Display format** | `XXX מ'` — e.g., "550 מ'" |
| **Why 90th not max** | Max would be an outlier in Herzliya. 90th percentile shows what the vast majority experience. |
| **Data source** | Computed on the fly from submissions + proposed stops |

---

## 3. Metric Cards Layout

Metrics are displayed as large, scannable cards. The hero metric gets the most visual weight.

### 3.1 Desktop Layout (min-width: 768px)

```
┌──────────────────────────────────────────────────────────────────┐
│                          כותרת ראשית                              │
│               "המסלול המוצע לקו 712 — בנתונים"                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              🟢  280 מ'                                     │  │
│  │         מרחק הליכה ממוצע לתחנה                              │  │
│  │      במקום 520 מ' היום — שיפור של 46%                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   87%        │ │   1,247      │ │  8 תחנות     │            │
│  │  כיסוי       │ │  נוסעים      │ │  מוצעות      │            │
│  │ (54% היום)   │ │  שהצביעו     │ │ (12 היום)    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  90% מהנוסעים הולכים פחות מ- 550 מ'                          ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile Layout (< 768px)

```
┌──────────────────────────┐
│      כותרת ראשית          │
│  "המסלול המוצע — בנתונים"  │
│                          │
│ ┌──────────────────────┐ │
│ │    🟢  280 מ'         │ │
│ │  מרחק הליכה ממוצע     │ │
│ │  שיפור של 46%         │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────┐┌──────────┐ │
│ │  87%     ││  1,247   │ │
│ │  כיסוי   ││  נוסעים  │ │
│ └──────────┘└──────────┘ │
│                          │
│ ┌──────────┐┌──────────┐ │
│ │ 8 תחנות  ││ 550 מ'   │ │
│ │ מוצעות   ││ מקסימום  │ │
│ └──────────┘└──────────┘ │
│                          │
│  [מפת חום ▼]             │
│                          │
└──────────────────────────┘
```

---

## 4. Heatmap Section

Below the metric cards, a full-width map section shows the geographic distribution of demand.

### 4.1 What It Shows

The heatmap visualizes **where riders live** as a density overlay on Google Maps. Dense areas glow hot (red/orange), sparse areas are cool (green/transparent). The proposed route is overlaid so the viewer can see that stops align with demand clusters.

### 4.2 Map Layers (Toggleable)

| Layer | Default | Description |
|-------|---------|-------------|
| **Heatmap** | ON | Density heatmap of all submission locations |
| **Proposed route** | ON | Polyline + stop markers for the optimized route |
| **Current route** | OFF | Polyline + stop markers for the existing 712 route (faded gray) |

Toggle controls appear as pill buttons above the map:

```
Desktop:
┌──────────────────────────────────────────────────────────────────┐
│  [● מפת חום]  [● מסלול מוצע]  [○ מסלול נוכחי]                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │                                                              │ │
│ │                    Google Map                                │ │
│ │              (heatmap + route overlay)                       │ │
│ │                                                              │ │
│ │                     400px height                             │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────┐
│ [● חום] [● מוצע] [○ נוכחי]│
│ ┌──────────────────────┐ │
│ │                      │ │
│ │     Google Map       │ │
│ │   300px height       │ │
│ │                      │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### 4.3 Heatmap Configuration

| Property | Value |
|----------|-------|
| **Data points** | All submission lat/lng coordinates |
| **Radius** | 25px (adjustable based on zoom) |
| **Gradient** | Transparent → green → yellow → orange → red |
| **Opacity** | 0.6 (so map underneath is visible) |
| **Max intensity** | Auto-scaled based on densest cluster |
| **Dissipating** | Yes — radius shrinks as you zoom in for precision |

### 4.4 Route Overlay

| Element | Proposed Route | Current Route |
|---------|---------------|---------------|
| **Polyline color** | `#2563EB` (blue) | `#9CA3AF` (gray) |
| **Polyline weight** | 4px | 3px |
| **Polyline opacity** | 1.0 | 0.5 |
| **Stop markers** | Blue circle with white number (1, 2, 3...) | Gray circle, no number |
| **Endpoint marker** | Highway icon at La Guardia / Kibbutz Galuyot | Same |

### 4.5 Map Interaction

- **Zoom:** Mouse wheel / pinch. Default zoom level fits all submissions.
- **Pan:** Drag.
- **Tap stop marker:** Tooltip shows stop label (street name or area) and how many riders are within 400m of that stop.
- **No submission form** on this page — the map is read-only.

### 4.6 Initial Map View

Map auto-fits bounds to include all submission coordinates with padding. If current route toggle is on, bounds expand to include current route stops too.

---

## 5. Before/After Comparison Section

Below the heatmap, an optional "before vs. after" summary strip reinforces the message. This is the "close" — the last thing the mayor sees before deciding.

### 5.1 Layout

```
Desktop:
┌──────────────────────────────────────────────────────────────────┐
│                      לפני ← אחרי                                 │
│                                                                  │
│  ┌─────────── היום ──────────┐  ┌──────── המסלול המוצע ────────┐ │
│  │  מרחק ממוצע: 520 מ'       │  │  מרחק ממוצע: 280 מ'         │ │
│  │  כיסוי: 54%               │  │  כיסוי: 87%                 │ │
│  │  תחנות: 12                │  │  תחנות: 8                   │ │
│  └───────────────────────────┘  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────┐
│       לפני ← אחרי        │
│                          │
│  ┌─── היום ────────────┐ │
│  │ מרחק: 520 מ'        │ │
│  │ כיסוי: 54%          │ │
│  │ תחנות: 12           │ │
│  └─────────────────────┘ │
│          ▼               │
│  ┌─── מוצע ────────────┐ │
│  │ מרחק: 280 מ'  ✓     │ │
│  │ כיסוי: 87%    ✓     │ │
│  │ תחנות: 8      ✓     │ │
│  └─────────────────────┘ │
└──────────────────────────┘
```

The "proposed" column uses green checkmarks or arrows to indicate improvement direction.

---

## 6. Page States

### 6.1 Loaded (Normal)

All metrics display with data. Heatmap renders. This is the state shown in wireframes above.

### 6.2 Loading

```
┌──────────────────────────┐
│      כותרת ראשית          │
│                          │
│ ┌──────────────────────┐ │
│ │   ████████           │ │  ← skeleton pulse (hero metric)
│ │   ██████████████     │ │
│ └──────────────────────┘ │
│                          │
│ ┌────────┐ ┌────────┐   │
│ │ ██████ │ │ ██████ │   │  ← skeleton pulse (secondary metrics)
│ └────────┘ └────────┘   │
│                          │
│ ┌──────────────────────┐ │
│ │                      │ │
│ │  [spinner]           │ │  ← map area with loading spinner
│ │  טוען מפה...          │ │
│ │                      │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

- Metric cards show skeleton placeholders (pulsing gray blocks).
- Map area shows a centered spinner with "טוען מפה..." text.
- Loading state should last <2s for metrics (they come from cached route data) and <3s for map.

### 6.3 No Data (Zero Submissions)

This state occurs if the database is empty (before seed import or in a fresh environment).

```
┌──────────────────────────┐
│      כותרת ראשית          │
│                          │
│ ┌──────────────────────┐ │
│ │                      │ │
│ │   אין נתונים עדיין    │ │
│ │   כשנוסעים ישלחו      │ │
│ │   כתובות, הנתונים     │ │
│ │   יופיעו כאן          │ │
│ │                      │ │
│ │   [שליחת כתובת →]     │ │  ← link to main page
│ │                      │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

- All metric cards are hidden.
- Single centered message with a CTA link to the main page.
- Heatmap section is hidden.

### 6.4 Sparse Data (< 20 Submissions)

Data exists but is too thin for confident metrics.

```
┌──────────────────────────────┐
│         כותרת ראשית           │
│                              │
│  ⚠ מבוסס על 12 נוסעים בלבד   │  ← yellow banner
│                              │
│  ┌────────────────────────┐  │
│  │    320 מ'               │  │  ← metrics display normally
│  │   מרחק הליכה ממוצע      │  │
│  └────────────────────────┘  │
│                              │
│  ... (rest of metrics)       │
│                              │
│  ┌────────────────────────┐  │
│  │   Heatmap (sparse)     │  │  ← heatmap shows but is visibly sparse
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- Yellow warning banner at top: "מבוסס על {N} נוסעים בלבד — ככל שיותר נוסעים ישתתפו, הנתונים ישתפרו" (Based on only N riders — as more participate, the data improves).
- All metrics still display. No data is hidden.
- Heatmap renders normally (it will just be sparse — that's fine and honest).

### 6.5 Error State

API call fails or route data is unavailable.

```
┌──────────────────────────┐
│      כותרת ראשית          │
│                          │
│ ┌──────────────────────┐ │
│ │                      │ │
│ │   שגיאה בטעינת נתונים │ │
│ │   נסו שוב מאוחר יותר  │ │
│ │                      │ │
│ │   [נסו שוב]          │ │  ← retry button
│ │                      │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

- Centered error message with retry button.
- Retry re-fetches all data.

---

## 7. Current Route Baseline Data

To show "improvement," we need baseline metrics for the **current** 712 route. This data is pre-computed and stored as a static constant (the current route doesn't change).

### 7.1 Required Baseline Values

| Value | How to obtain |
|-------|---------------|
| Current stop locations | Manually collected from bus 712 schedule / transit data |
| Current avg walk distance | Computed: for each submission, haversine to nearest *current* stop, averaged |
| Current coverage (400m) | Computed: % of submissions within 400m of a *current* stop |
| Current stop count | Manually counted |

### 7.2 Recomputation

The "current route" baseline metrics are **recomputed whenever the route is recalculated** (since they depend on the same set of submissions). They are NOT static — the current route's stops are fixed, but the walk distances change as new submissions come in.

Store alongside the computed route:
- `current_avg_walk_distance_m`
- `current_coverage_400m_pct`
- `current_stop_count` (static)

---

## 8. Export & Share Features

The stats page must be shareable — the mayor might receive a link, or someone might screenshot it for a WhatsApp group.

### 8.1 Screenshot-Friendly Layout

- All critical information is **above the fold** on desktop (metrics + beginning of heatmap).
- No elements that break on screenshot: no infinite scroll, no critical hover states, no modals.
- White background. High contrast text. No subtle grays for important numbers.
- Metrics use large font sizes (hero: 48px+, secondary: 32px+) so they're readable in compressed screenshots.

### 8.2 Print / Presentation Mode

A "presentation mode" button in the page header produces a clean, print-optimized view.

**Trigger:** Button labeled "מצב מצגת" (Presentation Mode) in top-right corner.

**What it does:**
- Hides the navigation header and any non-essential UI (toggle buttons, interactive controls).
- Expands the map to fill more width.
- Adds a footer: "712 — מסלול מותאם לנוסעים | [URL]" with a small project logo/title.
- Optimized for `@media print` — all metrics and the map render cleanly on A4/Letter.
- Uses `print-color-adjust: exact` to preserve colors and heatmap in print.

**Wireframe (Presentation Mode — Desktop):**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                 המסלול המוצע לקו 712 — בנתונים                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      280 מ'                                │  │
│  │              מרחק הליכה ממוצע לתחנה                         │  │
│  │          במקום 520 מ' היום — שיפור של 46%                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│     87% כיסוי       1,247 נוסעים       8 תחנות                   │
│    (54% היום)                         (12 היום)                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │                   Heatmap + Route                          │  │
│  │                   (500px height)                           │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  712 — מסלול מותאם לנוסעים | route712.example.com               │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 Share URL

The stats page URL (`/stats`) is stable and shareable. No query parameters needed — it always shows the latest computed route.

Consider adding Open Graph meta tags for social sharing:
- `og:title`: "קו 712 — מסלול מותאם לנוסעים"
- `og:description`: "1,247 נוסעים, 87% כיסוי, מרחק הליכה ממוצע 280 מ'"
- `og:image`: A static or server-rendered snapshot of the metrics (nice-to-have, not required for MVP)

Dynamic OG description (using latest metrics) is a nice-to-have. Static fallback: "כלי מבוסס נתונים לשיפור תחנות קו 712 בתל אביב".

---

## 9. Data Flow

### 9.1 API Calls on Page Load

The stats page makes a single API call:

```
GET /api/route
```

Returns the latest computed route object, which contains everything the stats page needs:
- `stops` (array)
- `avg_walk_distance_m`
- `coverage_400m_pct`
- `total_submissions`
- `computed_at`
- `current_avg_walk_distance_m` (baseline)
- `current_coverage_400m_pct` (baseline)
- `current_stop_count` (baseline)

For the heatmap, a second call fetches submission coordinates:

```
GET /api/submissions/locations
```

Returns an array of `{lat, lng}` — no PII, just coordinates for heatmap rendering. This endpoint should be lightweight and cacheable.

For the 90th percentile metric, it's either:
- Returned by the route API (precomputed), or
- Computed client-side from the submissions locations + stops (fine for <10K points)

**Recommendation:** Precompute and include in the route object as `p90_walk_distance_m`.

### 9.2 Caching

- Route data changes only on recalculation (debounced after submissions). Cache aggressively — `Cache-Control: public, max-age=60`.
- Submission locations change on new submissions. Cache with shorter TTL — `max-age=30`.
- The page does NOT auto-refresh. Data is fetched once on load. If the user wants fresh data, they reload the page.

---

## 10. Access Control

### 10.1 Public Page

The stats page is **public** — no login required. The URL is not guessable (it's just `/stats`), but there's no need to hide it.

### 10.2 Unlisted Option (Future)

If the admin wants to share stats before going public, an unlisted URL scheme could be added: `/stats?key=<random-token>`. The page would return 404 without a valid key. This is NOT in the MVP — mention it as a future option only.

---

## 11. RTL & Language

### 11.1 Direction

The entire page is RTL (`dir="rtl"`). Numbers display LTR within the RTL context (this is standard browser behavior for `direction: rtl`).

### 11.2 All User-Facing Strings

| Key | Hebrew | Context |
|-----|--------|---------|
| page_title | "קו 712 — נתונים" | Browser tab title |
| main_heading | "המסלול המוצע לקו 712 — בנתונים" | Page heading |
| main_heading_mobile | "המסלול המוצע — בנתונים" | Shorter heading for mobile |
| avg_walk_label | "מרחק הליכה ממוצע לתחנה" | Hero metric label |
| avg_walk_comparison | "במקום {current} מ' היום — שיפור של {pct}%" | Hero metric comparison |
| coverage_label | "כיסוי — נוסעים עד 400 מ' מתחנה" | Coverage label |
| coverage_comparison | "({current}% היום)" | Coverage comparison |
| submissions_label | "נוסעים שהצביעו" | Submission count label |
| stops_label | "תחנות מוצעות" | Stop count label |
| stops_comparison | "({current} היום)" | Stop count comparison |
| p90_label | "90% מהנוסעים הולכים פחות מ-" | 90th percentile label |
| sparse_warning | "מבוסס על {n} נוסעים בלבד — ככל שיותר נוסעים ישתתפו, הנתונים ישתפרו" | Sparse data banner |
| no_data_title | "אין נתונים עדיין" | No data heading |
| no_data_body | "כשנוסעים ישלחו כתובות, הנתונים יופיעו כאן" | No data body |
| no_data_cta | "שליחת כתובת" | No data CTA |
| error_title | "שגיאה בטעינת נתונים" | Error heading |
| error_body | "נסו שוב מאוחר יותר" | Error body |
| error_retry | "נסו שוב" | Retry button |
| toggle_heatmap | "מפת חום" | Heatmap toggle |
| toggle_proposed | "מסלול מוצע" | Proposed route toggle |
| toggle_current | "מסלול נוכחי" | Current route toggle |
| presentation_btn | "מצב מצגת" | Presentation mode button |
| before_label | "היום" | Before/after: current |
| after_label | "המסלול המוצע" | Before/after: proposed |
| before_after_heading | "לפני ← אחרי" | Before/after section title |
| map_loading | "טוען מפה..." | Map loading text |
| meters_unit | "מ'" | Meters abbreviation |
| stops_unit | "תחנות" | Stops unit |
| footer_text | "712 — מסלול מותאם לנוסעים" | Presentation mode footer |
| still_collecting | "עדיין אוספים נתונים" | Shown when submissions < 20 |

---

## 12. Visual Design Tokens

Not a full design system — just the values needed for implementation.

| Token | Value | Usage |
|-------|-------|-------|
| `color-good` | `#16A34A` (green-600) | Metric at or above "good" threshold |
| `color-moderate` | `#CA8A04` (yellow-600) | Metric in moderate range |
| `color-poor` | `#DC2626` (red-600) | Metric below threshold |
| `color-proposed-route` | `#2563EB` (blue-600) | Proposed route polyline |
| `color-current-route` | `#9CA3AF` (gray-400) | Current route polyline |
| `color-surface` | `#FFFFFF` | Page & card background |
| `color-text-primary` | `#111827` (gray-900) | Main text |
| `color-text-secondary` | `#6B7280` (gray-500) | Labels, comparisons |
| `font-hero-metric` | 48px / bold | Hero metric value |
| `font-secondary-metric` | 32px / bold | Secondary metric values |
| `font-metric-label` | 16px / medium | Metric labels |
| `font-comparison` | 14px / regular | Comparison text |
| `card-radius` | 12px | Metric card border radius |
| `card-shadow` | `0 1px 3px rgba(0,0,0,0.1)` | Metric card shadow |
| `card-padding` | 24px | Metric card internal padding |
| `section-gap` | 32px | Gap between major sections |

---

## 13. Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `< 768px` (mobile) | Single column. 2x2 grid for secondary metrics. Map 300px tall. Shorter heading. |
| `>= 768px` (desktop) | Hero metric full-width. 3-column row for secondary metrics. Map 400px tall. Full heading. |

No tablet-specific breakpoint. 768px+ is "desktop."

---

## 14. Animations

Minimal. This is a data page, not a marketing site.

| Element | Animation |
|---------|-----------|
| Metrics on load | Counter "roll up" from 0 to final value over 800ms (eased). Numbers only — labels appear instantly. |
| Skeleton placeholders | Pulse (opacity 0.4 → 0.7, 1.5s loop) |
| Toggle buttons | Instant state change, no transition |
| Heatmap | Fades in over 300ms once loaded |

---

## 15. SEO & Meta

```html
<title>קו 712 — נתונים | מסלול מותאם לנוסעים</title>
<meta name="description" content="כלי מבוסס נתונים לשיפור תחנות קו 712 בתל אביב — מרחק הליכה, כיסוי, ומפת חום של ביקוש">
<meta name="robots" content="index, follow">
<meta property="og:title" content="קו 712 — מסלול מותאם לנוסעים">
<meta property="og:description" content="כלי מבוסס נתונים לשיפור תחנות קו 712 בתל אביב">
<meta property="og:type" content="website">
```

---

## 16. Acceptance Criteria

| # | Criterion |
|---|-----------|
| S1 | Page loads at `/stats` without authentication |
| S2 | Hero metric shows average walk distance with comparison to current route |
| S3 | Coverage, submission count, stop count, and P90 metrics all display correctly |
| S4 | Heatmap renders all submission locations as a density overlay |
| S5 | Proposed route polyline and stop markers are visible on the map |
| S6 | Current route can be toggled on/off via pill button |
| S7 | All toggle combinations work: heatmap on/off, proposed on/off, current on/off |
| S8 | No-data state shows empty message with link to main page |
| S9 | Sparse data state (<20 submissions) shows warning banner but all metrics |
| S10 | Loading state shows skeleton placeholders and map spinner |
| S11 | Error state shows retry button that re-fetches data |
| S12 | Presentation mode hides chrome and adds footer |
| S13 | Print CSS renders metrics and map cleanly on A4 |
| S14 | Before/after comparison section shows current vs. proposed side by side |
| S15 | All text is Hebrew, page direction is RTL |
| S16 | Mobile layout is single-column with 2x2 metric grid |
| S17 | Page loads in <3s on mobile (NF2) |
| S18 | Metric values animate (counter roll-up) on initial load |

---

## 17. Open Design Questions

These are product-level questions that should be resolved before or during implementation:

1. **Current route stop data** — Where do we source the exact current 712 stop locations in Tel Aviv? Manually from a transit app, or is there a GTFS feed?
2. **OG image** — Do we want a dynamically rendered social share image showing key metrics? This would require server-side rendering or a screenshot service. Probably not MVP.
3. **Data freshness indicator** — Should the page show "Last updated: 5 minutes ago" or similar? Could be useful for admin but might confuse the mayor.
4. **Stop labels** — What do we call each stop? Street name? Neighborhood? Algorithmic label ("Stop 3")?
