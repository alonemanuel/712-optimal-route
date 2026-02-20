# Implementation Plan v1 — 712 Optimal Route

**Created:** 2026-02-20
**Phase:** Full-Stack Next.js Application Development
**Timeline Structure:** Phased milestones with clear dependency chains

---

## Overview

This document outlines the technical roadmap for building "712 Optimal Route" — a data-driven bus route optimization tool. The project consists of two pages (main map + stats), a submission system, a clustering algorithm, and real-time route visualization. Total estimated implementation: 4–6 weeks for MVP.

**Tech Stack (Finalized):**
- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes (Node.js)
- **Database:** Supabase (Postgres, Google OAuth, RLS)
- **Maps:** Google Maps JavaScript API + Google Places Autocomplete
- **Routing:** Google Directions API (snap to roads for realism)
- **Clustering:** skmeans client-side (K-means algorithm)
- **Charts:** Recharts
- **Bottom Sheet:** Vaul
- **Hosting:** Vercel
- **Cost:** $0/month (all free tiers)

---

## Architectural Decisions

### 1. Full-Stack Next.js (No Separate Backend)

**Why:**
- K-means clustering on 1000 2D points runs in <5ms in Node.js — no performance penalty
- Single codebase, simpler deployment, no CORS issues
- Vercel's serverless integrates seamlessly
- Reduces operational complexity for a one-person project

**Trade-off:** If request volume explodes (unlikely for a civic project), clustering can move to a scheduled job (webhook from Supabase on new submissions).

### 2. Google Maps as Single Provider

**Decision:** Use Google Maps for display AND Google Places Autocomplete + Google Directions API.

**Why (Updated from original stack):**
- Google Places Autocomplete provides superior address parsing for Hebrew/Israeli addresses
- Google Directions API snaps computed stop coordinates to actual road networks
- Single provider reduces integration complexity
- Free tier ($200/month credit) provides generous quota
- Better UX than manual lat/lng coordinates

**Geocoding Strategy:**
- User types address → Google Places Autocomplete → returns lat/lng (client-side)
- Seed data (CSV) → server-side Google Geocoding API call
- Result: All addresses are validated and road-snapped before storage

### 3. Route Snapping to Roads

**Decision:** Computed cluster centers are snapped to nearest road via Google Directions API.

**Why:**
- Raw cluster centroids may point to buildings, parks, or water
- Mayor presentation is more credible if stops are on actual streets
- Google Directions API is free for first 25,000 requests/day
- Snapping adds <1s latency per route computation

**Algorithm Flow:**
1. K-means clusters → K centroids (lat/lng)
2. For each centroid: call Google Directions API → snap to nearest road
3. Order snapped stops via nearest-neighbor heuristic
4. Compute metrics (avg walk distance, coverage %)
5. Cache result

### 4. Address Validation: Greater Tel Aviv Area

**Decision:** Accept addresses in the Greater Tel Aviv Metropolitan Area (not strict city boundaries).

**Why:**
- Some riders live in adjacent areas but still use Bus 712
- Algorithm handles outliers gracefully (won't skew clustering if one address is far out)
- Reduces friction for users (no "address not in Tel Aviv" error)
- Simpler to implement than strict boundary checking

**Implementation:**
- Server-side: Check geocoded lat/lng is within bounding box of Greater Tel Aviv
- Bounding box: ~TBD (team to confirm exact coords)
- Reject addresses outside with clear error message

---

## Project Phases

### Phase 1: Project Setup & Infrastructure (Week 1)

**Goal:** Scaffold the app, set up hosting, database, and auth.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Create Next.js project | `create-next-app --typescript --tailwind` | None | 30 min |
| Configure Vercel | Connect GitHub repo, set environment variables, deploy main branch | Next.js project | 30 min |
| Set up Supabase | Create free tier project, create `submissions` & `cached_routes` tables | None | 45 min |
| Supabase Auth (Google OAuth) | Configure Google OAuth provider, get client/secret | Supabase project | 30 min |
| Environment variables | `.env.local` with Supabase, Google Maps keys | Supabase, Next.js | 15 min |
| Tailwind + shadcn/ui | Initialize Tailwind, install shadcn/ui components, configure paths | Next.js project | 30 min |
| TypeScript config | Strict mode, path aliases, linting (ESLint) | Next.js project | 30 min |
| Database schema | Create `submissions` and `cached_routes` tables with indexes | Supabase project | 45 min |
| RLS policies | Row-level security: users can only see their own submissions | Supabase tables | 30 min |

**Deliverables:**
- Vercel deployment running (blank Next.js app)
- Supabase database initialized with schema
- Google OAuth working (users can sign in)
- `.env.local` configured locally
- Tailwind + shadcn/ui ready

**Blockers:** None
**Risk:** Google OAuth credentials — ensure "Authorized JavaScript origins" includes localhost + Vercel domain

---

### Phase 2: Address Submission System (Week 1-2)

**Goal:** Users can submit addresses via Google Places Autocomplete; results stored with one-per-user enforcement.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Google Maps API setup | Get API keys, enable Google Maps JS + Places + Geocoding APIs | Google Cloud project | 30 min |
| AddressInput component | Integrates Google Places Autocomplete, returns lat/lng | Tailwind + shadcn/ui | 1.5 hrs |
| Address validation | Server-side: check lat/lng is within Greater Tel Aviv bounds | Google Geocoding API keys | 1 hr |
| Submission API route | `POST /api/submissions` — validates, stores in Supabase, enforces unique google_user_id | Database schema + RLS | 1.5 hrs |
| Update submission flow | Allow users to re-submit (update their address) | Submission API | 45 min |
| Form UI (bottom sheet on mobile) | Vaul bottom sheet with Google sign-in + address input + submit button | AddressInput + Vaul | 1.5 hrs |
| Submission feedback | After submit: show "Your nearest stop: X — Ym" message | Submissions API | 45 min |
| Error handling | Addresses outside Greater Tel Aviv → inline error | Validation logic | 30 min |
| Mobile responsiveness | Test on iPhone/Android, adjust touch targets (44px minimum) | Form UI | 1 hr |

**Deliverables:**
- Users can sign in with Google
- Users can submit one address via Google Places Autocomplete
- Address validation works (rejects non-Tel Aviv addresses)
- One-submission-per-user enforced via RLS + unique constraint
- Submissions table populated with test data
- Mobile form UX complete

**Blockers:** Google OAuth must be working (Phase 1)
**Risk:** Google Places Autocomplete may have latency on slow networks — add loading states

---

### Phase 3: Route Optimization Algorithm (Week 2)

**Goal:** Implement K-means clustering, stop selection, nearest-neighbor TSP, and metrics computation.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Install skmeans | `npm install skmeans` | None | 5 min |
| K-means wrapper | TypeScript function: takes submission array, returns K clusters | skmeans library | 45 min |
| Distance metrics | Haversine distance (lat/lng → meters) | None | 30 min |
| Stop snapping (Google Directions) | For each cluster centroid: call Google Directions API → nearest road | Google API keys | 1.5 hrs |
| Nearest-neighbor TSP | Order K stops to minimize total polyline distance | Distance metrics | 1 hr |
| Metrics computation | Avg walk distance, coverage % (riders within 400m), outlier detection | Distance metrics | 1 hr |
| K-sweep | Try K=5..15, return best by coverage OR avg distance | All above | 1 hr |
| Caching strategy | Store best route in `cached_routes` table, invalidate on new submission (debounced) | Database | 1 hr |
| Debounce logic | Group submissions: recompute route only after 30-60s idle | API route | 30 min |

**Deliverables:**
- Standalone TypeScript function `computeOptimalRoute(submissions: Submission[]) → Route`
- Routes cached in database
- Debounce prevents excessive recomputation
- Metrics accurate (testable with synthetic data)

**Blockers:** Google Directions API credentials (Phase 1)
**Risk:**
- Google Directions API rate limits — may need caching if thousands of submissions
- Haversine approximation acceptable for <10km distances (Tel Aviv is ~15km across)

---

### Phase 4: Map Visualization (Week 2-3)

**Goal:** Display route on Google Map, show stop markers, allow interaction.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Google Maps component | Wrapper around Google Maps JS API, loads in Next.js | Google Maps JS API key | 1 hr |
| Route polyline | Fetch cached route from Supabase, draw polyline on map | Map component + cached_routes table | 45 min |
| Stop markers | Custom SVG markers for stops (numbered circles), click to show info | Map component | 1 hr |
| Stop info bubble | On marker click: show cross streets, stop label, walking times to nearby addresses | Stop markers | 45 min |
| User's address marker | After submission: show user's address as distinct pin, draw walking line to nearest stop | Address submission + Map | 1 hr |
| Live route updates | When new submission arrives, refetch route and re-render polyline | Submission API + debounce | 1.5 hrs |
| Mobile map interaction | Touch gestures, zoom/pan, prevent dragging conflicts with bottom sheet | Mobile responsiveness | 1 hr |
| Heatmap overlay (future) | Placeholder for stats page heatmap | None | 0 min |
| Map styling | Transit-blue color scheme, professional appearance | Tailwind palette | 30 min |

**Deliverables:**
- Main page: full-viewport map with current route
- Stop markers interactive (click for info)
- User's address shows after submission (personal relevance)
- Route updates live as submissions come in
- Mobile-friendly map interactions

**Blockers:** Phase 3 (route caching), Phase 2 (address submission)
**Risk:** Google Maps JS API loading — add error boundary, graceful fallback if unavailable

---

### Phase 5: Stats Page (Week 3)

**Goal:** Build `/stats` page with hero metrics, heatmap, before/after comparison, and distribution chart.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Stats page layout | Responsive grid: hero stats (top) + heatmap (left) + comparison (right) | Tailwind grid | 1 hr |
| Hero stat cards | Display: total submissions, avg walk distance, coverage % | Supabase data | 1 hr |
| number-flow animation | Counter animation for hero stats (count from 0) | number-flow library | 45 min |
| Heatmap component | Google Map with HeatmapLayer overlay of address density | Google Maps Heatmap API | 1.5 hrs |
| Proposed route overlay | Draw stops + polyline on top of heatmap | Map component + cached_routes | 45 min |
| Before/after comparison | Two-column metric cards: current route vs. proposed | Comparison data (TBD) | 1 hr |
| Distribution chart | Bar chart: riders per distance bucket (0-200m, 200-400m, etc.) | Recharts | 1 hr |
| Metadata footer | "Based on N submissions. Last updated: [timestamp]. K stops selected." | Database queries | 30 min |
| Public (no auth) | `/stats` accessible without login | Supabase RLS | 30 min |
| Projector-ready styling | Large fonts (48px hero), high contrast, white background | Tailwind + design brief | 1 hr |
| Responsive design | Works on mobile (vertical scroll) and desktop (1280x800 single screen) | CSS media queries | 1 hr |

**Deliverables:**
- Stats page complete and public
- Real-time metrics from database
- Heatmap visual (most persuasive element for mayor)
- Before/after comparison (if baseline data available)
- Distribution chart shows walking distance spread

**Blockers:** Phase 3 (metrics), Phase 4 (map API integration)
**Risk:** Before/after comparison requires baseline data for current route — may need to estimate or skip for MVP

---

### Phase 6: Seed Data & Data Migration (Week 3-4)

**Goal:** Import existing Google Sheet data into Supabase.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Export Google Sheet | Export as CSV: columns = address text, any metadata | Google Sheet access | 15 min |
| Geocoding script | For each row: call Google Geocoding API → lat/lng | Google Geocoding API | 1.5 hrs |
| Data mapping | Map CSV columns to Submission table (assign placeholder google_user_id: `seed_<row>`) | CSV structure | 30 min |
| Validation | Verify geocoded results, reject rows that fall outside Greater Tel Aviv | Geocoding output | 1 hr |
| Supabase bulk insert | Insert rows into `submissions` table via API | Supabase API | 30 min |
| QA | Verify submission count, spot-check addresses on map | Submissions table | 1 hr |

**Deliverables:**
- Seed data loaded (if Google Sheet available)
- Stats page shows realistic submission count
- Route already computed and cached for presentation

**Blockers:** Access to Google Sheet, Google Geocoding API credits
**Risk:** If seed data is large (>5K rows), geocoding may take hours — run overnight, batch in groups

---

### Phase 7: Testing & QA (Week 4)

**Goal:** Test all features, fix bugs, validate edge cases.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Submission flow E2E | Test on iOS + Android: sign in → submit → see result | Phases 1-2 | 1 hr |
| Route computation | Test with varying submission counts (10, 100, 1000) — verify metrics are correct | Phase 3 | 1.5 hrs |
| Map rendering | Verify polyline draws, stops display correctly, heatmap renders | Phase 4-5 | 1 hr |
| Mobile responsiveness | Test on multiple device sizes (375px, 768px, 1200px) | All phases | 1.5 hrs |
| Address edge cases | Test addresses outside Greater Tel Aviv, Hebrew addresses, autocomplete failures | Phase 2 | 1 hr |
| Route edge cases | Test with 1 submission, 100 submissions, clustered submissions, outliers | Phase 3 | 1 hr |
| Performance | Measure: page load time (<3s mobile), route computation (<10s), API response times | All phases | 1.5 hrs |
| Accessibility | Keyboard navigation, screen reader, color contrast | All phases | 1 hr |
| API quota verification | Check actual Google Maps usage, confirm under limits | All phases | 30 min |
| Production deployment | Deploy to Vercel, verify all services | All phases | 1 hr |

**Deliverables:**
- Bug tracker updated with issues found
- Known limitations documented
- Performance benchmarks recorded

**Blockers:** All prior phases
**Risk:** Edge cases may reveal algorithm issues — allocate 2-3 days for debugging

---

### Phase 8: Polish & Presentation (Week 4-5)

**Goal:** Final touches, content, and mayor presentation readiness.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Typography & spacing | Ensure all fonts/sizes match design brief | Design decisions | 1 hr |
| Color consistency | Verify transit-blue palette applied throughout | Design decisions | 30 min |
| Error messages | Improve UX: clear, actionable error messages for all failure modes | All phases | 1 hr |
| Loading states | Add spinners/skeletons during: auth, submission, route recompute | All phases | 1 hr |
| Empty states | Handle: no submissions yet, route not computed, etc. | All phases | 1 hr |
| Help/documentation | Subtle inline help (tooltips, info bubbles) if needed | Design brief | 1 hr |
| SEO/meta tags | Title, description, og:image for sharing | Next.js metadata | 30 min |
| Analytics (optional) | Sentry error tracking, simple event logging for route computations | Sentry free tier | 1.5 hrs |
| Screenshots | Take high-res screenshots for documentation/social | All phases | 30 min |
| Dry run presentation | Test stats page on projector, verify readability | Stats page | 1 hr |

**Deliverables:**
- Polished, production-ready UI
- Stats page optimized for projection
- All edge cases handled gracefully
- Ready for mayor presentation

**Blockers:** All prior phases

---

### Phase 9: Launch & Iteration (Week 5+)

**Goal:** Deploy, share with riders, monitor, and iterate based on feedback.

#### Tasks

| Task | Details | Dependencies | Est. Time |
|------|---------|--------------|-----------|
| Deploy to production | Ensure Vercel is live, DNS configured (if custom domain) | All phases | 30 min |
| Social/WhatsApp launch | Share link with 712 rider community | Production deployment | 1 hr |
| Monitor submissions | Check daily: submission count, any errors in logs | Monitoring setup | 15 min/day |
| Monitor metrics | Route computation time, Google API usage, Supabase storage | Monitoring setup | 15 min/day |
| Iterate on feedback | Fix bugs, improve UX based on rider feedback | As reported | Variable |
| Prepare mayor presentation | Use stats page for slides, practice pitch | Phase 8 | 2-3 hrs |

**Deliverables:**
- Live product receiving real submissions
- Baseline metrics established for the mayor presentation

**Blockers:** All prior phases

---

## Dependency Graph

```
Phase 1: Setup & Infrastructure (Week 1)
    ↓
Phase 2: Address Submission (Week 1-2) ←┐
    ↓                                    │
Phase 3: Route Algorithm (Week 2) ──────┤
    ↓                                    │
Phase 4: Map Visualization (Week 2-3)   │
    ↓                                    │
Phase 5: Stats Page (Week 3) ───────────┤
    ↓                                    │
Phase 6: Seed Data (Week 3-4) ──────────┤
    ↓                                    │
Phase 7: Testing & QA (Week 4) ────────┤
    ↓                                    │
Phase 8: Polish & Presentation (Week 4-5)
    ↓
Phase 9: Launch & Iteration (Week 5+)
```

---

## Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **Google Maps API quota exceeded** | App stops working for new requests | Low (free tier is generous) | Monitor usage dashboard, cap requests if needed, pre-compute routes |
| **Address geocoding fails for Hebrew addresses** | Users can't submit addresses | Medium | Test extensively with Hebrew addresses, fall back to manual lat/lng input if needed |
| **Route algorithm produces nonsensical stops** | Loses credibility with mayor | Medium | Extensive testing with synthetic data, manual QA, parameter tuning (K values) |
| **Map renders slowly on mobile** | Poor UX, lost submissions | Low (Google Maps optimized) | Lazy-load heatmap, use map clustering for many submissions |
| **Supabase free tier storage exceeded** | Can't store new submissions | Very Low (500MB for 10K submissions) | Monitor storage, archive old data if needed |
| **Vercel deployment fails** | App offline | Very Low | Use GitHub Actions for CI/CD, test deployment locally first |
| **Google OAuth integration breaks** | Users can't authenticate | Very Low | Monitor auth logs, have fallback (e.g., email-based auth) |
| **Seed data geocoding takes too long** | Can't launch with realistic data | Medium | Batch geocoding, run overnight, show progress |
| **Performance: route computation >10s** | Stats page slow to update | Medium | Cache aggressively, offload to scheduled job if needed, use approximate algorithms |
| **Before/after baseline data unavailable** | Stats page incomplete for mayor pitch | Medium | Estimate current route metrics from industry data, or skip for MVP |

---

## Testing Strategy

### Unit Tests
- Haversine distance calculation (expected results for known coordinates)
- K-means clustering (verify centroids, convergence)
- Nearest-neighbor TSP (verify tour validity, no crossing)
- Metrics computation (avg distance, coverage %)

### Integration Tests
- Submission → database → route computation → stats page (end-to-end flow)
- Google Directions API snapping (verify valid lat/lng, on roads)
- Google Places Autocomplete → geocoding → validation

### E2E Tests (Manual / Automation)
- User flow: sign in → submit address → see route → view stats
- Route updates when new submission arrives
- Stats page displays correct metrics and heatmap
- Mobile responsiveness on iOS/Android

### Performance Tests
- Page load time (target: <3s on mobile)
- Route computation time (target: <10s for 1000 submissions)
- Google Maps API latency
- Supabase query performance

### Edge Cases
- Single submission (ensure K-means doesn't crash, handles degenerate case)
- 10,000 submissions (stress test clustering and map rendering)
- Addresses outside Greater Tel Aviv (should reject)
- Hebrew addresses with special characters
- Duplicate submissions from same user (should update, not create new)

---

## Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **Page load time** | <3s mobile, <1s desktop | Lighthouse, PageSpeed Insights |
| **Route computation** | <10s for 1000 submissions | Server logs, profiling |
| **Uptime** | 99.5% (Vercel SLA met) | Monitoring dashboard |
| **Address submission success rate** | >95% (failures logged, actionable errors) | Error logs, submission funnel |
| **Route quality** | Avg walk distance <400m for >80% of riders (estimate from seed data) | Metrics computation, manual inspection |
| **Mobile usability** | Form completable in <5 taps, on-thumb reachable | Usability testing, design brief compliance |
| **Stats page clarity** | Understandable within 5 seconds (no scrolling needed on desktop for hero metrics) | User testing, design brief compliance |
| **Free tier costs** | $0/month (no overages on Google APIs, Supabase, Vercel) | Cost monitoring dashboard |

---

## Known Open Questions (To Be Resolved)

1. **Baseline route data** — Do we have metrics for the current Bus 712 route (current avg walk distance, coverage %)? Needed for before/after comparison on stats page.
   - If **Yes:** Include baseline query in Phase 6
   - If **No:** Either estimate from public data or remove before/after comparison

2. **Highway on-ramp endpoint** — What are the exact coordinates of the Modi'in on-ramp where Bus 712 exits Tel Aviv?
   - **Action:** Get from city planning docs or route GPS data. Hardcode as `END_POINT = {lat, lng}` in algorithm.

3. **Greater Tel Aviv bounds** — What are the exact bounding box coordinates?
   - **Action:** Define bounds (e.g., `{minLat, maxLat, minLng, maxLng}`) before Phase 2 validation.

4. **K parameter sweep** — Which metric to optimize: minimize avg distance, or maximize coverage %?
   - **Current assumption:** Try all K=5..15, return best by coverage (80%+ riders within 400m).
   - **Alternative:** Let admin choose K manually via API parameter.
   - **Decision needed:** Get from product owner.

5. **Real-time vs. debounced updates** — Recompute route on every submission, or batch with 30-60s debounce?
   - **Current assumption:** Debounce 30-60s to avoid excessive computation.
   - **Trade-off:** Slight delay in map updates vs. reduced API calls.
   - **Decision needed:** Confirm with UX/product owner.

---

## Deliverables Checklist

- [ ] Phase 1: Vercel deployment + Supabase DB + Google OAuth working
- [ ] Phase 2: Address submission flow end-to-end (with validation)
- [ ] Phase 3: Route optimization algorithm + caching
- [ ] Phase 4: Interactive map with route visualization
- [ ] Phase 5: Stats page with hero metrics + heatmap
- [ ] Phase 6: Seed data loaded (if available)
- [ ] Phase 7: All tests passing, bugs fixed
- [ ] Phase 8: UI polished, presentation-ready
- [ ] Phase 9: Deployed to production, live submissions incoming

---

## Tools & Services Summary

| Service | Purpose | Free Tier | Limit | Risk |
|---------|---------|-----------|-------|------|
| **Vercel** | Hosting | 100 GB bandwidth/mo | Insufficient for DDoS but OK for organic traffic | Low |
| **Supabase** | Database + Auth | 500 MB storage, 50K MAU | Sufficient for 10K submissions | Very Low |
| **Google Maps JS API** | Map display | $200/mo free credit (~28K loads) | Generous for this project | Very Low |
| **Google Places Autocomplete** | Address input | Included in Maps API budget | Counted in API quota | Very Low |
| **Google Geocoding API** | Address → lat/lng | Included in Maps API budget | 25K requests/day | Very Low |
| **Google Directions API** | Road snapping | Included in Maps API budget | 25K requests/day | Low (may batch/cache) |
| **Sentry** | Error tracking | 5K errors/mo | Sufficient for small project | Very Low |
| **GitHub** | Code hosting | Unlimited | N/A | Very Low |

---

## Next Steps

1. **Confirm open questions** (Section: Known Open Questions)
2. **Create detailed backlog** (Task #6) — break phases into sprint-sized tasks
3. **Begin Phase 1** — set up Next.js, Supabase, deploy to Vercel
4. **Establish monitoring** — Sentry, logging, cost tracking

---

## Appendix: Technology Rationale

### Why Next.js (Not Django/Flask)?
- Algorithm is simple (K-means in <5ms) — no perf benefit to Python
- React ecosystem superior for maps (react-map-gl, Google Maps integrations)
- Single codebase, single deploy target (Vercel)
- No separate backend means less to maintain

### Why Google Maps (Not MapLibre/Leaflet)?
- **Google Places Autocomplete:** Best address parsing for Hebrew/Israeli addresses
- **Google Directions API:** Road snapping ensures credible stop placement for mayor
- **Free tier:** $200/mo credit is generous ($0 cost for our usage)
- **Familiar:** Works immediately, no setup complexity
- Trade-off: Locked into Google ecosystem (acceptable for MVP)

### Why Supabase (Not Neon/Turso)?
- **Auth included:** Google OAuth built-in, no extra service
- **RLS:** Row-level security enforces one-submission-per-user at database level
- **API:** PostgREST auto-generates REST endpoints (no custom backend needed)
- Trade-off: Postgres → not as suitable for time-series (but not needed here)

### Why skmeans Client-Side?
- K-means on 1000 points in browser: <5ms
- No need for backend compute
- Removes network latency (route recalculates instantly on new submission)
- Risk: Very large datasets (10K+ submissions) may slow browser, but unlikely for civic project

---

**Document Owner:** Implementation Lead
**Last Updated:** 2026-02-20
**Version:** 1.0
