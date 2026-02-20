# System Architecture — 712 Optimal Route

**Last updated:** 2026-02-20

This document describes how the system works at a high level. For detailed specs, see `../specs/`.

## Overview

Single-page web app on Next.js (App Router) with Supabase backend. The route optimization algorithm runs server-side in TypeScript.

```
[Browser]
   ↓
[Next.js App] ← Vercel hosting
   ↓
   ├─→ [Google Maps API] ← Map display, geocoding, heatmap
   ├─→ [Supabase Auth] ← Google OAuth, session management
   ├─→ [Supabase DB] ← User submissions, computed routes
   └─→ [Route Algorithm] ← K-means clustering + TSP ordering
```

## Key Flows

### 1. User Submits Address

```
User → Google sign-in (Supabase Auth)
     → Places Autocomplete (Google Maps)
     → Submit form with lat/lng
     → API route validates + saves to Supabase
     → Trigger route recalculation (debounced)
```

### 2. Route Computation (Server-Side)

```
Trigger (new submission) → Fetch all addresses from DB
                         → Run K-means for K=5..15
                         → For each K:
                             - Cluster addresses
                             - Snap centroids to roads (Google Roads API)
                             - Order stops (nearest-neighbor TSP)
                             - Compute metrics (avg walk, coverage)
                         → Pick best K
                         → Save route to DB
                         → Broadcast update to clients (Supabase real-time)
```

### 3. Map Display

```
Client → Fetch current route from API
       → Render Google Map
       → Draw polyline (stops in order)
       → Add stop markers
       → Show user's address (if submitted)
       → Show distance to nearest stop
```

### 4. Stats Page

```
Client → Fetch route + metrics from API
       → Display stats (avg walk, coverage, submission count)
       → Render heatmap (Google HeatmapLayer with all addresses)
       → Charts (Recharts for bar/line graphs)
```

## Data Flow

```
[User Address Input]
        ↓
[Google Places Autocomplete] → Returns lat/lng
        ↓
[Next.js API Route: POST /api/submissions]
        ↓
[Supabase: submissions table] ← Insert row
        ↓
[Debounced trigger] → Runs every 1 minute if new submissions
        ↓
[Next.js API Route: POST /api/route/compute]
        ↓
[K-means algorithm] → Clusters addresses
        ↓
[Google Roads API] → Snaps centroids to roads
        ↓
[TSP heuristic] → Orders stops
        ↓
[Supabase: routes table] ← Cache computed route
        ↓
[Supabase real-time] → Broadcasts to all clients
        ↓
[Client re-fetches route] → Updates map
```

## Components

### Frontend (Next.js App Router)

| Component | Purpose |
|-----------|---------|
| `app/page.tsx` | Main page — map + submission form |
| `app/stats/page.tsx` | Stats page — metrics + heatmap |
| `components/Map.tsx` | Google Maps wrapper with stops/polyline |
| `components/SubmitForm.tsx` | Address input with Places Autocomplete |
| `components/StatsCard.tsx` | Metric display card |

### API Routes (Next.js)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/submissions` | POST | Submit a new address |
| `/api/submissions` | GET | Fetch all submissions (admin only) |
| `/api/route` | GET | Get current computed route |
| `/api/route/compute` | POST | Trigger route recalculation (internal) |
| `/api/stats` | GET | Get metrics for stats page |

### Algorithm (`lib/algorithm.ts`)

```typescript
computeOptimalRoute(addresses: {lat, lng}[]) {
  let bestRoute = null
  let bestScore = Infinity

  for (K = 5 to 15) {
    clusters = kMeans(addresses, K)
    stops = clusters.map(c => snapToRoad(c.centroid))
    orderedStops = tspNearestNeighbor(stops, FIXED_ENDPOINT)
    metrics = computeMetrics(addresses, orderedStops)
    score = metrics.avgWalk + penalty(K) // Prefer fewer stops if similar

    if (score < bestScore) {
      bestRoute = {stops: orderedStops, metrics}
      bestScore = score
    }
  }

  return bestRoute
}
```

### Database (Supabase Postgres)

See `../specs/api-data.md` for full schema.

**Tables:**
- `submissions` — User addresses (one per Google account)
- `routes` — Cached computed routes (versioned by `computed_at`)
- `auth.users` — Supabase auth users (Google OAuth)

## Constraints Resolved

These questions from the PRD have been answered:

1. **Highway on-ramp:** La Guardia / Kibbutz Galuyot (~32.063, 34.790) — fixed route endpoint
2. **Address scope:** Accept greater Tel Aviv area (no hard boundary)
3. **Road preferences:** Prefer major roads, allow side streets if significantly better
4. **Existing riders:** ~50 in Google Sheet, import as seed data

See `specs/overview.md` for full details.

## Scaling Considerations

| Concern | Solution |
|---------|----------|
| 10K+ addresses | K-means is O(n·K·i) where i=iterations. Batching/worker queue if >100K |
| Route recalc on every submission | Debounce to 1 min. Only recalc if new submissions since last run |
| Map loads (API quota) | Client-side caching (SWR). Don't refetch route on every page load |
| Concurrent submissions | Use DB unique constraint on `google_user_id`. Let Supabase handle conflicts |

## Security

| Risk | Mitigation |
|------|------------|
| Spam submissions | One per Google account (enforced via unique constraint) |
| API key exposure | Server-side Geocoding API key (not in browser). Maps API key has domain restrictions |
| Unauthorized access | Supabase RLS policies. Only authed users can submit. Stats page is public |
| SQL injection | Supabase client handles escaping. Use parameterized queries |

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Page load | <3s on mobile | Next.js SSR + Vercel CDN |
| Route recalc | <10s for 10K addresses | K-means converges fast for 2D points |
| Map render | <2s | Google Maps loads async |
| API response | <500ms | Cached route fetch from Supabase |

## Deployment

```
Push to main → Vercel auto-deploy → Zero downtime
                                  → Environment vars from Vercel dashboard
                                  → Next.js build (static + serverless functions)
```

**Environment vars (set in Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `GOOGLE_MAPS_SERVER_KEY` (secret)

## Monitoring

| Tool | Purpose |
|------|---------|
| Vercel Analytics | Page views, performance |
| Sentry | Error tracking (5K errors/month free) |
| Supabase Dashboard | DB queries, API usage |
| Google Cloud Console | Maps API quota |

## Future Enhancements (Not in Scope)

- Real-time route updates (WebSockets) — Current: clients poll every 1 min
- Multi-city support — Hardcoded for Tel Aviv → Modi'in
- Historical route comparison — Only current route is stored
- Admin dashboard — Stats page is public, no auth gating
