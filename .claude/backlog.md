# Backlog

**Last Updated:** 2026-02-20
**Implementation Plan:** See `.claude/docs/implementation-plan.md` for full technical roadmap

---

## In Progress

## Up Next

### Phase 1: Algorithm Core (LOCAL) — POC/MVP
**Goal:** Standalone algorithm library that generates optimal route from mock data

- [ ] Set up Next.js project locally
  - `npx create-next-app@latest` with App Router + TypeScript
  - Configure strict TypeScript
  - Create `lib/algorithm/` directory structure
- [ ] Implement haversine distance function
  - TypeScript: `lib/algorithm/distance.ts`
  - Unit test with known Tel Aviv coordinates
- [ ] Implement local coordinate projection (lat/lng ↔ x/y meters)
  - Reference point at Tel Aviv centroid
  - Handle edge cases (water, off-island)
- [ ] Implement preprocessing module
  - Deduplication (round to 5 decimals)
  - Outlier detection via MAD
  - Israel bounding box validation
  - Unit tests
- [ ] Implement k-means clustering
  - Use scikit-learn via Python API or custom TypeScript implementation
  - Project to local (x, y), run sklearn KMeans, project back
  - Weighted points support
  - K = 5..15 iterations
- [ ] Implement TSP solver (Held-Karp exact DP)
  - Fixed endpoint at La Guardia (32.063, 34.790)
  - Try all start nodes, pick lowest-distance route
  - Handle K up to 15 stops
- [ ] Implement scoring function
  - Average walk distance
  - Coverage % (400m threshold)
  - Route length penalty
  - K complexity penalty
- [ ] Generate mock data
  - ~50 random addresses in Tel Aviv (~31.8-32.1 lat, 34.7-34.9 lng)
  - Include 5-10% outliers (far addresses)
  - Include 1-2 invalid points (outside Israel box)
- [ ] Test algorithm end-to-end
  - Load mock data → preprocess → cluster (K=5..15) → order → score
  - Verify picks reasonable K
  - Print route with metrics (avg walk, coverage %, K stops)
  - Run performance test (should complete <1s for 50 points)

**Deliverable:** Working algorithm generates route from mock data, prints results to console

---

### Phase 2: UI Wrapper — Map Display (LOCAL) — See Algorithm Results
**Goal:** Open `localhost:3000`, see map with algorithm-generated route from mock data

- [ ] Install Google Maps React library (`react-google-maps/api`)
  - Set up free API key locally
  - Create `<GoogleMapComponent>` wrapper
- [ ] Create `/app/page.tsx` main page
  - Responsive layout (mobile: full width, desktop: map + sidebar)
  - Display Google Map centered on Tel Aviv
- [ ] Create route visualization
  - Fetch algorithm-generated route (mock JSON)
  - Draw polyline on map
  - Add stop markers with labels
  - Style: show coverage zones (400m radius as circles, optional)
- [ ] Display stats card
  - Show K stops, avg walk distance, coverage %
  - Display total mock submissions
- [ ] Create mock data server
  - `/api/route/mock` endpoint returns pre-computed route from algorithm
  - `/api/stats/mock` endpoint returns stats

**Deliverable:** Open browser, see map with optimal bus route from mock data

- [ ] Configure Supabase Auth for Google OAuth
  - Set up Google OAuth credentials in Google Cloud
  - Add credentials to Supabase Auth settings
  - Configure redirect URLs
- [ ] Create database schema in Supabase
  - Create `submissions` table with schema (see implementation plan)
  - Create `routes` table for cached routes
  - Add indexes on `google_user_id`, `created_at`
- [ ] Set up Row Level Security (RLS) policies
  - Policy: Users can only read/write their own submission
  - Policy: Everyone can read routes (public)
  - Test policies in Supabase SQL editor
- [ ] Install Supabase client in Next.js
  - `npm install @supabase/supabase-js @supabase/auth-helpers-nextjs`
  - Create `lib/supabase/client.ts` and `lib/supabase/server.ts`
- [ ] Build auth UI components
  - Sign-in button with Google OAuth
  - User avatar/name display
  - Sign-out button
  - Auth state management (client + server)
- [ ] Test auth flow end-to-end
  - Sign in → token → API call with auth
  - Sign out
  - Session persistence

**Deliverable:** Open browser, see map with optimal bus route from mock data

---

### Phase 3: Authentication & Database (LOCAL)
**Goal:** Users can sign in with Google, submit one address, route recalculates

- [ ] Set up Supabase locally
  - Sign up and create project
  - Create `submissions` table (id, google_user_id, address_text, lat, lng, created_at)
  - Create `routes` table (stops JSON, avg_walk, coverage, K, computed_at)
  - Configure Row Level Security
  - Save `.env.local`
- [ ] Set up Google OAuth
  - Create Google Cloud OAuth credentials
  - Configure Supabase Auth with Google provider
- [ ] Build auth UI
  - Sign-in button (Google OAuth)
  - Display user name/avatar
  - Sign-out button
  - Load Google Maps JS API with Places library
  - Create `<PlacesAutocomplete>` component
  - Handle selection → get lat/lng
- [ ] Build submission form UI
  - Form with Places Autocomplete input
  - Submit button (disabled if not authed)
  - Success/error messages
  - Loading state during submit
- [ ] Create API route: `POST /api/submissions`
  - Validate auth token (Supabase middleware)
  - Validate input (address_text, lat, lng)
  - Upsert to database (handle existing submission)
  - Trigger route recalculation
  - Return success/error
- [ ] Create API route: `GET /api/submissions/me`
  - Fetch current user's submission
  - Return null if not submitted yet
- [ ] Implement route recalculation trigger
  - Call algorithm when new submission received
  - Cache result to `routes` table
  - Broadcast to clients (SWR refetch or Supabase Realtime)
- [ ] Update map to fetch live route
  - Change `/api/route/mock` to `/api/route` (reads from DB)
  - Use SWR with refresh interval (5s poll for now)

**Deliverable:** Submit address → algorithm recalculates → route updates on map

---

### Phase 4: Road Snapping & Polyline Generation (LOCAL)
**Goal:** Algorithm snaps stops to real roads and generates navigation polyline

- [ ] Integrate Google Roads API
  - Create `lib/google/roads.ts` helper
  - Snap cluster center to nearest road
  - Handle API errors + fallback to cluster center
- [ ] Implement major road bias heuristic
  - Query nearby bus stations via Places API
  - Prefer stops on streets with existing bus infrastructure
  - Fall back to nearest road if no major road nearby
- [ ] Integrate Google Directions API
  - Create `lib/google/directions.ts` helper
  - Decode polylines to lat/lng arrays
  - Chain multiple stop pairs into full route polyline
- [ ] Update algorithm to use snapping
  - After k-means, snap each centroid to a road
  - Use snapped coordinates as final stops
  - Cache snapping results to avoid redundant API calls
- [ ] Test end-to-end
  - Algorithm produces route → snaps to roads → generates polyline
  - Verify stops are on actual streets
  - Verify route follows road network

**Deliverable:** Route polyline follows real roads, ready for map display

---

### Phase 5: Stats Page (LOCAL)
**Goal:** Dashboard with metrics for presentation

- [ ] Create `/stats` page
  - Grid layout with metric cards
  - Mobile responsive
- [ ] Implement stats API
  - Compute from latest route + submissions
  - Avg walk distance, coverage %, # stops, # submissions
- [ ] Build stat cards
  - Use shadcn/ui Card components
  - Large number + label + icon
- [ ] Add charts (Recharts)
  - Bar chart: submissions over time
  - Pie chart: coverage (within 400m vs outside)
- [ ] Add heatmap visualization
  - Google Maps HeatmapLayer
  - Plot all submission coordinates
- [ ] Make screenshot-friendly
  - High contrast, clean layout
  - Print-friendly CSS

**Deliverable:** Stats page displays key metrics for presentation

---

### Phase 6: Seed Data & Production Prep (LOCAL → DEPLOYMENT)
**Goal:** Test with real data, then deploy to Vercel

- [ ] Create seed script: `scripts/seed-data.ts`
  - Read CSV from Google Sheet
  - Parse addresses + geocode via Google Geocoding API
  - Generate placeholder google_user_ids
  - Insert into Supabase
- [ ] Run seed locally
  - Populate test database with ~50-100 addresses
  - Trigger route recalculation
  - Verify maps display correct route
- [ ] Polish UX
  - Mobile bottom sheet for form (Vaul library)
  - Touch-friendly controls
  - Loading states + error messages
  - Lighthouse audit (aim for >90)
- [ ] Write tests
  - Algorithm unit tests (haversine, k-means, TSP, scoring)
  - Integration tests (form → DB → route update)
  - Use Jest or Vitest
- [ ] Set up error tracking
  - Sentry integration
  - Configure for frontend + backend errors
- [ ] Document setup
  - Local dev instructions
  - Environment variables reference
  - Deployment guide

**Deliverable:** Fully tested app running locally with real seed data

---

## Done

### Phase 1: Algorithm Core (LOCAL) — COMPLETE ✅ 2026-02-20
- [x] Implement haversine distance function
- [x] Implement coordinate projection (lat/lng ↔ x/y meters)
- [x] Create mock data generator
- [x] Implement preprocessing (dedup, outliers, validation)
- [x] Implement k-means clustering (weighted)
- [x] Implement TSP solver (Held-Karp exact DP)
- [x] Implement route scoring function
- [x] Implement main orchestrator
- [x] Create end-to-end test harness
- **Result:** 9 modules, 119/119 tests passing. Algorithm takes 100 submissions → generates optimal route with 5-15 stops.

**Earlier:**
- [x] Write initial PRD — 2026-02-20
- [x] Set up Claude Code project structure — 2026-02-20
- [x] Create comprehensive implementation plan — 2026-02-20
- [x] Create detailed backlog — 2026-02-20
