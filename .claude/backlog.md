# Backlog

**Last Updated:** 2026-02-20
**Implementation Plan:** See `.claude/docs/implementation-plan.md` for full technical roadmap

---

## In Progress

## Up Next

### Phase 1: Project Foundation (Est: 2-3 hours)
**Goal:** Working Next.js app deployed to Vercel with Supabase connected

- [ ] Initialize Next.js 14+ project with TypeScript
  - `npx create-next-app@latest` with App Router
  - Configure TypeScript strict mode
  - Set up ESLint and Prettier
- [ ] Install and configure Tailwind CSS + shadcn/ui
  - Install Tailwind
  - Add shadcn/ui CLI and install base components
  - Set up theme and design tokens
- [ ] Create Supabase project
  - Sign up and create new project
  - Save connection strings and API keys
  - Set up local `.env.local` file
- [ ] Create Google Cloud project
  - Enable Maps JavaScript API
  - Enable Places API
  - Enable Directions API
  - Enable Geocoding API
  - Create and restrict API keys
- [ ] Deploy to Vercel
  - Connect GitHub repo to Vercel
  - Configure environment variables in Vercel dashboard
  - Test deployment pipeline
- [ ] Set up project structure
  - Create `lib/`, `components/`, `app/api/` directories
  - Add basic README with setup instructions

**Deliverable:** Empty app running at `[project].vercel.app`

---

### Phase 2: Authentication & Database (Est: 3-4 hours)
**Goal:** Users can sign in with Google and submission table is ready

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

**Deliverable:** Users can authenticate with Google account

---

### Phase 3: Address Submission (Est: 4-5 hours)
**Goal:** Authenticated users can submit their address once

- [ ] Integrate Google Places Autocomplete
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
  - Return success/error
- [ ] Enforce one-per-user constraint
  - Database unique constraint on `google_user_id`
  - Client-side: disable form if already submitted
  - Show existing submission to user
- [ ] Add API route: `GET /api/submissions/me`
  - Fetch current user's submission
  - Return null if not submitted yet
- [ ] Display user's address on form after submit
  - "Your address: {address_text}" message
  - "Edit address" button to resubmit

**Deliverable:** Users can submit address and see it saved

---

### Phase 4: Map Display (Est: 3-4 hours)
**Goal:** Google Map shows current route with stop markers

- [ ] Integrate Google Maps JavaScript API
  - Create `<GoogleMap>` component wrapper
  - Load API with key from env vars
  - Set center to Tel Aviv, appropriate zoom
- [ ] Create `<RouteMap>` component
  - Display map
  - Render polyline from route data
  - Add stop markers with labels
  - Style map (hide POIs, clean look)
- [ ] Create API route: `GET /api/route`
  - Fetch latest route from `routes` table
  - Return stops, polyline, metrics, computed_at
  - Return empty/placeholder if no route yet
- [ ] Display route on main page
  - Fetch route data with SWR (client-side caching)
  - Pass to `<RouteMap>` component
  - Show loading skeleton during fetch
- [ ] Add user's location marker (if submitted)
  - Fetch user's submission
  - Add marker with different color/icon
  - Center map on user's location option
- [ ] Calculate and display distance to nearest stop
  - Compute haversine distance to each stop
  - Find minimum
  - Display as "X meters to nearest stop" badge

**Deliverable:** Interactive map showing placeholder route

---

### Phase 5: Route Algorithm — Core (Est: 6-8 hours)
**Goal:** Algorithm computes optimal route from addresses

- [ ] Create algorithm library structure
  - `lib/algorithm/types.ts` — TypeScript interfaces
  - `lib/algorithm/distance.ts` — Haversine function
  - `lib/algorithm/kmeans.ts` — K-means clustering
  - `lib/algorithm/tsp.ts` — TSP nearest-neighbor
  - `lib/algorithm/metrics.ts` — Route scoring
  - `lib/algorithm/route.ts` — Main orchestrator
- [ ] Implement haversine distance function
  - Convert degrees to radians
  - Apply formula
  - Return meters
  - Unit test with known coordinates
- [ ] Implement k-means clustering
  - Initialize K random centroids
  - Assign points to nearest centroid (haversine)
  - Recompute centroids
  - Iterate until convergence (max 100 iterations)
  - Return clusters with centroids
- [ ] Implement TSP nearest-neighbor heuristic
  - Start at first stop
  - Repeatedly add nearest unvisited stop
  - End at fixed endpoint (highway on-ramp)
  - Return ordered list of stops
- [ ] Implement route scoring
  - Compute average walking distance (all submissions to nearest stop)
  - Compute coverage % (within 400m of a stop)
  - Add penalty for more stops (prefer simpler routes)
  - Return score
- [ ] Create main route computation function
  - Loop K from 5 to 15
  - For each K: cluster, order, score
  - Pick best K by lowest score
  - Return route with stops, metrics
- [ ] Test algorithm with sample data
  - Test with 10 points (simple)
  - Test with 50 points (realistic)
  - Test with 500 points (stress test)
  - Verify performance <10s for 1K points

**Deliverable:** Algorithm generates route with 5-15 stops

---

### Phase 6: Route Algorithm — Road Snapping (Est: 4-5 hours)
**Goal:** Route follows actual roads, not straight lines

- [ ] Integrate Google Roads API
  - Create `lib/google/roads.ts` helper
  - Snap single point to nearest road
  - Batch API calls if possible
  - Add error handling + fallback
- [ ] Integrate Google Directions API
  - Create `lib/google/directions.ts` helper
  - Get polyline between two stops
  - Decode polyline to lat/lng array
  - Chain multiple stop pairs into full route
- [ ] Update algorithm to snap cluster centers
  - After k-means, snap each centroid to road
  - Use snapped coordinates as stops
  - Handle API failures gracefully (use unsnapped as fallback)
- [ ] Update algorithm to generate road-following polyline
  - For each stop pair: call Directions API
  - Concatenate polylines
  - Encode as single polyline string
  - Cache result in database
- [ ] Add caching to minimize API calls
  - Cache snapped coordinates in memory
  - Only re-snap if centroid moves significantly (>50m)
  - Log API usage for monitoring
- [ ] Test with real Tel Aviv coordinates
  - Use actual street addresses from Greater Tel Aviv
  - Verify stops snap to real roads
  - Verify polyline follows streets

**Deliverable:** Route displayed on real road network

---

### Phase 7: Route Recalculation (Est: 3-4 hours)
**Goal:** Route updates automatically when new addresses submitted

- [ ] Set up Vercel Cron job
  - Create `app/api/cron/recompute/route.ts`
  - Configure `vercel.json` with cron schedule (every 1 min)
  - Add auth token check (cron secret)
- [ ] Implement debounce logic
  - Fetch submission count from database
  - Compare to latest route's `total_submissions`
  - Only recompute if count increased
  - Log recalculation events
- [ ] Create API route: `POST /api/route/compute`
  - Fetch all submissions from database
  - Call route algorithm
  - Save new route to `routes` table
  - Return success/error
  - Add timeout (max 15s)
- [ ] Add client-side polling for updates
  - Use SWR with `refreshInterval: 60000` (1 min)
  - Or use Supabase Realtime subscriptions
  - Show notification when route updates
- [ ] Add loading state during recalculation
  - Show spinner on map
  - Disable submit form during compute
  - Display "Recalculating route..." message

**Deliverable:** Route recalculates within 1 minute of new submission

---

### Phase 8: Stats Page (Est: 4-5 hours)
**Goal:** Metrics dashboard for mayor presentation

- [ ] Create `/stats` page
  - New route: `app/stats/page.tsx`
  - Layout: grid of metric cards + heatmap
  - Mobile-responsive
- [ ] Create API route: `GET /api/stats`
  - Fetch latest route + all submissions
  - Compute metrics (if not cached):
    - Total submissions
    - Average walk distance
    - Coverage % (400m)
    - Number of stops
  - Return JSON
- [ ] Build metric display cards
  - Use shadcn/ui Card components
  - Large number + label + icon
  - Format numbers (1,234 | 234m | 78%)
- [ ] Add charts with Recharts
  - Bar chart: Submissions over time (by day)
  - Pie chart: Coverage (within 400m vs. outside)
  - Optional: Line chart for route changes over time
- [ ] Add heatmap
  - Use Google Maps HeatmapLayer
  - Plot all submission coordinates
  - Configure gradient (blue → red for density)
- [ ] Make layout screenshot-friendly
  - Clean, presentation-ready design
  - High contrast for projector
  - Print-friendly CSS
- [ ] Add export/share functionality
  - "Share" button → copy URL
  - "Download" button → export stats as PNG/PDF (optional)

**Deliverable:** Stats page ready for presentation

---

### Phase 9: Data Migration (Est: 2-3 hours)
**Goal:** Seed database with existing Google Sheet data

- [ ] Export Google Sheet as CSV
  - Download existing rider data
  - Clean data (remove invalid rows)
- [ ] Create seed script: `scripts/seed-data.ts`
  - Read CSV
  - Parse addresses
  - Batch geocode via Google Geocoding API
  - Generate placeholder `google_user_id` (`seed_001`, etc.)
  - Insert into Supabase
- [ ] Run seed script
  - Test locally first
  - Run against production Supabase
  - Verify all rows inserted
- [ ] Trigger initial route calculation
  - Call `/api/route/compute` manually
  - Wait for completion
  - Verify route appears on map
- [ ] Document seed process
  - Add instructions to README
  - Save geocoding results for reference

**Deliverable:** ~50 seed addresses loaded, route computed

---

### Phase 10: Polish & Mobile UX (Est: 3-4 hours)
**Goal:** Mobile-first responsive design ready to launch

- [ ] Add mobile bottom sheet for submit form
  - Install Vaul library (`npm install vaul`)
  - Wrap form in `<Drawer>` component
  - Mobile: bottom sheet, Desktop: sidebar
  - Add swipe gestures
- [ ] Optimize map for mobile
  - Touch-friendly zoom controls
  - Prevent accidental pan during scroll
  - Optimize marker size for touch
- [ ] Add loading states everywhere
  - Skeleton loaders for map
  - Spinner during API calls
  - Disabled state for buttons
- [ ] Add error messages
  - API failures → user-friendly message
  - Form validation errors
  - Network offline detection
- [ ] Set up error tracking
  - Install Sentry (`npm install @sentry/nextjs`)
  - Configure Sentry in Next.js
  - Test error capture
- [ ] Run Lighthouse audit
  - Test performance on mobile
  - Fix issues (image optimization, code splitting)
  - Aim for >90 score
- [ ] Test on real devices
  - iOS Safari (iPhone)
  - Android Chrome
  - Tablet (iPad)

**Deliverable:** App works smoothly on mobile devices

---

### Phase 11: Testing & Launch Prep (Est: 3-4 hours)
**Goal:** Production-ready with monitoring

- [ ] Write unit tests for algorithm
  - Test haversine distance (known values)
  - Test k-means convergence
  - Test TSP ordering
  - Test scoring function
  - Use Jest or Vitest
- [ ] Write integration tests
  - Test auth flow (sign in → API call)
  - Test submit flow (form → DB → recalc)
  - Test route fetch and display
- [ ] Set up Vercel Analytics
  - Enable in Vercel dashboard
  - Add analytics script to app
  - Monitor page views and performance
- [ ] Set up monitoring alerts
  - Sentry alerts for errors
  - Google Cloud alerts for API quota
  - Supabase alerts for DB usage
- [ ] Write API documentation
  - Document all endpoints in README
  - Include request/response examples
  - Add authentication notes
- [ ] Write setup documentation
  - Local development instructions
  - Environment variable reference
  - Deployment guide
  - Troubleshooting section
- [ ] Final pre-launch checklist
  - Test auth flow end-to-end
  - Test submission → recalc → display
  - Verify stats page
  - Check mobile responsiveness
  - Verify error tracking works
  - Test on multiple devices

**Deliverable:** Tested, monitored app ready to share

---

## Done
- [x] Write initial PRD — 2026-02-20
- [x] Set up Claude Code project structure — 2026-02-20
- [x] Create comprehensive implementation plan — 2026-02-20
- [x] Create detailed backlog — 2026-02-20
