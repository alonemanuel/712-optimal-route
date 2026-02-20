# Backlog

## In Progress

## Up Next

### Phase 1: Setup & Infrastructure
- [ ] Initialize Next.js 14+ with TypeScript and Tailwind CSS
- [ ] Set up Supabase project and tables (submissions, computed_routes)
- [ ] Configure Google APIs (Maps, Places, Directions, Geocoding)
- [ ] Connect Vercel deployment with auto-deploy from GitHub
- [ ] Document local development setup

### Phase 2: Authentication & Core UI
- [ ] Implement Supabase Auth + Google OAuth sign-in flow
- [ ] Build main page layout with Google Map placeholder
- [ ] Implement address submission form with Places Autocomplete
- [ ] Add navigation (Home, Stats, Sign In/Out)
- [ ] Test responsive design on mobile/tablet/desktop

### Phase 3: Backend API
- [ ] POST /api/submissions — Submit and upsert address
- [ ] GET /api/submissions/me — Get current user's submission
- [ ] GET /api/route — Return cached computed route
- [ ] GET /api/stats — Return metrics for stats page
- [ ] POST /api/admin/recompute — Manual recalculation trigger
- [ ] Implement debounce logic for route recalculation

### Phase 4: Route Optimization Algorithm
- [ ] Implement K-means clustering with preprocessing (dedup, outliers)
- [ ] Implement road snapping (static bus-stop list v0)
- [ ] Implement Held-Karp exact TSP for route ordering
- [ ] Implement scoring function and K selection logic
- [ ] Integrate algorithm into /api/route endpoint
- [ ] Test with seed data (50–100 submissions)

### Phase 5: Frontend Map & Stats Pages
- [ ] Display computed route polyline and stop markers on main page
- [ ] Show user's walking distance to nearest stop
- [ ] Build stats page with metrics cards and heatmap
- [ ] Add loading states during recalculation
- [ ] Implement real-time updates (optional: Supabase Realtime)

### Phase 6: Seed Data Import & Admin Tools
- [ ] Create seed.ts script to import existing Google Sheet data
- [ ] Geocode addresses via Google Geocoding API
- [ ] Build admin dashboard (protected by token)
- [ ] Add data management tools (delete, export CSV)
- [ ] Test seed import and route recalculation

### Phase 7: Polish & Deployment
- [ ] Add error handling and validation
- [ ] Performance optimization and Lighthouse audit
- [ ] Unit + integration + E2E tests
- [ ] Complete documentation (README, API, admin guide)
- [ ] Optional: custom domain setup (~$10/yr)
- [ ] Final testing and production deployment

## Done
- [x] Write initial PRD — 2026-02-20
- [x] Set up Claude Code project structure — 2026-02-20
