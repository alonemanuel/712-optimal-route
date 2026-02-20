# Implementation Plan — 712 Optimal Route

**Created:** 2026-02-20
**Status:** Ready for implementation

This document outlines the technical roadmap for building the 712 Optimal Route application.

---

## Architecture Summary

**Stack:** Next.js 14+ (App Router) + Supabase (Auth + DB) + Google Maps
**Hosting:** Vercel (free tier)
**Cost:** $0/month

**Key Decisions:**
- ✅ Next.js Full-Stack (no separate Python backend)
- ✅ Google Maps (full solution - display + Places Autocomplete)
- ✅ Route follows actual roads (Google Directions API or OSRM)
- ✅ Accept Greater Tel Aviv area (not strict boundaries)

---

## Implementation Phases

### Phase 1: Project Foundation (Est: 2-3 hours)

**Goal:** Working Next.js app deployed to Vercel with Supabase connected

**Tasks:**
1. Initialize Next.js 14 with TypeScript + Tailwind
2. Set up Supabase project
3. Configure Google Cloud project for Maps API
4. Deploy to Vercel with environment variables
5. Set up basic project structure

**Deliverable:** Empty app running at `[project].vercel.app`

---

### Phase 2: Authentication & Database (Est: 3-4 hours)

**Goal:** Users can sign in with Google and submission table is ready

**Tasks:**
1. Configure Supabase Auth with Google OAuth
2. Create database schema (submissions, routes tables)
3. Set up Row Level Security (RLS) policies
4. Implement auth UI (sign-in button, user state)
5. Test sign-in flow end-to-end

**Deliverable:** Users can authenticate with Google account

**Schema:**
```sql
-- submissions table
id: uuid primary key
google_user_id: text unique not null
display_name: text
address_text: text
lat: float8
lng: float8
created_at: timestamptz

-- routes table (cached computed routes)
id: uuid primary key
stops: jsonb (array of {lat, lng, label})
polyline: text (encoded)
avg_walk_distance_m: float8
coverage_400m_pct: float8
total_submissions: int
computed_at: timestamptz
```

---

### Phase 3: Address Submission (Est: 4-5 hours)

**Goal:** Authenticated users can submit their address once

**Tasks:**
1. Integrate Google Places Autocomplete
2. Build submission form UI
3. Create API route: `POST /api/submissions`
4. Validate and save submission to Supabase
5. Enforce one-per-user constraint
6. Display user's submitted address on map (if exists)

**Deliverable:** Users can submit address and see it saved

**API Contract:**
```typescript
POST /api/submissions
Body: {
  address_text: string
  lat: number
  lng: number
}
Headers: { Authorization: Bearer <supabase_token> }
Response: { success: boolean, submission: Submission }
```

---

### Phase 4: Map Display (Est: 3-4 hours)

**Goal:** Google Map shows current route with stop markers

**Tasks:**
1. Integrate Google Maps JavaScript API
2. Create Map component with stops + polyline
3. Create API route: `GET /api/route`
4. Display route on main page
5. Show user's location marker (if submitted)
6. Calculate and display distance to nearest stop

**Deliverable:** Interactive map showing placeholder route

**API Contract:**
```typescript
GET /api/route
Response: {
  stops: Array<{lat: number, lng: number, label: string}>
  polyline: string (encoded)
  metrics: {
    avg_walk_distance_m: number
    coverage_400m_pct: number
    total_submissions: number
  }
  computed_at: string
}
```

---

### Phase 5: Route Algorithm — Core (Est: 6-8 hours)

**Goal:** Algorithm computes optimal route from addresses

**Tasks:**
1. Implement k-means clustering (TypeScript/JavaScript)
2. Implement haversine distance function
3. Implement TSP nearest-neighbor heuristic
4. Add route scoring (avg walk distance + penalty)
5. Test with sample data (10, 50, 500 points)
6. Create API route: `POST /api/route/compute` (internal trigger)

**Deliverable:** Algorithm generates route with 5-15 stops

**Core Files:**
- `lib/algorithm/kmeans.ts` — k-means clustering
- `lib/algorithm/tsp.ts` — TSP ordering
- `lib/algorithm/metrics.ts` — Distance calculations
- `lib/algorithm/route.ts` — Main orchestrator

---

### Phase 6: Route Algorithm — Road Snapping (Est: 4-5 hours)

**Goal:** Route follows actual roads, not straight lines

**Tasks:**
1. Integrate Google Roads API (snap cluster centers to roads)
2. Integrate Google Directions API (polyline between stops)
3. Add fallback: direct lines if API quota exceeded
4. Cache road-snapped results to minimize API calls
5. Test with real Tel Aviv coordinates

**Deliverable:** Route displayed on real road network

**Note:** Roads API is ~500ms per request. Batch if possible or use OSRM (free OSM alternative).

---

### Phase 7: Route Recalculation (Est: 3-4 hours)

**Goal:** Route updates automatically when new addresses submitted

**Tasks:**
1. Add debounced trigger (check for new submissions every 1 min)
2. Call compute algorithm if submissions > last route's count
3. Save new route to database
4. Notify clients to refetch (polling or Supabase real-time)
5. Show loading state on map during recalc

**Deliverable:** Route recalculates within 1 minute of new submission

**Implementation:**
- Server-side cron or edge function (Vercel Cron)
- Check `submissions.count > routes.latest.total_submissions`
- If true, trigger `/api/route/compute`

---

### Phase 8: Stats Page (Est: 4-5 hours)

**Goal:** Metrics dashboard for mayor presentation

**Tasks:**
1. Create `/stats` page
2. Create API route: `GET /api/stats`
3. Display key metrics (cards with Recharts)
4. Add heatmap (Google Maps HeatmapLayer)
5. Make layout screenshot-friendly
6. Add export/share functionality

**Deliverable:** Stats page ready for presentation

**Metrics to Display:**
- Total submissions
- Average walk distance to nearest stop
- % riders within 400m of a stop
- Number of stops in current route
- Heatmap of address density

---

### Phase 9: Data Migration (Est: 2-3 hours)

**Goal:** Seed database with existing Google Sheet data

**Tasks:**
1. Export Google Sheet as CSV
2. Geocode addresses (Google Geocoding API batch script)
3. Create seed script: `scripts/seed-data.ts`
4. Assign placeholder `google_user_id` (e.g., `seed_001`)
5. Import into Supabase
6. Verify route recalculates with seed data

**Deliverable:** ~50 seed addresses loaded, route computed

---

### Phase 10: Polish & Mobile UX (Est: 3-4 hours)

**Goal:** Mobile-first responsive design ready to launch

**Tasks:**
1. Add mobile bottom sheet for submit form (Vaul library)
2. Optimize map for mobile touch interactions
3. Add loading states and error messages
4. Test on iOS Safari and Android Chrome
5. Add basic error tracking (Sentry free tier)
6. Lighthouse performance audit

**Deliverable:** App works smoothly on mobile devices

---

### Phase 11: Testing & Launch Prep (Est: 3-4 hours)

**Goal:** Production-ready with monitoring

**Tasks:**
1. Write unit tests for algorithm (k-means, TSP, metrics)
2. Integration test: submit → recalc → display
3. Set up Vercel Analytics
4. Set up Sentry error tracking
5. Document API endpoints
6. Add README with setup instructions

**Deliverable:** Tested, monitored app ready to share

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Google Maps API quota exceeded** | Client-side caching (SWR), lazy load. Monitor usage in Google Cloud Console. Free tier = 28K loads/month. |
| **Algorithm too slow for 1K+ addresses** | Test early (Phase 5). K-means is O(n·K·i). If slow, optimize (WASM k-means, Web Workers). |
| **Road snapping API costs** | Use OSRM (free OpenStreetMap) as fallback. Cache snapped coordinates. |
| **Spam submissions** | One per Google account enforced. Add admin review page if needed. |
| **Route doesn't converge** | Add max iterations to k-means (100). Log failures to Sentry. |

---

## Dependencies Between Phases

```
Phase 1 (Foundation)
  └─→ Phase 2 (Auth & DB)
       └─→ Phase 3 (Submit)
            └─→ Phase 4 (Map Display)
                 └─→ Phase 5 (Algorithm Core)
                      └─→ Phase 6 (Road Snapping)
                           └─→ Phase 7 (Recalculation)
                                └─→ Phase 8 (Stats)
                                     └─→ Phase 9 (Data Migration)
                                          └─→ Phase 10 (Polish)
                                               └─→ Phase 11 (Testing & Launch)
```

**Parallelizable:**
- Phase 4 (Map) and Phase 5 (Algorithm) can be developed in parallel (use mock data)
- Phase 8 (Stats) can start after Phase 5 (doesn't need road snapping)

---

## Testing Strategy

### Unit Tests
- Algorithm functions (k-means, TSP, haversine)
- Utility functions (distance calculations, scoring)

### Integration Tests
- Auth flow (sign in → token → API call)
- Submit flow (form → API → DB → recalc trigger)
- Route display (fetch → render → user interaction)

### E2E Tests (Optional, Phase 11)
- User journey: sign in → submit → view map → check stats
- Use Playwright or Cypress

### Performance Tests
- Algorithm with 10, 100, 1K, 10K points
- Map rendering with many stops
- API response times

---

## Monitoring & Observability

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Error rate | Sentry | >10 errors/hour |
| API response time | Vercel Analytics | >500ms p95 |
| Maps API quota | Google Cloud Console | >80% of free tier |
| Route recalc time | Custom logs | >10s |
| Supabase DB size | Supabase Dashboard | >80% of free tier (500MB) |

---

## Post-Launch Enhancements (Not in Scope)

- Real-time route updates (WebSockets instead of polling)
- Admin dashboard (review/reject submissions)
- Historical route comparison
- Multi-language support (Hebrew UI)
- Email notifications when route changes
- Mobile app (React Native)

---

## Timeline Estimate

| Phase | Hours |
|-------|-------|
| 1. Foundation | 2-3 |
| 2. Auth & DB | 3-4 |
| 3. Submit | 4-5 |
| 4. Map Display | 3-4 |
| 5. Algorithm Core | 6-8 |
| 6. Road Snapping | 4-5 |
| 7. Recalculation | 3-4 |
| 8. Stats | 4-5 |
| 9. Data Migration | 2-3 |
| 10. Polish | 3-4 |
| 11. Testing & Launch | 3-4 |
| **TOTAL** | **37-49 hours** |

**Realistic timeline:** 1-2 weeks of focused work (assuming 4-6 hours/day)

---

## Next Steps

1. Review this plan with the user
2. Break down into granular tasks in `.claude/backlog.md`
3. Begin Phase 1: Project Foundation
