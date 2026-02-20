# Implementation Plan — 712 Optimal Route

**Date:** 2026-02-20
**Status:** Ready for Development
**Tech Stack:** Next.js + TypeScript + Supabase + Google Maps
**Timeline:** Phased rollout from scaffolding to launch

---

## Overview

This document provides a detailed roadmap for building the 712 Optimal Route web application. It organizes work into phases, defines technical approach for each component, maps dependencies, identifies risks, and outlines testing strategy.

**Key Constraints:**
- All free tiers (Vercel, Supabase, Google Maps)
- Next.js full-stack (no separate Python backend)
- Google Directions API or OSRM to snap route to real roads
- Route computed in <10s for 1000+ submissions
- Mobile-first responsive design
- Hebrew primary UI language

---

## Phase 1: Project Scaffolding & Infrastructure

**Duration:** 1 phase (foundation)
**Goals:** Set up development environment, initialize Next.js, configure services, implement basic auth

### Phase 1A: Next.js Project Init & Config

**Deliverables:**
- [ ] Initialize Next.js 14+ with App Router (TypeScript)
- [ ] Configure Tailwind CSS + shadcn/ui setup
- [ ] Set up environment variables (template `.env.example`)
- [ ] Configure build & deployment for Vercel
- [ ] Add ESLint + Prettier for code quality
- [ ] Initialize Git hooks (optional: pre-commit linting)

**Technical Decisions:**
- **Framework:** Next.js 14+ (App Router, not Pages Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with mobile-first utilities
- **Components:** shadcn/ui for common patterns (button, input, card, dialog, etc.)
- **Build:** Next.js default (optimized for Vercel)

**Implementation:**
```bash
npx create-next-app@latest 712-optimal-route --typescript --tailwind --app
# Manual additions:
# - shadcn/ui components
# - Tailwind config for RTL (dir: rtl)
# - Custom fonts (if needed for Hebrew)
```

**Env Variables Required:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_SERVER_KEY=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**Testing:** Manual — verify Next.js dev server works, build succeeds, Vercel preview deploys.

---

### Phase 1B: Supabase Project Setup & Database Schema

**Deliverables:**
- [ ] Create Supabase project (free tier)
- [ ] Create database tables (submissions, route_cache, admin_logs)
- [ ] Set up Row-Level Security (RLS) policies
- [ ] Initialize Supabase client (frontend + server-side)
- [ ] Generate TypeScript types from schema

**Technical Decisions:**
- **Database:** Supabase (managed Postgres)
- **Auth:** Supabase Auth (Google OAuth)
- **Storage:** Not used for this MVP
- **Real-time:** Not required (polling is fine)

**Database Schema:**

```sql
-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  address_text TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Route cache (computed route + stats)
CREATE TABLE route_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stops JSONB NOT NULL, -- [{lat, lng, label}, ...]
  polyline TEXT,
  avg_walk_distance_m FLOAT,
  coverage_400m_pct FLOAT,
  total_submissions INT,
  computed_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP -- TTL: recompute after 5 min of new submissions
);

-- Admin logs (for debugging/audit)
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT, -- 'submission', 'route_computed', 'error', etc.
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: submissions — users can only see their own
CREATE POLICY "Users see own submissions" ON submissions
  FOR SELECT USING (auth.uid()::text = google_user_id);

-- RLS Policy: route_cache — everyone can read, only server can write
CREATE POLICY "Route cache is public" ON route_cache
  FOR SELECT USING (true);

-- RLS Policy: admin_logs — only authenticated admins (to be implemented)
CREATE POLICY "Admin logs are restricted" ON admin_logs
  FOR SELECT USING (false); -- implement after auth
```

**Implementation:**
1. Create Supabase project via dashboard
2. Copy connection strings to `.env`
3. Run migrations via SQL editor
4. Generate TypeScript types: `npx supabase gen types typescript`

**Testing:** Use Supabase dashboard SQL editor to verify tables, RLS policies work.

---

### Phase 1C: Authentication Flow (Google OAuth)

**Deliverables:**
- [ ] Set up Google OAuth credentials (Google Cloud Console)
- [ ] Implement `/api/auth/google/callback` (exchange code for tokens)
- [ ] Implement `/api/auth/me` (get current session)
- [ ] Implement `/api/auth/logout` (clear session)
- [ ] Create middleware to check auth on protected routes
- [ ] Add "Sign in with Google" button to UI
- [ ] Create session UI (avatar, dropdown, sign-out)

**Technical Decisions:**
- **OAuth Provider:** Google (via Supabase Auth or manual)
- **Session Management:** JWT in HttpOnly cookie (Supabase handles this)
- **Protected Routes:** App middleware checks cookie
- **Scope:** `openid email profile`

**Implementation:**

```typescript
// lib/auth.ts
export async function googleOAuthCallback(code: string, state: string) {
  // Exchange code for tokens from Google OAuth endpoint
  // Decode ID token to get google_user_id, email, name, picture
  // Create session JWT
  // Set HttpOnly cookie
  // Redirect to /
}

export async function getCurrentSession(): Promise<SessionJWT | null> {
  // Read session cookie
  // Verify JWT signature
  // Return payload or null
}

// app/api/auth/google/callback/route.ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  await googleOAuthCallback(code, state);
  return NextResponse.redirect(new URL('/?auth=success', request.url));
}

// app/api/auth/me/route.ts
export async function GET() {
  const session = getCurrentSession();
  return NextResponse.json(session);
}

// middleware.ts
export function middleware(request: NextRequest) {
  // Check for session cookie on protected routes
  // Redirect to Google OAuth if missing
}
```

**Testing:**
- Manual OAuth flow test (sign in, verify session cookie, sign out)
- Unit tests for token verification
- E2E test (full sign-in flow)

**Risks:**
- Google OAuth credentials misconfiguration → test early
- CORS issues with Google API → ensure redirect URIs match

---

## Phase 2: Core Backend Features

**Duration:** 2 phases (data + algorithm)
**Goals:** Implement submission API, geocoding, route optimization algorithm, caching

### Phase 2A: Address Submission & Geocoding

**Deliverables:**
- [ ] Implement `POST /api/submissions` (accept address, geocode, store)
- [ ] Implement `GET /api/submissions/me` (get current user's submission)
- [ ] Implement `GET /api/submissions/count` (total submission count, public)
- [ ] Set up Google Maps Geocoding API server-side wrapper
- [ ] Add address validation (bounds check, rejection logic)
- [ ] Handle geocoding errors gracefully

**Technical Decisions:**
- **Geocoding:** Google Maps Geocoding API (server-side only)
- **Validation:** Accept Greater TLV area, reject obvious errors (outside Israel bounds)
- **Caching:** Cache geocoding results in Supabase (avoid re-querying same address)

**Implementation:**

```typescript
// lib/geocode.ts
export async function geocodeAddress(address: string): Promise<{lat: number, lng: number}> {
  // Call Google Maps Geocoding API
  // Return lat/lng or throw error
  // Cache result in DB
}

// app/api/submissions/route.ts
export async function POST(request: NextRequest) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {address_text} = await request.json();

  // Validate: not already submitted
  const existing = await supabase.from('submissions')
    .select('id')
    .eq('google_user_id', session.sub)
    .single();
  if (existing) return NextResponse.json({error: 'Already submitted'}, {status: 400});

  // Geocode address
  const {lat, lng} = await geocodeAddress(address_text);

  // Bounds check
  if (lat < 31.0 || lat > 33.5 || lng < 34.0 || lng > 35.5) {
    return NextResponse.json({error: 'Address outside service area'}, {status: 400});
  }

  // Store submission
  const submission = await supabase.from('submissions')
    .insert({google_user_id: session.sub, display_name: session.name, email: session.email, address_text, lat, lng})
    .single();

  // Trigger route recalculation (debounced)
  triggerRouteRecalculation();

  return NextResponse.json(submission);
}

export async function GET() {
  // Return count of all submissions (public)
  const {count} = await supabase.from('submissions').select('*', {count: 'exact'});
  return NextResponse.json({count});
}
```

**Testing:**
- Unit: geocoding wrapper (mock Google API)
- Integration: `POST /api/submissions` with valid/invalid addresses
- Bounds validation tests

**Risks:**
- Google Geocoding API quota → use free tier wisely, add rate limiting
- Duplicate submissions → enforce unique constraint in DB, handle race condition
- Address accuracy → document geocoding limitations in UI

---

### Phase 2B: Route Optimization Algorithm

**Deliverables:**
- [ ] Implement K-means clustering (haversine distance)
- [ ] Implement outlier detection (MAD-based)
- [ ] Implement stop snapping to roads (Google Directions or OSRM)
- [ ] Implement TSP heuristic (nearest-neighbor tour)
- [ ] Implement route scoring function (avg walk distance + coverage %)
- [ ] Implement full optimization pipeline (K=5..15, pick best)
- [ ] Add algorithm tests with synthetic data

**Technical Decisions:**
- **Clustering:** K-means with haversine distance (TypeScript implementation)
- **Projection:** Project lat/lng to local Cartesian for clustering, then convert back
- **Road snapping:** Google Directions API or OSRM (use direction matrix to find nearest point on road)
- **TSP ordering:** Nearest-neighbor heuristic (fast, good enough for this scale)
- **Scoring:** Weighted: avg_walk_distance + (1 - coverage_400m_pct), pick K that minimizes

**Implementation:**

```typescript
// lib/algorithm/haversine.ts
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // meters
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// lib/algorithm/kmeans.ts
export function kmeansCluster(points: Array<{lat: number, lng: number, weight: number}>, k: number): Cluster[] {
  // Project to local Cartesian (centered at median point)
  const projected = points.map(p => projectToXY(p.lat, p.lng));

  // Run standard k-means on projected coordinates
  const centroids = initializeCentroidsKmeanspp(projected, k);
  let clusters = assignClusters(projected, centroids);

  for (let iter = 0; iter < 100; iter++) {
    const newCentroids = recomputeCentroids(clusters);
    if (converged(centroids, newCentroids)) break;
    clusters = assignClusters(projected, newCentroids);
  }

  // Project centroids back to lat/lng
  return clusters.map(c => ({
    points: c.points,
    centroid: projectFromXY(c.centroid.x, c.centroid.y)
  }));
}

// lib/algorithm/preprocess.ts
export function preprocessSubmissions(submissions: Array<{lat: number, lng: number}>): {
  valid: Array<{lat: number, lng: number, weight: number}>;
  outliers: Array<{lat: number, lng: number}>;
} {
  // 1. Dedup by rounding to 5 decimal places (~1.1m)
  // 2. Detect outliers using MAD
  // 3. Return valid points + outliers separately
}

// lib/algorithm/snap-to-roads.ts
export async function snapToRoads(stops: Array<{lat: number, lng: number}>): Promise<Array<{lat: number, lng: number}>> {
  // Use Google Directions API or OSRM to snap each stop to nearest road
  // Return snapped coordinates
}

// lib/algorithm/tsp.ts
export function nearestNeighborTSP(stops: Array<{lat: number, lng: number}>, fixedEndpoint: {lat: number, lng: number}): Array<{lat: number, lng: number}> {
  // Nearest-neighbor heuristic: start at high-density point, greedily add nearest unvisited stop, end at fixedEndpoint
}

// lib/algorithm/score-route.ts
export function scoreRoute(submissions: Array<{lat: number, lng: number}>, stops: Array<{lat: number, lng: number}>): {
  avgWalkDistance: number;
  coverage400m: number;
} {
  // For each submission, find nearest stop (haversine)
  // Return avg distance + % within 400m
}

// lib/algorithm/optimize.ts
export async function optimizeRoute(submissions: Array<{lat: number, lng: number}>): Promise<Route> {
  const {valid, outliers} = preprocessSubmissions(submissions);

  let bestRoute: Route | null = null;
  let bestScore = Infinity;

  for (let k = 5; k <= 15; k++) {
    const clusters = kmeansCluster(valid, k);
    let stops = clusters.map(c => c.centroid);
    stops = await snapToRoads(stops);
    stops = nearestNeighborTSP(stops, FIXED_ENDPOINT);

    const {avgWalkDistance, coverage400m} = scoreRoute(valid, stops);
    const score = avgWalkDistance + (1 - coverage400m) * 1000; // weighted

    if (score < bestScore) {
      bestScore = score;
      bestRoute = {stops, avgWalkDistance, coverage400m, k, outliers};
    }
  }

  return bestRoute!;
}
```

**Testing:**
- Unit: haversine distance formula
- Unit: K-means on synthetic data (verify clustering correctness)
- Unit: outlier detection (verify MAD threshold)
- Unit: TSP ordering (verify valid tour)
- Integration: end-to-end optimize() with 50–1000 submissions
- Benchmark: verify <10s completion time for 1000 submissions

**Risks:**
- Google Directions API quota → consider OSRM as fallback (self-hosted or free tier)
- Algorithm performance on 10K submissions → profile, optimize if needed
- Floating-point precision in distance calculations → test edge cases

---

### Phase 2C: Route Caching & Debouncing

**Deliverables:**
- [ ] Implement debounced route recalculation (5–10s delay after submission)
- [ ] Implement route cache in `route_cache` table (invalidate after TTL or new submission)
- [ ] Implement `GET /api/route` (fetch cached route or compute if missing)
- [ ] Add admin endpoint `POST /api/admin/route/force-recalculate`

**Technical Decisions:**
- **Debouncing:** In-memory queue (e.g., Node.js timeout) or job queue (e.g., Redis)
- **Cache invalidation:** Simple TTL (5–10 min) or trigger on new submission
- **For MVP:** In-memory debounce is fine (no distributed workers yet)

**Implementation:**

```typescript
// lib/debounce.ts
let recalculateTimeout: NodeJS.Timeout | null = null;

export function debounceRecalculate() {
  if (recalculateTimeout) clearTimeout(recalculateTimeout);
  recalculateTimeout = setTimeout(async () => {
    await recalculateRoute();
  }, 7000); // 7 second delay
}

async function recalculateRoute() {
  const submissions = await supabase.from('submissions').select('lat, lng');
  const route = await optimizeRoute(submissions.map(s => ({lat: s.lat, lng: s.lng})));

  await supabase.from('route_cache').delete().gte('created_at', new Date(Date.now() - 1000)); // clear old
  await supabase.from('route_cache').insert({
    stops: route.stops,
    polyline: encodePolyline(route.stops), // for Google Maps
    avg_walk_distance_m: route.avgWalkDistance,
    coverage_400m_pct: route.coverage400m,
    total_submissions: submissions.length,
    valid_until: new Date(Date.now() + 10 * 60 * 1000) // 10 min TTL
  });
}

// app/api/route/route.ts
export async function GET() {
  let route = await supabase.from('route_cache')
    .select('*')
    .gt('valid_until', new Date())
    .single();

  if (!route) {
    // Compute on demand (should not happen in normal flow)
    await recalculateRoute();
    route = await supabase.from('route_cache').select('*').single();
  }

  return NextResponse.json(route);
}
```

**Testing:**
- Unit: debounce logic (verify recalculate called once after multiple submissions)
- Integration: cache expiry (verify recompute after TTL)
- E2E: submit address, wait for route recalculation, verify cache updated

---

## Phase 3: Frontend UI & Visualization

**Duration:** 2 phases (main page + stats)
**Goals:** Build interactive map, submission form, stats dashboard with Hebrew RTL support

### Phase 3A: Main Page (`/`)

**Deliverables:**
- [ ] Implement Google Map with route polyline + stop markers
- [ ] Implement submission form with Google Places Autocomplete
- [ ] Implement "Sign in with Google" button + avatar dropdown
- [ ] Implement user's submission state (show pin, walk distance)
- [ ] Implement loading states (skeleton, spinner)
- [ ] Implement error handling (geocoding error, network error)
- [ ] Implement Hebrew RTL layout
- [ ] Responsive mobile-first design

**Technical Decisions:**
- **Maps Library:** `@vis.gl/react-google-maps` (thin wrapper, modern)
- **Autocomplete:** Google Places API (built into maps library)
- **State Management:** React `useState` + SWR for data fetching
- **Styling:** Tailwind CSS with RTL utilities
- **Language:** Hebrew strings in component or i18n (start with hardcoded for MVP)

**Components:**

```typescript
// components/header.tsx
export function Header() {
  const [session, setSession] = useState<SessionJWT | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setSession);
  }, []);

  return (
    <header className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center">
      <Link href="/stats" className="text-sm text-blue-600">סטטיסטיקה</Link>
      <h1 className="text-xl font-bold">712 אופטימלי</h1>
      {session ? <UserMenu user={session} /> : <GoogleSignInButton />}
    </header>
  );
}

// components/map-view.tsx
export function MapView() {
  const [route, setRoute] = useState<Route | null>(null);
  const {data: routeData} = useSWR('/api/route', fetcher, {refreshInterval: 30000});

  useEffect(() => {
    setRoute(routeData);
  }, [routeData]);

  return (
    <GoogleMap center={{lat: 32.06, lng: 34.77}} zoom={13}>
      {route?.stops.map((stop, i) => (
        <Marker key={i} position={stop} title={`Stop ${i + 1}`} />
      ))}
      <Polyline path={decodePolyline(route?.polyline)} />
    </GoogleMap>
  );
}

// components/submission-form.tsx
export function SubmissionForm() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {data: submission} = useSWR('/api/submissions/me', fetcher);

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({address_text: address})
      });
      // Re-fetch submission
      mutate('/api/submissions/me');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (submission) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p>✓ כתובתך נשמרה!</p>
        <p className="text-sm text-gray-600">מרחק הליכה: {submission.walk_distance}m</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <GooglePlacesAutocomplete value={address} onChange={setAddress} />
      <button type="submit" disabled={loading}>
        {loading ? 'שולח...' : 'שלח כתובת'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}

// app/page.tsx
export default function HomePage() {
  return (
    <div dir="rtl" className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        <MapView />
        <SubmissionForm />
      </div>
    </div>
  );
}
```

**Testing:**
- Manual: Google sign-in, address submission, map visibility
- E2E: full flow from sign-in to route update
- Responsive: desktop, tablet, mobile breakpoints

**Risks:**
- Google Maps JS library loading → add error boundary
- Autocomplete suggestions for Hebrew → test coverage
- RTL layout edge cases → test on actual RTL browser

---

### Phase 3B: Stats Page (`/stats`)

**Deliverables:**
- [ ] Implement stats dashboard (total submissions, avg walk distance, coverage %)
- [ ] Implement heatmap overlay of submission density
- [ ] Implement charts (histogram of walk distances)
- [ ] Make stats exportable/screenshot-friendly
- [ ] Public read-only access (no auth required)
- [ ] Hebrew RTL layout

**Technical Decisions:**
- **Charting:** Recharts (lightweight, React-native)
- **Heatmap:** Google Maps HeatmapLayer (built-in)
- **Auth:** Public (no authentication required)
- **Export:** Screenshot via browser devtools (no special export feature for MVP)

**Components:**

```typescript
// components/stats-cards.tsx
export function StatsCards() {
  const {data: stats} = useSWR('/api/stats', fetcher);

  if (!stats) return <div>טוען...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="סה״כ הגשות" value={stats.total_submissions} />
      <Card title="מרחק הליכה ממוצע" value={`${stats.avg_walk_distance_m}m`} />
      <Card title="כיסוי 400m" value={`${stats.coverage_400m_pct}%`} />
    </div>
  );
}

// components/walk-distance-chart.tsx
export function WalkDistanceChart() {
  const {data: histogram} = useSWR('/api/stats/histogram', fetcher);

  return (
    <ResponsiveBarChart data={histogram}>
      <Bar dataKey="count" />
    </ResponsiveBarChart>
  );
}

// app/stats/page.tsx
export default function StatsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">סטטיסטיקה של מסלול 712</h1>
      </header>

      <StatsCards />
      <WalkDistanceChart />
      <HeatmapView />

      <div className="mt-8 text-sm text-gray-600">
        <p>עמוד זה מעודכן כל דקה</p>
      </div>
    </div>
  );
}

// app/api/stats/route.ts
export async function GET() {
  const {data: submissions} = await supabase.from('submissions').select('lat, lng');
  const {data: route} = await supabase.from('route_cache').select('*').single();

  // Compute stats
  const walkDistances = submissions.map(s => {
    const nearest = route.stops.reduce((best, stop) => {
      const d = haversine(s.lat, s.lng, stop.lat, stop.lng);
      return d < best ? d : best;
    }, Infinity);
    return nearest;
  });

  const avgWalk = walkDistances.reduce((a, b) => a + b, 0) / walkDistances.length;
  const coverage = walkDistances.filter(d => d <= 400).length / walkDistances.length;

  return NextResponse.json({
    total_submissions: submissions.length,
    avg_walk_distance_m: avgWalk,
    coverage_400m_pct: (coverage * 100).toFixed(1),
    num_stops: route.stops.length
  });
}
```

**Testing:**
- Manual: stats page loads, numbers update after submission
- E2E: heatmap renders, charts display

---

## Phase 4: Data Migration & Launch Prep

**Duration:** 1 phase (data + deployment)
**Goals:** Import seed data, test end-to-end, prepare for public launch

### Phase 4A: Seed Data Import

**Deliverables:**
- [ ] Export existing Google Sheet to CSV
- [ ] Parse CSV, geocode addresses, map to submission schema
- [ ] Bulk insert into submissions table
- [ ] Verify data integrity (count, coverage %)
- [ ] Document migration process

**Implementation:**

```typescript
// scripts/import-seed-data.ts
import * as fs from 'fs';
import * as csv from 'csv-parse';

async function importSeedData(csvPath: string) {
  const submissions = [];
  const parser = fs.createReadStream(csvPath).pipe(csv());

  for await (const row of parser) {
    const {address} = row;
    const {lat, lng} = await geocodeAddress(address);
    submissions.push({
      google_user_id: `seed_${submissions.length}`,
      display_name: 'Seed Data',
      email: 'seed@example.com',
      address_text: address,
      lat, lng
    });
  }

  await supabase.from('submissions').insert(submissions);
  console.log(`Imported ${submissions.length} submissions`);
}

// Usage: npx ts-node scripts/import-seed-data.ts data/seed.csv
```

**Testing:**
- Import with small sample (10 rows) first
- Verify record count
- Spot-check geocoded coordinates on map

---

### Phase 4B: End-to-End Testing & QA

**Deliverables:**
- [ ] Full E2E test flow (sign-in → submit → route update → stats)
- [ ] Load test (1000+ simultaneous submissions)
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Hebrew text rendering verification
- [ ] Google API quota validation
- [ ] Error scenario testing (network down, geocoding fail, etc.)

**Test Cases:**

```typescript
// tests/e2e.spec.ts (using Playwright or similar)

test('full flow: sign in, submit address, see route update', async ({page}) => {
  await page.goto('/');
  await page.click('button:has-text("התחברות עם Google")');
  // Complete OAuth flow (mock or live)

  await page.fill('input[placeholder="כתובת"]', 'Tel Aviv, Allenby 23');
  await page.click('button:has-text("שלח כתובת")');

  await page.waitForTimeout(10000); // wait for route recalc

  // Verify route polyline visible
  const mapContent = await page.locator('.gm-style').isVisible();
  expect(mapContent).toBe(true);

  // Verify walk distance shown
  const walkDistance = await page.locator('text=/מרחק הליכה/').isVisible();
  expect(walkDistance).toBe(true);
});

test('stats page shows metrics', async ({page}) => {
  await page.goto('/stats');

  const totalSubmissions = await page.locator('text=/סה״כ הגשות/').isVisible();
  expect(totalSubmissions).toBe(true);

  const chart = await page.locator('canvas').first().isVisible(); // Recharts renders to canvas
  expect(chart).toBe(true);
});
```

---

### Phase 4C: Deployment & Launch

**Deliverables:**
- [ ] Set up Vercel project linked to GitHub
- [ ] Configure environment variables in Vercel
- [ ] Enable auto-deploy on push to `main`
- [ ] Set up custom domain (optional, free subdomain works for MVP)
- [ ] Configure Sentry for error tracking
- [ ] Create runbook for admin operations (export data, force route recalc)
- [ ] Write deployment notes (what to do before/after launch)

**Pre-Launch Checklist:**
- [ ] All tests passing
- [ ] E2E flow tested on production preview
- [ ] Google Maps API key configured
- [ ] Supabase RLS policies reviewed
- [ ] Admin dashboard accessible (future phase)
- [ ] Sentry errors < 5/day
- [ ] Load test passed (1000 submissions)
- [ ] Hebrew text rendering verified
- [ ] Mobile responsive verified
- [ ] Analytics events firing (if added)

**Post-Launch:**
- [ ] Monitor error rates via Sentry
- [ ] Monitor submission rate via stats API
- [ ] Monitor Google Maps API usage
- [ ] Collect user feedback (comments form or survey)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Next.js Frontend)                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Main Page (/)                  Stats Page (/stats)          │ │
│ │ - GoogleMap + Markers          - Stats Cards                │ │
│ │ - SubmissionForm               - Charts (Recharts)          │ │
│ │ - Header + Auth                - Heatmap                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────┬────────────────────────────────┬────────────────────────────┘
     │ HTTPS                          │ HTTPS
     ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Next.js App Router (Vercel)                                      │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ API Routes (app/api/)                                        ││
│ │ - POST /api/submissions         (store address)              ││
│ │ - GET /api/submissions/me       (get user's submission)      ││
│ │ - GET /api/route                (get cached route)           ││
│ │ - GET /api/stats                (compute metrics)            ││
│ │ - POST /api/auth/google/callback (OAuth)                     ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Lib (lib/)                                                   ││
│ │ - algorithm.ts       (k-means, TSP, scoring)                 ││
│ │ - geocode.ts         (Google Geocoding wrapper)              ││
│ │ - haversine.ts       (distance calculation)                  ││
│ │ - debounce.ts        (route recalculation)                   ││
│ │ - auth.ts            (JWT + OAuth)                           ││
│ └──────────────────────────────────────────────────────────────┘│
└────┬────────────────────────────────┬────────────────────────────┘
     │ REST (authenticated)           │ REST (public)
     ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ External Services                                                │
│                                                                  │
│ Supabase (Postgres)       Google Maps API                       │
│ - submissions             - Geocoding API                       │
│ - route_cache            - Directions API (road snapping)      │
│ - admin_logs             - Maps JS API (display)               │
│                          - Places Autocomplete                  │
│                                                                  │
│ Google OAuth 2.0          Vercel                                │
│ - Auth endpoint          - Hosting & auto-deploy               │
│ - Token exchange         - Edge middleware                      │
│                          - Analytics                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Google Maps API quota exceeded | Cannot display maps | Monitor usage in console, implement fallback to static image, set daily budget alerts |
| Route calculation > 10s | User frustration | Implement time limits, fallback to simpler algorithm, cache aggressively |
| Duplicate submissions despite unique constraint | Data integrity issue | Enforce at app layer, add transaction retry logic, log anomalies |
| Geocoding fails for Hebrew addresses | Lost submissions | Test with 100+ real addresses, fallback to user correction, provide address suggestions |
| Cold start on Vercel | First request slow | Use Vercel's serverless functions optimizations, keep dependencies minimal |
| Database schema migration downtime | Service interruption | Use Supabase migrations, test in staging first, schedule during low traffic |
| OAuth token expiry | User logged out | Set 30-day TTL, show "login expired" message, support re-auth without losing submission |
| Mobile performance | Bad UX on slow networks | Minify assets, lazy-load map, defer non-critical JS, test on slow 3G |

---

## Dependencies Between Components

```
Phase 1: Scaffolding
├── 1A: Next.js init
├── 1B: Supabase setup
└── 1C: Google OAuth
    ├─ Requires: 1A, 1B

Phase 2: Backend
├── 2A: Address submission
│   ├─ Requires: 1C (auth), Google Geocoding API
├── 2B: Route optimization
│   ├─ Requires: 2A (submissions in DB)
└── 2C: Route caching
    ├─ Requires: 2B (optimizeRoute function)

Phase 3: Frontend
├── 3A: Main page
│   ├─ Requires: 2A (POST /api/submissions), 2C (GET /api/route), 1C (auth)
└── 3B: Stats page
    ├─ Requires: 2C (cached route), GET /api/stats endpoint

Phase 4: Launch
├── 4A: Seed data import
│   ├─ Requires: 1B (DB schema)
├── 4B: E2E testing
│   ├─ Requires: 3A, 3B (full app)
└── 4C: Deployment
    ├─ Requires: 4B (tests passing)
```

---

## Testing Strategy

### Unit Tests
- **Algorithm:** K-means clustering, TSP ordering, haversine distance
- **Utils:** Geocoding wrapper, route scoring, outlier detection
- **Auth:** JWT verification, session management

**Framework:** Jest (built-in with Next.js)

### Integration Tests
- **API endpoints:** Submission, route fetch, stats
- **Database:** Constraint validation, RLS policies
- **Auth flow:** Google OAuth exchange, session persistence

**Framework:** Jest + Supertest (for HTTP)

### E2E Tests
- **Full user flow:** Sign in → submit → route update → stats page
- **Mobile flow:** On iOS Safari, Android Chrome
- **Error scenarios:** Network down, geocoding fail, duplicate submission

**Framework:** Playwright (recommended for Next.js)

### Load Tests
- **Target:** 1000 submissions, route recalc in <10s
- **Tool:** Artillery or Locust

### Manual Tests
- Hebrew text rendering + RTL layout on real devices
- Google Maps autocomplete with Israeli addresses
- Screenshot/export from stats page

---

## Success Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| **Functional** | All F1–F13 requirements met | Checklist + E2E tests |
| **Performance** | Route calc <10s for 1000 submissions | Benchmark test |
| **Mobile** | Loads in <3s on 4G, responsive on all breakpoints | Lighthouse audit + manual test |
| **Reliability** | 99.5% uptime, <100 errors/day | Sentry + Vercel analytics |
| **Data** | Zero lost submissions, one per user enforced | Query DB for unique constraint violations |
| **Accessibility** | Hebrew text renders correctly, RTL layout works | Manual verification + screenshot tests |

---

## Next Steps

1. **Start Phase 1A:** Initialize Next.js project
2. **Set up Git workflow:** Main branch for production, feature branches for development
3. **Create GitHub issues:** One per major deliverable, link to this plan
4. **Schedule team standup:** Weekly check-in on progress
5. **Prepare launch checklist:** Use pre-launch checklist from Phase 4C

---

**Plan Version:** 1.0
**Last Updated:** 2026-02-20
**Owner:** Development Team
**Status:** Ready for Implementation
