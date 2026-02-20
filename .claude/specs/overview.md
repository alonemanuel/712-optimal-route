# Spec Overview — 712 Optimal Route

**Parent PRD:** `../docs/prd.md`
**Date:** 2026-02-20
**Note:** High-level architecture is now in `../docs/architecture.md`. This file contains resolved questions and constraints specific to implementation.

## Resolved Questions

### 1. Highway On-Ramp (Fixed Route Endpoint)

The Tel Aviv route portion ends near the **La Guardia / Kibbutz Galuyot** area, where bus 712 enters the highway toward Modi'in. The exact coordinates should be confirmed, but for algorithm purposes use approximately:

- **La Guardia St / Kibbutz Galuyot interchange** (~32.063, 34.790)
- This is the fixed endpoint — the algorithm must route TO this point.

### 2. Existing Data Size

- **Current:** ~50 responses in the Google Sheet
- **Expected:** Could grow to tens of thousands of submissions
- **Implication:** Algorithm must scale. UI must handle both sparse (50) and dense (10K+) data. Pagination/virtualization may be needed for admin views.

### 3. Address Scope

**Accept greater Tel Aviv area** — not just Tel Aviv municipality but also:
- Ramat Gan, Givatayim, Bnei Brak, Holon, Bat Yam, etc.
- Basically: anywhere a 712 rider might live that's in the metro area
- No hard geographic boundary enforcement — the algorithm handles outliers naturally (addresses far from clusters won't pull the route)
- The form should NOT reject addresses. If someone enters a Herzliya address, accept it. The algorithm will weigh it appropriately.

### 4. Road Preferences

**Prefer major roads, allow exceptions.**
- Stop locations should be snapped to main streets when possible (bus-friendly: wide, existing bus stops, easy pull-over)
- If a side street is significantly better (much closer to a dense cluster), allow it
- The algorithm should have a "major road bias" parameter

## Constraints

| Constraint | Value | Notes |
|------------|-------|-------|
| Budget | $0 | All free tiers |
| Tel Aviv stops | 5–15 | Algorithm picks optimal K |
| Fixed endpoint | La Guardia / Kibbutz Galuyot area | Route must end here |
| Fixed start | Algorithm-determined | Where data density is highest |
| One submission per user | Enforced via Google account | Seed data gets placeholder IDs |
| Language | Hebrew primary, English acceptable for code/admin | User-facing text in Hebrew |
| Target browsers | Chrome, Safari (mobile-first) | Modern only, no IE |

## Glossary

| Term | Meaning |
|------|---------|
| Stop | A proposed bus stop location on the optimized route |
| Submission | A rider's address entry (one per Google account) |
| Route | The ordered sequence of stops from start to highway endpoint |
| Coverage | % of riders within a threshold distance (400m) of a stop |
| Walk distance | Straight-line (haversine) distance from a rider's address to nearest stop |
| Seed data | Existing Google Sheet responses imported before launch |
| K | Number of stops (the algorithm tries 5–15 and picks best) |
| Greater TLV | Tel Aviv + surrounding cities (Ramat Gan, Givatayim, etc.) |

## Spec File Index

| File | Description |
|------|-------------|
| `overview.md` | This file — resolved questions, constraints, glossary |
| `ui-main-page.md` | Main page: map + submission form, wireframes, all states |
| `ui-stats-page.md` | Stats page: metrics dashboard, heatmap, wireframes |
| `algorithm.md` | Route optimization: clustering, ordering, parameters, edge cases |
| `api-data.md` | API endpoints, data model, validation, auth flow, migration |
| `ux-patterns.md` | Cross-cutting: design tokens, mobile, loading, errors, shared UI patterns |
