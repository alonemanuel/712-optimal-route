# Backend Stack Research: 712 Optimal Route

## Executive Summary

**Recommended Stack (100% Free):**
- **Database + Auth + API:** Supabase (Free tier)
- **Hosting/Compute:** Vercel (Hobby plan)
- **Geocoding:** Nominatim (OSM) via client-side fetch — zero cost
- **Clustering:** Client-side in browser (skmeans / ml-kmeans)
- **Maps:** Leaflet + OpenStreetMap tiles (free, no API key)
- **Google Sheets Import:** One-time script via Supabase client library

**Total monthly cost: $0**

---

## 1. Database Comparison

| Service | Type | Free Storage | Row/Query Limits | Connections | Ease of Use | Notes |
|---------|------|-------------|-----------------|-------------|-------------|-------|
| **Supabase** | Postgres | 500 MB/project | Unlimited rows; 500K edge fn calls | 200 realtime / pooled REST | Excellent — dashboard, REST API, JS SDK | **RECOMMENDED** — auth + DB + API in one |
| Neon | Serverless Postgres | 0.5 GB/project | 100 compute-unit-hours/mo | 10,000 via pgBouncer | Good — serverless, auto-sleep | Compute hours limit could be tight |
| Turso | SQLite edge | 5 GB | 500M reads, 10M writes/mo | N/A (HTTP) | Good — edge-native | Overkill for single-region |
| Cloudflare D1 | SQLite | 5 GB | 5M reads, 100K writes/day | N/A (Workers) | Moderate — tied to Workers ecosystem | Requires Cloudflare Workers |
| Firebase Firestore | Document DB | 1 GB | 50K reads, 20K writes/day | N/A | Good — but NoSQL, less flexible | NoSQL less ideal for relational queries |
| PlanetScale | MySQL | Deprecated free tier | N/A | N/A | N/A | **Free tier removed in 2024** |

### Recommendation: **Supabase**
- 500 MB is more than enough for ~1,000 submissions (~50 KB of data)
- Built-in REST API (PostgREST) means no backend code needed for CRUD
- Row Level Security (RLS) for per-user restrictions
- JS SDK with real-time subscriptions
- Auth built in (see below)

---

## 2. Auth Comparison

| Service | Free MAU | Google OAuth | One-per-user Enforcement | Cost | Notes |
|---------|----------|-------------|-------------------------|------|-------|
| **Supabase Auth** | 50,000 | Yes (web + native) | Via RLS + unique constraint | $0 | **RECOMMENDED** — integrated with DB |
| Clerk | 50,000 MRU | Yes (up to 3 social) | Application logic | $0 | Great UX, but separate service |
| Firebase Auth | Unlimited* | Yes | Application logic | $0 | *Unlimited for most providers |
| Auth.js/NextAuth | Unlimited (self-hosted) | Yes | Application logic | $0 | Open source, runs on your server |
| Lucia | Unlimited (self-hosted) | Yes | Application logic | $0 | Lightweight, deprecated in favor of Auth.js |

### Recommendation: **Supabase Auth**
- Already included with Supabase — zero additional services
- Google OAuth supported with clear setup docs
- "One submission per user" enforced via:
  1. Unique constraint on `user_id` in submissions table
  2. RLS policy: `auth.uid() = user_id`
  3. Upsert instead of insert (allows users to update their address)

---

## 3. Serverless Compute Comparison

| Service | Free Requests | CPU/Duration Limit | Memory | Notes |
|---------|--------------|-------------------|--------|-------|
| Vercel Functions | 1M/mo | 4 CPU-hrs/mo, 10s default | 1024 MB | **RECOMMENDED** — pairs with Next.js |
| Cloudflare Workers | 100K/day | 10ms CPU/request | 128 MB | CPU limit too tight for clustering |
| Netlify Functions | ~300 credits/mo | 10s timeout | 1024 MB | Credit system is confusing |
| AWS Lambda | 1M requests + 400K GB-s | 15 min max | 128-10240 MB | Generous but complex setup |
| Supabase Edge Functions | 500K/mo | 150ms CPU | 150 MB | Deno-based, limited CPU |

### Recommendation: **Not needed for clustering**
K-means on 1,000 2D points is trivially fast in the browser (see section 5). Server functions are only needed if we want server-side geocoding or caching, which Supabase handles via database functions.

If server compute IS needed: **Vercel Functions** (pairs perfectly with Next.js frontend).

---

## 4. Geocoding API Comparison

| Service | Free Tier | Rate Limit | Hebrew/Tel Aviv Support | Accuracy | Notes |
|---------|-----------|-----------|------------------------|----------|-------|
| Google Geocoding | 10,000/mo (NEW - requires billing account) | 3,000 QPM | Excellent | Excellent | **$200 credit DISCONTINUED Mar 2025** — now tiered plans starting $100/mo |
| **Nominatim (OSM)** | Unlimited (self-hosted) or public with limits | 1 req/sec (public) | Good — OSM has Hebrew data | Good for Israel | **RECOMMENDED** — free, no API key |
| OpenCage | 2,500/day | 1 req/sec | Good (uses OSM data) | Good | Free tier is "testing only" — TOS issue |
| LocationIQ | 5,000/day | 2 req/sec | Good (uses OSM data) | Good | Requires attribution link |
| Mapbox Geocoding | 100K/mo (requires account) | 10 req/sec | Good | Good | Requires Mapbox token |

### Recommendation: **Nominatim (public API) + Google Maps Autocomplete as fallback**

**Primary: Nominatim**
- Completely free, no API key needed
- OpenStreetMap has excellent Tel Aviv coverage
- Hebrew address support via OSM's multilingual data
- Rate limit (1 req/sec) is fine — we only geocode on form submit (~1 req per user)

**Approach:**
- Use browser's `fetch()` to call `https://nominatim.openstreetmap.org/search?q=ADDRESS&format=json`
- For better UX: use a debounced autocomplete component that queries Nominatim
- Fallback: If Nominatim fails, prompt user to pin location on map (Leaflet click-to-geocode)

**Why NOT Google:**
- $200/mo free credit was removed in March 2025
- Now requires paid plan ($100/mo minimum) or pay-as-you-go with billing account
- Overkill for ~1,000 total geocoding requests

---

## 5. Client-Side Computation Analysis

### Can k-means run on 1,000 2D points in the browser?

**YES — trivially.**

K-means on 1,000 points with 2 dimensions is an extremely lightweight computation:
- ~1,000 x 2 = 2,000 floating point numbers (~16 KB of data)
- Each iteration: 1,000 distance calculations to k centroids
- Typically converges in 10-30 iterations
- Total: ~30,000 simple arithmetic operations
- **Expected runtime: < 5 milliseconds** on any modern device

### Libraries

| Library | Size | Browser Support | API | Notes |
|---------|------|----------------|-----|-------|
| **skmeans** | ~3 KB | Yes | `skmeans(data, k)` | Minimal, fast, perfect for this use case |
| ml-kmeans | ~15 KB | Yes | `kmeans(data, k, options)` | More features, still small |
| simple-statistics | ~30 KB | Yes | `ckmeans(data, k)` | 1D only — not suitable |

### Recommendation: **skmeans in the browser**

```javascript
import skmeans from 'skmeans';

// data = [[lat1, lng1], [lat2, lng2], ...]
const result = skmeans(data, k); // k = number of desired stops
// result.idxs = cluster assignments
// result.centroids = [[lat, lng], ...] = optimal stop locations
```

**Benefits of client-side clustering:**
- Zero server cost
- Instant results (no network latency)
- No serverless function cold starts
- Works offline
- No compute limits to worry about

**The clustering can be triggered:**
1. On page load (fetch all submissions, run k-means, display)
2. Cached result stored in Supabase (recomputed on new submission via database trigger or on-demand)

---

## 6. Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER BROWSER                      │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ Next.js  │  │ Leaflet   │  │ skmeans          │ │
│  │ App      │  │ Map       │  │ (clustering)     │ │
│  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘ │
│       │              │                  │            │
│       │    ┌─────────┴──────────┐       │            │
│       │    │ Nominatim API      │       │            │
│       │    │ (geocoding)        │       │            │
│       │    └────────────────────┘       │            │
│       │                                 │            │
└───────┼─────────────────────────────────┼────────────┘
        │                                 │
        ▼                                 ▼
┌───────────────────────────────────────────────────────┐
│                  SUPABASE (Free Tier)                  │
│                                                        │
│  ┌──────────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ PostgreSQL   │  │ Auth     │  │ REST API        │ │
│  │ - submissions│  │ - Google │  │ (PostgREST)     │ │
│  │ - routes     │  │   OAuth  │  │ - auto-generated│ │
│  │ - stats      │  │ - RLS    │  │ - CRUD          │ │
│  └──────────────┘  └──────────┘  └─────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Row Level Security (RLS)                          │ │
│  │ - Users can only insert/update their own row      │ │
│  │ - Anyone can read all submissions (for clustering)│ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└───────────────────────────────────────────────────────┘
        │
        │ Deployed on
        ▼
┌───────────────────────────────────────────────────────┐
│              VERCEL (Hobby Plan)                       │
│                                                        │
│  - Next.js static + SSR                                │
│  - Automatic deployments from GitHub                   │
│  - Edge network / CDN                                  │
│  - (Optional) API routes for server-side tasks         │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### Data Flow

```
1. USER SUBMITS ADDRESS
   Browser → Nominatim API (geocode address → lat/lng)
   Browser → Supabase (upsert submission with lat/lng + user_id)

2. DISPLAY ROUTE
   Browser → Supabase (fetch all submissions)
   Browser → skmeans (cluster into k stops)
   Browser → Leaflet (display stops + route on map)

3. STATS PAGE
   Browser → Supabase (fetch aggregated stats via SQL view)
   Browser → Recharts (render charts)
```

### Database Schema

```sql
-- Submissions table
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE, -- one per user!
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cached route (optional - for pre-computed results)
CREATE TABLE cached_routes (
  id SERIAL PRIMARY KEY,
  k INTEGER NOT NULL,              -- number of stops
  centroids JSONB NOT NULL,        -- [[lat, lng], ...]
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for clustering)
CREATE POLICY "Public read" ON submissions FOR SELECT USING (true);

-- Users can only insert/update their own row
CREATE POLICY "User insert" ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User update" ON submissions FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 7. Google Sheets Import

### Approach: One-time Node.js script

```javascript
// import-seeds.js
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

// 1. Export Google Sheet as CSV
// 2. Parse CSV
const csv = fs.readFileSync('seed-data.csv', 'utf-8');
const { data } = Papa.parse(csv, { header: true });

// 3. Geocode addresses (if not already geocoded)
// 4. Bulk insert into Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
await supabase.from('submissions').upsert(
  data.map(row => ({
    address: row.address,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
    // user_id: null for seed data (or create a system user)
  }))
);
```

**Options:**
1. **CSV Export + Script** (recommended) — Export sheet as CSV, run import script
2. **Google Sheets API** — Read directly via API (requires Google API credentials, more complex)
3. **Supabase CSV Import** — Dashboard has a CSV import feature (manual, one-click)

**Recommendation:** Use Supabase's built-in CSV import from the dashboard for seed data. It requires zero code.

---

## 8. Cost Analysis

| Service | What We Use | Free Tier Limit | Our Usage | Cost |
|---------|------------|----------------|-----------|------|
| Supabase | Database + Auth + API | 500 MB DB, 50K MAU, 5 GB egress | ~50 KB data, ~1K users, minimal egress | **$0** |
| Vercel | Hosting + CDN | 100 GB bandwidth, 1M fn calls | Low traffic site | **$0** |
| Nominatim | Geocoding | Unlimited (public API) | ~1,000 total requests | **$0** |
| OpenStreetMap | Map tiles | Unlimited (with attribution) | Standard map usage | **$0** |
| skmeans | Clustering | Open source | Client-side | **$0** |
| GitHub | Source code | Unlimited public repos | 1 repo | **$0** |
| **TOTAL** | | | | **$0/month** |

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase free project paused after 7 days inactivity | Medium | High — site goes down | Supabase removed auto-pause for free projects in 2024. If it returns, set up a cron ping via GitHub Actions (free) |
| Nominatim rate limiting (1 req/sec) | Low | Low — only affects form submit | Add client-side debounce; fallback to "click on map" for location |
| Vercel bandwidth exceeded (100 GB) | Very Low | Medium — site paused | With ~1K users viewing a lightweight map page, bandwidth will be < 1 GB |
| Supabase 500 MB DB limit | Very Low | Low | 1,000 rows of lat/lng/address ~ 50 KB. Would need 10M+ rows to worry |
| Google OAuth setup complexity | Low | Medium — blocks launch | Well-documented, Supabase has step-by-step guide |
| Nominatim accuracy for Israeli addresses | Low | Medium — wrong coordinates | OSM Israel community is active; fallback to map pin placement |
| Supabase 2 free project limit | Low | None | We only need 1 project |
| Vercel Hobby plan — commercial use restrictions | Low | None | This is a community/civic project, not commercial |

### What Could Break the Free Tier?

**Nothing realistic for this use case:**
- 1,000 users submitting 1 address each = ~1,000 DB rows (~50 KB)
- 1,000 geocoding requests total (one-time per user)
- ~100 daily page views for map = negligible bandwidth
- Stats page with simple aggregations = trivial DB load

**Theoretical risks (extremely unlikely):**
- Viral traffic: 100K+ users in a day could stress Vercel bandwidth
- DDoS: No built-in protection on free tiers (add Cloudflare free CDN if needed)
- Supabase policy change: They could reduce free tier limits

---

## 10. API Design

Since Supabase auto-generates REST APIs from the database schema, we need minimal custom API design:

### Endpoints (Auto-generated by Supabase PostgREST)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rest/v1/submissions` | Required | Submit/upsert user address |
| GET | `/rest/v1/submissions?select=lat,lng,address` | Public | Get all submissions for clustering |
| GET | `/rest/v1/cached_routes?order=computed_at.desc&limit=1` | Public | Get latest cached route |
| PATCH | `/rest/v1/submissions?user_id=eq.{uid}` | Required | Update user's address |

### Optional Vercel API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/recompute` | Trigger server-side route recomputation (if we don't want client-side) |
| `GET /api/stats` | Aggregated stats (could also be a Supabase SQL view) |

**Recommendation:** Start with zero custom API routes. Use Supabase REST API + client-side clustering. Add Vercel API routes only if needed later.

---

## Summary of Recommendations

| Category | Choice | Why |
|----------|--------|-----|
| **Database** | Supabase PostgreSQL | All-in-one, generous free tier, REST API included |
| **Auth** | Supabase Auth | Integrated, Google OAuth, RLS enforcement |
| **Hosting** | Vercel Hobby | Perfect Next.js integration, generous free tier |
| **Geocoding** | Nominatim (OSM) | Free, no API key, good Israeli coverage |
| **Maps** | Leaflet + OSM tiles | Free, open source, no API key |
| **Clustering** | skmeans (client-side) | Zero server cost, instant, < 5ms |
| **Charts** | Recharts (client-side) | Free, React-native, lightweight |
| **Sheets Import** | Supabase CSV import | Zero code, built into dashboard |

**Architecture principle:** Keep everything client-side except data storage. The browser does geocoding, clustering, and rendering. Supabase handles data persistence and auth. Vercel serves the static/SSR app. No custom backend code needed.
