# Design Brief — 712 Optimal Route

**Author:** product-lead
**Date:** 2026-02-20

---

## 1. Design Principles

These seven principles should guide every design and engineering decision on the project.

### P1. Data Speaks First
The website exists to make a data-driven argument. Every element should reinforce the message: "Real riders submitted real addresses, and the math says this route is better." Numbers, maps, and coverage metrics should be front and center — not buried behind interactions.

### P2. Civic Credibility
This is going in front of a mayor, not a startup demo day. The visual language should feel institutional, trustworthy, and professional — closer to a government transportation report than a consumer app. No playful animations, no trendy gradients, no gimmicks. Clean typography, transit-blue palette, generous whitespace.

### P3. Map Is the Product
The interactive map is the core artifact. Both pages are built around the map. On the main page, the map IS the page (everything else is an overlay). On the stats page, the heatmap is the visual centerpiece. Anything that obscures, shrinks, or competes with the map is wrong.

### P4. Mobile-First, One-Thumb Reachable
Most riders will submit their address from their phone, probably while on the bus. The entire submission flow must be completable one-handed on a phone screen. Bottom-anchored CTAs, bottom sheets for forms, large touch targets (44px minimum). Desktop is a secondary viewport, not an afterthought, but not the primary design target.

### P5. Zero Friction Submission
Every additional step between "rider opens the site" and "rider submits their address" is a lost submission. The goal is: land on the page, tap one button, sign in with Google, type address, submit. Five taps maximum. No onboarding, no explanations, no "learn more" gates. The map itself provides enough context.

### P6. Glanceable Stats
The stats page must tell its story in under 5 seconds. A mayor will not study charts — they will glance. The three hero metrics (riders submitted, average walking distance, coverage percentage) should be readable from across a conference table on a projected screen. Everything else is supporting detail.

### P7. Free Means Lean
The entire stack runs on free tiers. This constrains choices in a good way: no heavy libraries, no elaborate animations, no third-party services that add cost. Every dependency must justify its existence. When in doubt, use fewer tools.

---

## 2. User Journeys

### 2A. The Rider

**Who:** Lives in Tel Aviv, commutes to Modi'in on bus 712. Heard about the website from a WhatsApp group, a friend, or a social media post. Wants to improve the route.

**Context:** Probably opening the link on their phone, possibly while on the bus or at home. Has 60 seconds of attention.

**Journey:**

| Step | What happens | What they see | Design goal |
|------|-------------|---------------|-------------|
| 1. **Land** | Opens link from WhatsApp/social | Full-screen map of Tel Aviv with the proposed route drawn, stops numbered | Immediate orientation — "this is about a bus route in Tel Aviv" |
| 2. **Understand** | Sees the route and stop markers | Blue polyline with numbered stop circles, thin header with "712 Route Optimization" | No explanation needed — the map IS the explanation |
| 3. **Act** | Taps the bottom CTA button | Sticky bottom bar: "Where do you live? Help us optimize the route" | Single, obvious call to action |
| 4. **Authenticate** | Signs in with Google | Bottom sheet slides up with Google Sign-In button | One tap. Sheet keeps map visible behind it. |
| 5. **Submit** | Types their Tel Aviv address | Address input with Google Places autocomplete, submit button | Autocomplete reduces effort to 3-4 keystrokes |
| 6. **Confirm** | Sees their result | Sheet updates: "Your nearest stop: Stop 7 — 280m walking distance." A line on the map connects their address to the stop. | Personal relevance — "this affects me, and it's pretty close" |
| 7. **Done** | Swipes sheet down or closes tab | Map returns to full screen | No nag screens, no "share with friends" pop-ups. They can share organically if they want. |

**Edge cases:**
- Already submitted: Step 4 shows "You've already submitted [address]. Your nearest stop is X." with an option to update.
- Address outside Tel Aviv: Form shows inline error — "We're only collecting Tel Aviv addresses for the 712 route."
- Not on mobile: On desktop, the bottom sheet becomes a left sidebar panel. Same flow.

**Emotional arc:** Curious ("what's this?") -> Oriented ("oh, a route proposal") -> Engaged ("let me add my address") -> Satisfied ("my stop would be close, nice").

---

### 2B. The Admin (Project Owner)

**Who:** You — the person building this, collecting data, and preparing the mayor presentation.

**Context:** Checking submissions from laptop or phone, monitoring data growth, preparing for the pitch meeting.

**Journey:**

| Step | What happens | What they see | Design goal |
|------|-------------|---------------|-------------|
| 1. **Check growth** | Opens `/stats` page | Hero metrics: total submissions, average walk distance, coverage % | Instant pulse check — "are people submitting?" |
| 2. **Inspect density** | Scrolls to heatmap | Google Map with address density heatmap + proposed stops overlaid | Understand where riders cluster geographically |
| 3. **Validate route** | Checks if stops make sense | Numbered stops on the heatmap, route polyline | Sanity check — "does the algorithm output look reasonable?" |
| 4. **Compare** | Looks at before/after (if current route data exists) | Side-by-side comparison: current route metrics vs. proposed | Quantify the improvement for the pitch |
| 5. **Review distribution** | Checks the walking distance histogram | Bar chart of riders per distance bucket (0-200m, 200-400m, etc.) | Understand spread, not just average |
| 6. **Present** | Screenshots the stats page or shares the URL | Clean, white-background, screenshot-friendly layout | The page IS the presentation slide |

**Admin-only capabilities (not a separate admin panel):**
- Force route recomputation via an API call (not exposed in UI — use curl or a simple admin button if needed).
- Import seed data from the existing Google Sheet (a one-time script, not a UI feature).

**Note:** There is no separate admin dashboard. The admin uses the same website as everyone else. The stats page IS the admin view AND the presentation. This keeps the scope small and avoids building auth-gated admin pages.

---

### 2C. The Mayor / Decision-Maker

**Who:** Modi'in city official, transportation committee member, or their staff. Not technical. Evaluating whether this route proposal is worth acting on.

**Context:** Someone (the admin) shared a link or is presenting the stats page on a screen in a meeting. The mayor has 30 seconds of attention before deciding if this is serious.

**Journey:**

| Step | What happens | What they see | Design goal |
|------|-------------|---------------|-------------|
| 1. **See the headline** | Link opens to the stats page directly | Clean page header: "Proposed Route for Bus 712 — Tel Aviv Stops Optimization" | Immediate context — this is a transit proposal |
| 2. **Read the numbers** | Glances at hero metrics | Three large stat cards: "127 Riders Submitted", "320m Avg Walk", "84% Within 400m" | 5-second comprehension — big numbers, clear labels |
| 3. **See the map** | Sees the heatmap | Address density visualization with stops overlaid | Visual proof — "these are real people, distributed across Tel Aviv" |
| 4. **Understand the improvement** | Sees before/after comparison | Current route: 580m avg walk, 52% coverage. Proposed: 320m avg walk, 84% coverage. | The "sell" — clear, quantified improvement |
| 5. **Trust the data** | Sees submission count and timestamp | "Based on 127 rider submissions. Last updated: Feb 20, 2026" | Legitimacy — real data, recent, specific |
| 6. **Form opinion** | Scrolls slightly or asks questions | Walking distance distribution chart provides depth if needed | Supporting detail for those who want it |

**What the mayor should think:** "This isn't just someone's opinion. 127 real bus riders submitted their addresses. The data shows the current route makes people walk 580 meters on average. The proposed route cuts that to 320 meters and covers 84% of riders within a 5-minute walk. This is worth looking into."

**Critical UX for the mayor persona:**
- The stats page must work as a standalone artifact — no context from the main page needed.
- No login required to view. Public read-only.
- Must look professional on a projector (large fonts, high contrast, no clutter).
- Must load fast on a conference room WiFi.
- A clear, human-readable title — not "712 Optimal Route" but "Proposed Route for Bus 712 — Tel Aviv Stops Optimization."

---

## 3. Information Hierarchy

### 3A. Main Page (`/`)

**Priority 1 (the viewport) — What users see without any interaction:**
- Interactive map with the proposed route (polyline + numbered stop markers)
- Thin header: project name, link to stats page
- Bottom CTA bar: "Where do you live? Help optimize the route"

**Priority 2 (one tap away) — Inside the bottom sheet/side panel:**
- Google Sign-In button
- Address input with autocomplete
- Submit button
- After submission: "Your nearest stop is [X] — [Y]m walking distance" + line drawn on map

**Priority 3 (ambient/background) — Things present but not demanding attention:**
- Stop info bubbles (tap a stop marker to see cross streets)
- Submission count shown subtly in the header or bottom bar ("127 riders submitted")
- Link to /stats

**Not on this page:**
- Explanation of the project (the map IS the explanation)
- About page or mission statement
- Charts, stats, or data tables
- Social sharing buttons
- Footer with links

### 3B. Stats Page (`/stats`)

**Priority 1 (top of page, above the fold) — The 5-second story:**
- Page title: "Proposed Route for Bus 712 — Tel Aviv Stops Optimization"
- Three hero stat cards: Riders Submitted | Avg Walk Distance | Coverage Within 400m
- Conditional coloring: green for good metrics, amber for moderate

**Priority 2 (the visual proof) — First scroll:**
- Heatmap: Google Map with address density overlay + proposed stops
- This is the emotional centerpiece. Large (at least 400px tall, ideally more)

**Priority 3 (the argument) — Supporting data:**
- Before vs. After comparison (if current route data is available): two-column metric cards
- Walking distance distribution: bar chart showing rider counts per distance bucket

**Priority 4 (footer/metadata) — Credibility details:**
- "Based on [N] submissions. Last updated: [timestamp]"
- Number of stops selected by the algorithm
- Subtle branding: "712 Optimal Route"

---

## 4. "Wow Factor" Recommendations for the Mayor Presentation

These are the elements that elevate this from "a student project" to "a credible civic proposal."

### 4.1 The Heatmap
A heatmap of rider addresses overlaid on a real Google Map of Tel Aviv is visually striking. It shows real demand density — hot spots of riders who need this route — in a way no spreadsheet can. This is the single most persuasive visual element. Make it large, make it prominent.

### 4.2 Before vs. After Metrics
If the current route data is available (or can be estimated), a direct comparison is extremely powerful:
- "Current route: 580m average walk, 52% within 400m"
- "Proposed route: 320m average walk, 84% within 400m"

These two lines alone make the argument. Present them side by side with large, bold numbers.

### 4.3 Real Submission Count
"Based on 127 rider submissions" is more persuasive than any algorithm. It proves real people care enough to submit their address. The higher this number, the stronger the proposal. Display it prominently.

### 4.4 Professional Visual Language
- Transit-blue color palette (matches government transit materials worldwide)
- Inter font at readable sizes
- Clean white background with subtle card borders
- No flashy animations, gradients, or dark mode
- Looks like it could have been made by a transportation planning firm

### 4.5 Screenshot / Presentation Readiness
The stats page should be designed so that a screenshot of it IS a presentation slide. This means:
- All key information fits in one viewport on desktop (1200px height)
- White background (projects well in a lit conference room)
- Large fonts readable from 3 meters away on a projector
- No interactive elements needed to see the data (everything renders statically)
- A clear title that makes sense without context

### 4.6 Live Data
If the mayor visits the page themselves (or it's shown live in a meeting), seeing actual live data rather than a static mockup adds credibility. The map updates as submissions come in. The numbers are real. It's a working system, not a presentation.

---

## 5. Key UX Decisions

### 5.1 Language: English for v0
- **Decision:** English UI, with `dir="auto"` on the address input field so Hebrew addresses render correctly.
- **Rationale:** The stats page is data-heavy (numbers, maps, charts) and doesn't need Hebrew prose. The mayor presentation can be in English. Hebrew RTL support adds real complexity (layout mirroring, bidirectional text) for marginal benefit in v0.
- **Migration path:** If Hebrew is needed later, Tailwind's `rtl:` variants and i18next with ~30 strings makes it a small task.

### 5.2 Mobile Pattern: Bottom Sheet
- **Decision:** The address submission form lives in a bottom sheet on mobile, not a separate page.
- **Rationale:** Bottom sheets feel native on mobile (Google Maps, Uber, Waze). The map stays visible behind the sheet, maintaining spatial context. On desktop, the sheet becomes a left sidebar panel.

### 5.3 No Separate Admin Panel
- **Decision:** The admin uses the same pages as riders. The stats page serves double duty as the admin monitoring view and the mayor presentation.
- **Rationale:** Building a separate admin panel is scope creep for a project with one admin. Admin-only actions (force recompute, import seed data) are API calls, not UI features.

### 5.4 Stats Page Is Public
- **Decision:** The `/stats` page requires no authentication. Anyone with the link can view it.
- **Rationale:** The mayor and their staff need to access it directly. The data (aggregate stats, heatmap) is not sensitive. Requiring login would add friction to the most important persona's experience.

### 5.5 No Onboarding or Tutorial
- **Decision:** No walkthrough, tooltip tour, or "how it works" section. The user lands on the map and the CTA button is self-explanatory.
- **Rationale:** The product is simple enough that it shouldn't need explanation. A map with a route and a "Where do you live?" button is self-evident. Adding onboarding implies the design failed.

### 5.6 Submission Feedback Is Personal
- **Decision:** After submitting, the user sees THEIR nearest stop and THEIR walking distance, with a line drawn on the map from their address to the stop.
- **Rationale:** Personal relevance drives engagement. "Your nearest stop is 280m away" is more meaningful than "average walking distance: 320m." It turns an abstract civic tool into a personal result.

### 5.7 Address Validation: Tel Aviv Only
- **Decision:** Reject addresses outside Tel Aviv with a clear inline error message.
- **Rationale:** The 712 route optimization is for Tel Aviv stops only. Modi'in addresses are irrelevant and would skew the clustering. Validate server-side by checking the geocoded coordinates fall within Tel Aviv bounds.

### 5.8 No Dark Mode
- **Decision:** Light/white theme only.
- **Rationale:** The stats page must be screenshot-friendly and projector-friendly. Dark mode would require maintaining two themes for no audience benefit. Civic/government tools are universally light-themed.

---

## Summary

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Design language | Civic/institutional, transit-blue | Credibility for the mayor |
| Layout model | Map-dominant, full viewport | Map IS the product |
| Mobile pattern | Bottom sheet for form | Native feel, preserves map context |
| Stats layout | Hero metrics + heatmap + comparison + chart | 5-second story for decision-makers |
| Language | English v0, Hebrew later | Reduce complexity, data-heavy pages don't need it |
| Admin tools | No separate panel | One admin, API-level actions only |
| Stats access | Public, no login | Mayor must access without friction |
| Onboarding | None | Design should be self-explanatory |
| Feedback | Personal (your stop, your distance) | Drive engagement through relevance |
| Theme | Light only | Projector-ready, screenshot-friendly |
