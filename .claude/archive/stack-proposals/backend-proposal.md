# Backend Stack Proposal

**Author:** backend-eng
**Date:** 2026-02-20

---

## 1. Backend Framework

**Chosen: FastAPI (Python)**

**Why:**
- The core logic of this project is a clustering/optimization algorithm. Python has the best ecosystem for that (scikit-learn, scipy, numpy) — no bindings or FFI needed.
- FastAPI is lightweight, async, has auto-generated OpenAPI docs, and is trivial to deploy.
- Google Auth libraries are mature in Python (`google-auth`, `authlib`).
- The API surface is tiny (~5 endpoints), so framework overhead is irrelevant.

**Alternatives considered:**
- **Next.js API routes** — Would unify frontend/backend into one deploy, but running scikit-learn in a Node/serverless environment is painful. Python is the natural fit for the algorithm work.
- **Express.js** — Same problem as above re: algorithm libraries. No advantage over FastAPI for this use case.
- **Flask** — Fine, but FastAPI gives async + Pydantic validation + auto docs for free with less code.

---

## 2. Database

**Chosen: Supabase (PostgreSQL)**

**Why:**
- Free tier: 500 MB storage, 2 GB bandwidth, unlimited API requests. Way more than enough for ~1000 rows.
- Real PostgreSQL — proper constraints, indexing, geospatial queries with PostGIS if needed later.
- Built-in auth (including Google OAuth) — could eliminate the need for a separate auth implementation entirely.
- REST and client libraries included, but we'd use it as a standard Postgres DB from FastAPI via `asyncpg` or `sqlalchemy`.
- Built-in Row Level Security if we ever need it.
- Dashboard for quick data inspection without building admin tooling.

**Alternatives considered:**
- **SQLite (file-based)** — Simplest possible, but doesn't work on serverless/ephemeral hosting (file system is wiped). Would need to use Turso (SQLite-over-HTTP) to fix this, adding complexity.
- **Turso** — Good free tier, but less ecosystem support than Postgres. Fewer tools for inspection.
- **Firebase/Firestore** — NoSQL is unnecessary complexity for a simple relational model (submissions + computed routes). Also vendor locks you into Google's query model.
- **PlanetScale** — Shut down free tier in 2024. Not viable.
- **Neon** — Good Postgres option, but Supabase bundles auth+DB which reduces total moving parts.

---

## 3. Authentication

**Chosen: Supabase Auth (Google OAuth provider)**

**Why:**
- Since we're already using Supabase for the database, its built-in auth is zero additional services.
- Google OAuth is a first-class provider — just configure client ID/secret in the Supabase dashboard.
- Handles token refresh, session management, and the "one account = one submission" constraint via the `google_user_id` from the auth profile.
- Client-side `@supabase/supabase-js` handles the entire OAuth flow — the frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and gets a session back.
- The backend validates the JWT from Supabase on API calls. FastAPI middleware can decode it with `python-jose`.

**Alternatives considered:**
- **Firebase Auth** — Excellent, but mixing Firebase Auth + Supabase DB adds two services where one suffices.
- **Manual OAuth2 with `authlib`** — More control, but requires implementing token storage, refresh, session management. Unnecessary for a 2-page app.
- **NextAuth.js** — Only relevant if we go with Next.js backend, which we're not.

---

## 4. Geocoding API

**Chosen: Google Maps Geocoding API (via Google Maps Platform)**

**Why:**
- The frontend already needs Google Maps JavaScript API for map display. Using the same platform for geocoding means one API key, one billing account, one quota to monitor.
- Free tier: $200/month credit = ~40,000 geocoding requests/month. We need ~1,000 total, ever. Not even close to the limit.
- Highest accuracy for Israeli addresses. This matters — the addresses are in Tel Aviv and some may be in Hebrew.
- Geocoding happens once per submission (then stored), so the total API call count equals total submissions.

**Alternatives considered:**
- **Nominatim (OpenStreetMap)** — Truly free, no API key needed. But geocoding accuracy for Israeli street addresses is noticeably worse than Google. For a project going to a mayor, accuracy matters.
- **Mapbox Geocoding** — Good free tier (100,000 req/month), but the frontend is using Google Maps, so adding a second maps provider for just geocoding adds complexity.
- **Geoapify** — Free tier of 3,000 req/day. Decent fallback if Google quota is a concern, but it shouldn't be.

**Note:** Geocoding should happen server-side to keep the API key out of the frontend. The backend receives the raw address, calls the Geocoding API, stores the lat/lng.

---

## 5. Hosting

**Chosen: Render (free tier)**

**Why:**
- Free tier for web services: 750 hours/month (enough for one always-on service), auto-deploy from GitHub.
- Supports Python/FastAPI natively with a simple `render.yaml` or Dockerfile.
- Persistent service (not serverless) — the route optimization algorithm needs a few seconds of CPU. Serverless cold starts + compute limits on Vercel/Netlify would be problematic for a scikit-learn computation.
- Free tier includes HTTPS, custom domains, and environment variable management.
- Simple push-to-deploy from GitHub.

**Limitations:** Free tier services spin down after 15 min of inactivity. First request after idle takes ~30s cold start. Acceptable for a ~1000-user community project.

**Alternatives considered:**
- **Vercel** — Great for frontend, but serverless functions have a 10s execution limit on free tier and limited Python support. Route optimization could exceed this.
- **Railway** — Good DX, but free tier was reduced to $5 trial credit (not ongoing free). Not truly free.
- **Fly.io** — Free tier includes 3 shared VMs. Good option, but slightly more complex setup (requires `fly.toml`, Docker). Render is simpler for a single service.
- **Google Cloud Run** — Free tier exists, but setup complexity (Docker + GCP project + IAM) is overkill for this.

---

## 6. Route Optimization Algorithm

**Chosen: scikit-learn K-Means + nearest-neighbor TSP heuristic**

**Approach:**

```
1. Cluster: K-Means (scikit-learn) with K from 5 to 15
2. Stop locations: Cluster centroids (optionally snapped to nearest road via Google Roads API)
3. Route ordering: Nearest-neighbor heuristic starting from the stop farthest from the highway endpoint
4. Evaluation: For each K, compute avg walking distance + coverage %
5. Selection: Pick K that maximizes coverage within 400m while keeping K reasonable
```

**Libraries:**
- `scikit-learn` — K-Means clustering. Battle-tested, fast for 1000 points.
- `numpy` — Distance calculations (haversine or Euclidean on projected coordinates).
- `scipy.spatial.distance` — Pairwise distance matrix for TSP heuristic.

**Why K-Means:**
- Simple, fast, deterministic (with fixed seed), well-understood.
- 1000 points with K=5-15 completes in milliseconds.
- Cluster centroids are natural "stop location" candidates.

**Alternatives considered:**
- **DBSCAN** — Density-based, doesn't require specifying K. But it discovers clusters rather than targeting a specific count, making it harder to control the number of stops.
- **Gaussian Mixture Models** — More flexible cluster shapes, but overkill. Bus stop placement doesn't need soft cluster boundaries.
- **Facility Location Problem (LP)** — The "proper" optimization approach. Could use `scipy.optimize.linprog` or Google OR-Tools. More correct in theory, but K-Means produces nearly identical results for this scale and is far simpler to implement and debug.
- **Google OR-Tools** — Good for the TSP portion, but adding a compiled C++ dependency for a nearest-neighbor heuristic over 15 nodes is overkill.

**Road snapping (optional enhancement):**
- Cluster centroids may land in the middle of a block. Google Maps Roads API or Nearest Road lookup can snap them to actual road locations.
- Roads API: included in the $200/month free credit. 100 points per request.
- Can skip this for v0 and manually adjust stops if needed.

---

## API Surface

Estimated endpoints (minimal):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/submissions` | Submit address (auth required) |
| GET | `/api/submissions/me` | Get current user's submission |
| GET | `/api/route` | Get current computed route |
| GET | `/api/stats` | Get stats for the stats page |
| POST | `/api/admin/recompute` | Force route recomputation (admin) |

The route recomputation can be triggered by a background task after new submissions, debounced with a simple in-memory timer or a lightweight task queue.

---

## Summary

| Category | Choice | Free Tier Headroom |
|----------|--------|--------------------|
| Framework | FastAPI (Python) | N/A |
| Database | Supabase (PostgreSQL) | 500 MB / ~1000 rows needed |
| Auth | Supabase Auth (Google OAuth) | 50,000 MAU free |
| Geocoding | Google Maps Geocoding API | $200/mo credit / ~1000 calls needed |
| Hosting | Render | 750 hrs/mo free |
| Algorithm | scikit-learn K-Means + nearest-neighbor TSP | N/A |

**Total cost: $0**

All choices pair naturally — Supabase handles both DB and auth, Google Maps handles both frontend maps and backend geocoding, FastAPI is the natural home for Python-based optimization code, and Render hosts it with zero config.
