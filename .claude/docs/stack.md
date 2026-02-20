# Tech Stack — 712 Optimal Route

**Decided:** 2026-02-20

## Overview

Full-stack Next.js on Vercel with Supabase for database and auth. Single deploy, TypeScript everywhere, zero cost.

## Stack

| Category | Choice | Notes |
|----------|--------|-------|
| Framework | Next.js 14+ (App Router) | Full-stack — API routes handle backend logic |
| Language | TypeScript | End-to-end |
| Hosting | Vercel (free tier) | Auto-deploy on push to main, no cold starts |
| Database | Supabase (free tier Postgres) | 500 MB storage, built-in dashboard |
| Auth | Supabase Auth (Google OAuth) | One submission per Google account enforced via unique constraint |
| Maps | Google Maps JS API (`@vis.gl/react-google-maps`) | $200/mo free credit (~28K map loads) |
| Geocoding | Google Maps Geocoding API | Server-side only (API key not exposed to browser) |
| Heatmap | Google Maps HeatmapLayer | Built into Maps JS API, no extra library |
| Styling | Tailwind CSS | Mobile-first utilities, zero unused CSS |
| Components | shadcn/ui (as needed) | Copy-paste components, not a dependency |
| Charts | Recharts | Lightweight, React-native charting |
| State | React useState + SWR | Minimal client state, server-fetched route data |
| CI/CD | Vercel auto-deploy | Push to main = deploy. Optional GitHub Actions for linting/tests |
| Monitoring | Sentry (free tier) | 5K errors/month. Platform logs for the rest |
| Domain | `*.vercel.app` free subdomain | Custom domain (~$10/yr) when ready for mayor pitch |

## Algorithm

K-means clustering in TypeScript (no Python needed):
- Cluster 5K–10K addresses into K groups (K=5–15)
- Cluster centroids become candidate stops
- Order stops via nearest-neighbor TSP heuristic
- Evaluate: avg walking distance + % within 400m
- Try all K values, pick the best

Libraries: `ml-kmeans` (or simple custom implementation) + haversine distance calculation.

## Repo Structure

```
712-optimal-route/
  src/
    app/                  # Next.js App Router pages
      page.tsx            # Main page (map + form)
      stats/page.tsx      # Stats page
      api/                # API routes
        submissions/      # Submit/get addresses
        route/            # Get computed route
        stats/            # Get stats
    lib/                  # Shared utilities
      supabase.ts         # Supabase client
      algorithm.ts        # K-means + TSP
      geocode.ts          # Google Geocoding wrapper
    components/           # React components
  public/                 # Static assets
  .env.example            # Required env vars (no values)
  tailwind.config.ts
  next.config.ts
```

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (public) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (public) | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (secret) | Server-side Supabase admin access |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Vercel (public) | Maps JS API (browser-restricted) |
| `GOOGLE_MAPS_SERVER_KEY` | Vercel (secret) | Geocoding API (server-side, IP-restricted) |

## Decisions Log

1. **Next.js full-stack over Python backend** — K-means on 10K 2D points is sub-second in JS. One service is simpler than two. Avoids Render cold starts and CORS.
2. **Supabase over Neon** — Bundles auth (Google OAuth) with the database. Built-in dashboard for data inspection. One fewer service to manage.
3. **Google Maps over Leaflet/Mapbox** — Best geocoding accuracy for Israeli/Hebrew addresses. $200/mo free credit is plenty. Heatmap layer built-in.
4. **Recharts over Chart.js** — React-native (no wrapper needed), simpler API, good defaults for the 2 charts on the stats page.

## Free Tier Limits

| Service | Limit | Our Usage |
|---------|-------|-----------|
| Vercel | 100 GB bandwidth/mo | <1% |
| Supabase | 500 MB storage, 50K MAU | ~10K rows, <1K users |
| Google Maps | $200/mo credit (~28K loads) | <5K loads/mo |
| Sentry | 5K errors/mo | Minimal |
| GitHub Actions | 2K min/mo | <50 min/mo |

**Total cost: $0/month**
