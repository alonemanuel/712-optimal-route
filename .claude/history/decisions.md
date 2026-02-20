# Decision Log

## [2026-02-20] Backend Architecture: Next.js Full-Stack
**Context:** Needed to choose between a monolithic Next.js app vs. separate FastAPI backend
**Decision:** Next.js Full-Stack with API routes (no separate Python backend)
**Rationale:**
- Algorithm tested in Node.js: k-means runs in <100ms for 1K points
- Simpler deployment (single app on Vercel)
- Faster development (no cross-service coordination)
- Adequate performance for this scale
- Can always split later if needed

**Alternatives considered:**
- FastAPI backend on Render: More robust for ML, but unnecessary complexity for MVP

---

## [2026-02-20] Maps Solution: Google Maps (Full)
**Context:** Needed mapping solution with geocoding and display
**Decision:** Use Google Maps JavaScript API for both display and Places Autocomplete
**Rationale:**
- PRD requires Google Places Autocomplete for address input
- Google Maps API free tier ($200/mo credit) sufficient for expected usage
- Single provider simplifies integration
- Excellent Hebrew/Israeli address coverage
- Better UX than alternatives for autocomplete

**Alternatives considered:**
- MapLibre + Nominatim: Completely free, but weaker address autocomplete UX
- MapLibre + Google Places (hybrid): Added complexity for minimal cost savings

---

## [2026-02-20] Route Display: Follow Actual Roads
**Context:** Needed to decide how to display route between stops
**Decision:** Use Google Directions API (or OSRM) to snap route to real roads
**Rationale:**
- More realistic and professional for mayor presentation
- Better represents actual bus route feasibility
- Directions API within free tier limits
- OSRM (free OSM) available as fallback

**Alternatives considered:**
- Direct geometric lines: Simpler but less realistic, poor optics for official proposal

---

## [2026-02-20] Address Validation: Greater Tel Aviv Area
**Context:** Needed to decide geographic scope for address acceptance
**Decision:** Accept Greater Tel Aviv area, no strict city boundary enforcement
**Rationale:**
- Bus 712 may serve areas adjacent to Tel Aviv proper
- Hard boundaries could reject legitimate riders near borders
- Algorithm handles outliers gracefully (flags but doesn't reject)
- More inclusive approach, better data collection

**Alternatives considered:**
- Strict Tel Aviv city boundaries: Risks excluding valid riders in border areas
