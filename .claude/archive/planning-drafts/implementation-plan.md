# Implementation Plan — 712 Optimal Route

**Date:** 2026-02-20
**Architecture:** Next.js Full-Stack on Vercel
**Status:** Ready for Development

---

## Executive Summary

Single Next.js application combining frontend, API routes, and Node.js algorithm. Deploys to Vercel (free tier). Uses Google Maps APIs exclusively (display, autocomplete, directions). Route follows actual roads via Google Directions API or OSRM fallback. Accepts addresses in Greater Tel Aviv Area.

**Timeline:** 4 weeks from start to launch
**Team:** 1 developer (you)
**Free tier viability:** ✅ Yes (Google Maps quota sufficient, Vercel free tier adequate)

---

## Phase 1: Foundation & Setup (Days 1-3)

**Deliverable:** Deployed Next.js skeleton with auth working

### Tasks

#### 1.1 Project Initialization
- [ ] Create Next.js 14+ project (App Router)
- [ ] Install core dependencies:
  - `@react-oauth/google` — Google authentication
  - `@googlemaps/js-api-loader` — Google Maps SDK
  - Styling: TailwindCSS (already configured in Next.js)
- [ ] Configure environment variables:
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (public, embedded in JS)
  - `GOOGLE_CLIENT_ID` (Google auth)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` (for OAuth callback)
  - `MONGODB_URI` (MongoDB connection string)
- [ ] Set up git repository and push to GitHub

#### 1.2 Database Setup
- [ ] Choose MongoDB provider: **MongoDB Atlas** (free tier: 512MB, sufficient for MVP)
  - Create cluster, generate connection string
  - Add IP whitelist for Vercel deployments
- [ ] Define schema (Mongoose or native):
  ```javascript
  // Submission
  {
    _id: ObjectId,
    googleUserId: string (unique),
    displayName: string,
    addressText: string,
    lat: float,
    lng: float,
    createdAt: datetime
  }

  // ComputedRoute (cached, single document)
  {
    _id: ObjectId,
    stops: [{lat, lng, label}],
    polyline: string,
    avgWalkDistanceM: float,
    coverage400mPct: float,
    totalSubmissions: int,
    computedAt: datetime
  }
  ```

#### 1.3 Google Cloud Setup
- [ ] Create Google Cloud project
- [ ] Enable APIs:
  - Google Maps JavaScript API (map display)
  - Places API (autocomplete)
  - Directions API (route snapping to roads) OR OSRM fallback
  - Geocoding API (seed data import)
- [ ] Create OAuth 2.0 credentials (Web app, localhost + vercel.app domain)
- [ ] Create API key with restrictions (HTTP referrers only)
- [ ] Document quota: ~28k map loads/month = ~900/day (sufficient for this MVP)

#### 1.4 Auth Flow Implementation
- [ ] Implement Google sign-in button on frontend (using `@react-oauth/google`)
- [ ] Create `/api/auth` route handler:
  - Verify JWT token from frontend
  - Create/find user in MongoDB
  - Return user session data
- [ ] Implement logout endpoint `/api/auth/logout`
- [ ] Add middleware to protect API routes (check auth header)
- [ ] Test sign-in flow locally

#### 1.5 Deployment & CI/CD
- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables in Vercel project settings
- [ ] Deploy skeleton app (auth working, empty pages)
- [ ] Verify Google Maps API key works in production (IP whitelist may affect)

**Success Criteria:**
- ✓ User can sign in with Google on live Vercel URL
- ✓ Auth session persists across page reloads
- ✓ MongoDB connection working (test with simple insert)
- ✓ All environment variables properly configured

---

## Phase 2: Frontend UI & Submission (Days 4-7)

**Deliverable:** Main page with map, form, and stats page skeleton

### Tasks

#### 2.1 Main Page Layout (Mobile-First)
- [ ] Create `/` page (app/page.tsx)
- [ ] Implement responsive layout:
  - Top: Header with title, sign-in button, user menu
  - Middle: Google Map (full width, 50% of screen on mobile)
  - Bottom: Submission form
- [ ] Use TailwindCSS for styling, ensure <3s load time (mobile)
- [ ] Add loading states and error boundaries

#### 2.2 Google Maps Integration
- [ ] Initialize Google Maps JavaScript API on client
- [ ] Render map centered on Tel Aviv (32.0853° N, 34.7818° E)
- [ ] Add map controls (zoom, pan, fullscreen)
- [ ] Style map with custom markers (blue for stops, red for submissions)
- [ ] Implement map recentering on route updates

#### 2.3 Address Input Form
- [ ] Create form with Google Places Autocomplete (address only, not all autocomplete types)
- [ ] Configure autocomplete to prioritize Greater Tel Aviv Area:
  - Use Places API `componentRestrictions` for Israel
  - Use bounds to bias toward Tel Aviv (lat/lng bounds)
- [ ] Extract lat/lng from autocomplete selection
- [ ] Add form validation (address required, non-empty)
- [ ] Implement submit button (disabled when not authenticated)
- [ ] Show submission feedback (success/error toast notifications)

#### 2.4 Stats Page Skeleton
- [ ] Create `/stats` page (app/stats/page.tsx)
- [ ] Layout (mobile-first):
  - Title: "Route Proposal Metrics"
  - Stat cards (4-6):
    - Total submissions
    - Average walking distance (meters)
    - % within 400m of stop
    - Number of stops selected
    - Data freshness timestamp
  - Heatmap placeholder (implement in Phase 3)
  - Navigation back to main page
- [ ] Make stats page screenshot-friendly (high contrast, readable fonts)

#### 2.5 Navigation & Routing
- [ ] Implement next/link for navigation between main and stats pages
- [ ] Add breadcrumbs or back button
- [ ] Ensure mobile menu if needed (header layout)

**Success Criteria:**
- ✓ Form submits with valid address (no-op backend for now)
- ✓ Map loads without errors
- ✓ Autocomplete returns lat/lng correctly
- ✓ Stats page renders (hardcoded dummy data)
- ✓ <3s page load time on mobile

---

## Phase 3: Backend API & Data Handling (Days 8-12)

**Deliverable:** Full submission flow and basic route computation

### Tasks

#### 3.1 Submission Endpoint (`POST /api/submissions`)
- [ ] Create route handler: `app/api/submissions/route.ts`
- [ ] Handler logic:
  - Extract auth token from request header
  - Verify user authenticated
  - Validate address (lat/lng provided)
  - Check for duplicate submission (user already has one)
  - Insert submission into MongoDB
  - Trigger route recalculation (with debounce)
  - Return {success, message, submission}
- [ ] Error handling:
  - 401: Not authenticated
  - 400: Invalid address
  - 409: Duplicate submission
  - 500: Database error

#### 3.2 Get Submissions Endpoint (`GET /api/submissions`)
- [ ] Return paginated list of all submissions (admin view)
- [ ] Include: googleUserId (anonymized as hash?), address, lat/lng, created_at
- [ ] Later: restrict to admin users only

#### 3.3 Get Current Route Endpoint (`GET /api/route`)
- [ ] Return cached ComputedRoute document:
  ```json
  {
    "stops": [{lat, lng, label}],
    "polyline": "encoded_string",
    "avgWalkDistanceM": 450,
    "coverage400mPct": 78,
    "totalSubmissions": 45,
    "computedAt": "2026-02-20T12:00:00Z"
  }
  ```
- [ ] No auth required (public endpoint for display)

#### 3.4 Route Recalculation (Debounced Background Job)
- [ ] Create `app/api/internal/recalculate-route/route.ts` (internal endpoint)
- [ ] Implement debounce: collect submissions for 30-60 seconds, then compute once
  - Use in-memory queue or database flag
  - Alternative: use Vercel background functions if available, else implement in submission handler
- [ ] Algorithm execution:
  - Fetch all submissions from MongoDB
  - Cluster addresses (k-means, k=5-15)
  - Snap cluster centers to roads (Google Directions API or OSRM)
  - Order stops (nearest-neighbor heuristic from start → end)
  - Compute metrics (avg walk distance, coverage %)
  - Update ComputedRoute document in MongoDB
  - Log duration (should be <10s)

#### 3.5 Distance Calculation Utility
- [ ] Haversine formula to compute distance between two (lat, lng) points
- [ ] Function to find nearest stop for a given address
- [ ] Used in metrics calculation

#### 3.6 Seed Data Import Script
- [ ] Create standalone Node.js script: `scripts/import-seed-data.ts`
- [ ] Workflow:
  - Read seed CSV (user provides file path)
  - Parse rows (address column)
  - Geocode each address via Google Geocoding API
  - Create Submission documents with placeholder googleUserId (`seed_<row>`)
  - Batch insert into MongoDB
  - Trigger route recalculation
- [ ] Add CLI: `npm run import-seed -- path/to/data.csv`
- [ ] Document: "Ask user for CSV with 'address' column"

**Success Criteria:**
- ✓ Form submission creates database entry
- ✓ Route recalculation triggers (debounced)
- ✓ Metrics computed correctly (test with mock data)
- ✓ Seed data imported successfully
- ✓ `/api/route` returns latest route

---

## Phase 4: Route Optimization Algorithm (Days 13-17)

**Deliverable:** Functional route computation with road snapping

### Tasks

#### 4.1 K-Means Clustering
- [ ] Implement or use library (e.g., `ml-kmeans` or simple custom implementation)
- [ ] Input: array of {lat, lng} (submitted addresses)
- [ ] Output: k clusters, each with centroid {lat, lng}
- [ ] Start with k=5, later parameterize to try k=5-15
- [ ] Handle edge cases: <5 submissions (k=min(k, submissions))

#### 4.2 Road Snapping (Google Directions API or OSRM)
- [ ] **Google Directions API approach:**
  - For each cluster centroid, query Directions API with:
    - Origin: centroid
    - Destination: nearby road/intersection (find via Snap to Roads API if available)
  - Extract waypoint on road closest to centroid
  - Cost: ~$0.01 per request, should be acceptable for MVP
- [ ] **OSRM Fallback (Free):**
  - Use public OSRM API (osrm.org): `/match` endpoint
  - Snap lat/lng to nearest road
  - If Google quota exhausted, fallback here

#### 4.3 Route Ordering (Nearest-Neighbor TSP Heuristic)
- [ ] Input: ordered list of stop candidates {lat, lng}
- [ ] Start point: user-selected or algorithm-determined (highest density area)
- [ ] End point: fixed (highway on-ramp coordinates, provided by user or hardcoded)
- [ ] Algorithm:
  1. Start at start point
  2. Greedily pick nearest unvisited stop
  3. Repeat until all stops visited
  4. End at highway on-ramp
- [ ] Output: ordered array of {lat, lng, label}

#### 4.4 Polyline Encoding
- [ ] Use Google Directions API to get route polyline between ordered stops
- [ ] Query: `https://maps.googleapis.com/maps/api/directions/json?origin=...&destination=...&waypoints=...`
- [ ] Extract `overview_polyline.points` (encoded polyline)
- [ ] Encode for Google Maps display on frontend

#### 4.5 Metrics Computation
- [ ] For each submission address:
  - Find nearest stop (Haversine distance)
  - Record distance
- [ ] Compute:
  - Average walk distance = mean of all distances
  - Coverage 400m = (count < 400m) / total * 100
  - Outliers = submissions >800m away (note but don't optimize toward)

#### 4.6 K Selection Strategy (5-15 stops)
- [ ] Try k values: 5, 7, 10, 13, 15
- [ ] For each k, compute coverage and avg distance
- [ ] Select k that maximizes coverage while keeping stops <= 15
- [ ] Log all k values tried and selected k reasoning

#### 4.7 Algorithm Testing
- [ ] Unit tests:
  - Clustering with known data
  - Distance calculations
  - Nearest-neighbor ordering
- [ ] Integration test with mock submissions (10-50 addresses)
- [ ] Performance test: algorithm runs <10s with 1000 submissions

**Success Criteria:**
- ✓ Algorithm produces valid 5-15 stop route
- ✓ Route follows roads (snapped via Google Directions or OSRM)
- ✓ Metrics computed accurately
- ✓ Polyline renders on map without error
- ✓ <10s execution time with 1000+ submissions

---

## Phase 5: Frontend Display & Interaction (Days 18-21)

**Deliverable:** Live map updates, user walk distance, heatmap

### Tasks

#### 5.1 Display Current Route on Map
- [ ] Fetch `/api/route` on page load and poll every 30s
- [ ] Render polyline on map (blue color, medium thickness)
- [ ] Add markers for each stop:
  - Marker icon: custom color (e.g., green)
  - Marker label: stop number (1, 2, 3, ...)
  - On hover/click: show details (e.g., coordinates)

#### 5.2 Show User's Walk Distance
- [ ] After submission, query `/api/submissions/{id}` to get user's address
- [ ] Calculate distance to nearest stop (Haversine)
- [ ] Display in toast or modal:
  - "Your nearest stop is X meters away"
  - Show marker on map highlighting their address + nearest stop
- [ ] Make it visually clear (highlight pair on map for 3-5 seconds)

#### 5.3 Real-Time Updates
- [ ] Poll `/api/route` every 30s (configurable)
- [ ] On route update:
  - Clear old polyline and markers
  - Render new route
  - Show toast: "Route updated (N submissions)"
  - Do NOT re-fetch all submissions (expensive)

#### 5.4 Heatmap on Stats Page
- [ ] Options:
  1. **Google Maps Heatmap Layer** (built-in): `google.maps.visualization.HeatmapLayer`
     - Simple, free, included in Google Maps API
     - Render on stats page map
  2. **Custom marker density**: Plot all submissions as semi-transparent circles
     - More lightweight, easier control
- [ ] Choose option 1 (Google Heatmap Layer) for MVP
- [ ] Fetch all submissions, render heatmap with lat/lng data
- [ ] Make heatmap visually distinct (red = high density)

#### 5.5 Stats Page Real-Time Updates
- [ ] Fetch stats every 60s (less frequently than main page)
- [ ] Update metric cards with animation (fade/slide)
- [ ] Show "Last updated: X seconds ago" timestamp
- [ ] Skeleton loaders while fetching

#### 5.6 Mobile Responsiveness Refinement
- [ ] Test on mobile Safari and Chrome
- [ ] Ensure map is touchable (pinch zoom, drag)
- [ ] Ensure form is readable and tappable
- [ ] Verify <3s load time on 4G mobile

**Success Criteria:**
- ✓ Route polyline renders correctly on map
- ✓ User sees walk distance after submission
- ✓ Heatmap shows on stats page
- ✓ Real-time updates work without page reload
- ✓ Mobile experience is smooth

---

## Phase 6: Admin Features & Polish (Days 22-26)

**Deliverable:** Admin panel, analytics, error handling

### Tasks

#### 6.1 Admin Panel (Minimal MVP)
- [ ] Create `/admin` page (protected, login with your own Google account)
- [ ] Add hardcoded admin email check in middleware (or use role field in DB later)
- [ ] Admin features:
  - View all submissions (paginated table)
  - View current route details
  - Manual trigger to recalculate route (for testing)
  - Export submissions as CSV
  - Delete a submission (if needed for data correction)

#### 6.2 Error Handling & Logging
- [ ] Wrap all API endpoints with try-catch
- [ ] Log errors to stdout (Vercel will capture in logs)
- [ ] Show user-friendly error messages (not stack traces)
- [ ] Handle edge cases:
  - No submissions yet (show message, skip route calc)
  - <5 submissions (use fewer clusters)
  - Geocoding API quota exceeded (fallback)
  - Google Directions API error (fallback to simple polyline)

#### 6.3 Rate Limiting
- [ ] Implement simple rate limiting on submission endpoint:
  - 1 submission per user (enforced by unique googleUserId)
  - Rate limit by IP (optional, for future spam prevention): 10 requests/minute
- [ ] Use middleware or simple in-memory counter

#### 6.4 Data Privacy & Security
- [ ] Never expose google_user_id in API responses (hash or omit)
- [ ] HTTPS only (enforced by Vercel)
- [ ] No sensitive data in logs
- [ ] Document: what data is collected, how it's used (for GDPR if needed)

#### 6.5 Performance Optimization
- [ ] Minify Google Maps JS API usage
- [ ] Cache route polyline in browser (localStorage, expire after 60s)
- [ ] Lazy-load heatmap library on stats page only
- [ ] Optimize images (none for MVP, but document if added)

#### 6.6 Documentation
- [ ] README.md: Setup instructions, deployment, architecture
- [ ] API documentation: endpoints, request/response format
- [ ] Deployment checklist: environment variables, MongoDB setup
- [ ] Seed data import instructions

**Success Criteria:**
- ✓ Admin can view all submissions
- ✓ All errors handled gracefully
- ✓ Rate limiting prevents abuse
- ✓ <3s page load time maintained

---

## Phase 7: Testing & Launch (Days 27-28)

**Deliverable:** Tested, deployed, ready for use

### Tasks

#### 7.1 Manual Testing Checklist
- [ ] Sign-in flow (Google auth)
- [ ] Submit address (valid, invalid, duplicate)
- [ ] View own walk distance
- [ ] Main page map renders and updates
- [ ] Stats page displays metrics correctly
- [ ] Heatmap renders
- [ ] Admin panel accessible and functional
- [ ] Error messages clear and helpful
- [ ] Mobile experience on 2+ devices

#### 7.2 Load Testing
- [ ] Simulate 100+ submissions via script
- [ ] Verify route recalculation <10s
- [ ] Verify no database timeout or slowdown
- [ ] Check Google Maps API quota usage (should be <500 for MVP)

#### 7.3 Pre-Launch Checklist
- [ ] All environment variables configured in Vercel
- [ ] MongoDB backup configured (optional, but recommended)
- [ ] Google Cloud APIs have sufficient quota
- [ ] Seed data imported (if applicable)
- [ ] Initial route computed and displayed
- [ ] Admin panel tested
- [ ] No console errors or warnings (browser devtools)
- [ ] Lighthouse performance score >80 on mobile
- [ ] Analytics/tracking configured (optional for MVP)

#### 7.4 Launch
- [ ] Deploy to Vercel (main branch)
- [ ] Test live URL
- [ ] Share URL with team lead / first users
- [ ] Monitor error logs for first 24 hours
- [ ] Collect feedback

#### 7.5 Post-Launch Monitoring
- [ ] Check Google Maps API quota usage daily
- [ ] Monitor MongoDB storage usage
- [ ] Verify route updates working as submissions come in
- [ ] Be ready to adjust debounce timing if needed

**Success Criteria:**
- ✓ All manual tests pass
- ✓ Load test successful (<10s with 100+ submissions)
- ✓ Live deployment stable for 24+ hours
- ✓ No critical errors in logs

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend (Vercel)              │
├─────────────────────────────────────────────────────────┤
│  Pages:                                                  │
│  • / (Main: Map + Submission Form)                      │
│  • /stats (Metrics + Heatmap)                           │
│  • /admin (Admin Panel, protected)                      │
│                                                          │
│  Libraries:                                              │
│  • @react-oauth/google (Sign-in)                        │
│  • Google Maps JS API (Display)                         │
│  • Google Places API (Autocomplete)                     │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    API Routes            Google APIs
    ┌────────────┐       ┌─────────────┐
    │ /api/...   │       │ Maps JS API │
    │ • submit   │       │ Places API  │
    │ • route    │       │ Directions  │
    │ • admin    │       │ Geocoding   │
    └─────┬──────┘       └─────────────┘
          │
    Node.js Algorithm
    ┌─────────────────┐
    │ • K-means       │
    │ • Road snapping │
    │ • TSP ordering  │
    │ • Metrics calc  │
    └────────┬────────┘
             │
    MongoDB (Atlas)
    ┌──────────────────┐
    │ • Submissions    │
    │ • ComputedRoute  │
    └──────────────────┘
```

---

## Component Breakdown

| Component | Technology | Purpose | Notes |
|-----------|-----------|---------|-------|
| Frontend | Next.js 14, React 18 | UI, forms, map display | Mobile-first TailwindCSS |
| Backend API | Next.js API routes | Submission handling, route data | Serverless functions on Vercel |
| Algorithm | Node.js (pure JS) | K-means, TSP, metrics | No external ML libraries needed |
| Maps | Google Maps JS API | Map display, autocomplete, directions, geocoding | Free tier sufficient |
| Database | MongoDB Atlas | Submissions, route cache | Free tier: 512MB (sufficient) |
| Deployment | Vercel | Hosting, CI/CD | Free tier, automatic deploys from GitHub |

---

## Risk Areas & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Google Maps API quota exhausted** | Map won't load, route calc fails | Monitor daily, implement OSRM fallback for directions snapping |
| **MongoDB Atlas connection issues** | Can't fetch/store data | Use connection pooling, retry logic, status page |
| **Route calculation >10s with many submissions** | Route stale, poor UX | Optimize algorithm (spatial indexing), increase debounce window to 60s |
| **User submits address outside Greater Tel Aviv** | Route skews toward outliers | Algorithm handles gracefully (outliers noted but not optimized toward) |
| **Google Directions API quota hit** | Polyline can't be generated | Fallback: use simple lat/lng polyline instead of snapped route |
| **Duplicate submissions (same user, different account)** | Data integrity | Enforce unique googleUserId per user, monitor for abuse |
| **Mobile UX sluggish** | Users abandon | Lazy-load heatmap, cache polyline, keep API calls minimal |

---

## Dependencies & Integration Points

### External Services
1. **Google Cloud Project**
   - Maps JavaScript API
   - Places API
   - Directions API (or fallback to OSRM)
   - Geocoding API (for seed data)
   - OAuth credentials for sign-in

2. **MongoDB Atlas**
   - Connection string, network access configured
   - Backup policy (optional)

3. **Vercel**
   - GitHub integration
   - Environment variables
   - Custom domain (optional)

### Developer Setup
```bash
# Install dependencies
npm install

# Environment variables (.env.local)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
MONGODB_URI=...

# Run dev server
npm run dev

# Deploy
git push origin main  # Vercel auto-deploys

# Seed data import
npm run import-seed -- path/to/seed.csv
```

---

## Success Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| **Page load time (mobile)** | <3s | Lighthouse, 4G throttling |
| **Route recalculation time** | <10s | With 1000+ submissions |
| **Submission success rate** | >99% | No data loss |
| **API uptime** | >99.5% | Vercel SLA |
| **User submissions** | TBD | Depends on marketing/adoption |
| **Coverage 400m** | Target: >75% | After launch, track for iteration |

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Foundation | Days 1-3 | Next.js + auth + DB skeleton |
| Phase 2: Frontend UI | Days 4-7 | Main page + stats page mockup |
| Phase 3: Backend API | Days 8-12 | Submission flow + route cache |
| Phase 4: Algorithm | Days 13-17 | Route optimization working |
| Phase 5: Display & UX | Days 18-21 | Live map, heatmap, walk distance |
| Phase 6: Admin & Polish | Days 22-26 | Admin panel, error handling |
| Phase 7: Testing & Launch | Days 27-28 | Tested, deployed, live |

**Total: 4 weeks (28 days, accounting for 1-2 buffer days)**

---

## Next Steps

1. ✅ Architecture locked (Next.js, Google Maps, MongoDB Atlas)
2. ✅ Implementation plan created (this document)
3. 📋 Detailed backlog → Task #6 (ready to create after this)
4. 🚀 Development begins with Phase 1 (Foundation)

---

**Document Created By:** prd-analyzer
**Last Updated:** 2026-02-20
**Status:** Ready for development — all ambiguities resolved, architecture finalized
