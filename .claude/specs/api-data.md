# API & Data Model Spec — 712 Optimal Route

**Parent PRD:** `.claude/prd/prd-v0-200226.md`
**Parent Spec:** `.claude/specs/overview.md`
**Date:** 2026-02-20

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Data Model](#2-data-model)
3. [API Overview](#3-api-overview)
4. [API Endpoints](#4-api-endpoints)
5. [Validation Rules](#5-validation-rules)
6. [Error Format](#6-error-format)
7. [Geocoding Strategy](#7-geocoding-strategy)
8. [Data Migration](#8-data-migration)
9. [Rate Limits](#9-rate-limits)

---

## 1. Authentication Flow

### Provider: Google OAuth 2.0

**Why Google:** Every rider has a Google account (the existing form uses Google Forms). It enforces one-submission-per-person naturally via `google_user_id`.

### Flow — Step by Step

```
1. User clicks "Sign in with Google" button
2. Frontend redirects to Google OAuth consent screen:
   GET https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=<GOOGLE_CLIENT_ID>
     &redirect_uri=<BASE_URL>/api/auth/google/callback
     &response_type=code
     &scope=openid email profile
     &state=<random_csrf_token>
     &prompt=select_account

3. User grants consent. Google redirects to:
   GET <BASE_URL>/api/auth/google/callback?code=<auth_code>&state=<csrf_token>

4. Backend exchanges auth code for tokens:
   POST https://oauth2.googleapis.com/token
     { code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" }
   Response: { access_token, id_token, refresh_token, expires_in }

5. Backend decodes id_token (JWT) to extract:
   - sub (Google user ID — stable, unique)
   - email
   - name
   - picture

6. Backend creates or finds user session:
   - Look up submission by google_user_id = sub
   - If found: user has already submitted (session includes submission data)
   - If not found: user is new (session has no submission)

7. Backend creates a session JWT and sets it as an HttpOnly cookie:
   Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000

8. Backend redirects to frontend:
   302 <BASE_URL>/?auth=success

9. Frontend calls GET /api/auth/me to get session info
```

### Scopes

| Scope | Purpose |
|-------|---------|
| `openid` | Required for ID token |
| `email` | User's email (for admin identification) |
| `profile` | Display name and avatar |

### Session Management

- **Mechanism:** JWT stored in an HttpOnly, Secure, SameSite=Lax cookie named `session`.
- **Token lifetime:** 30 days. No refresh — user re-authenticates after expiry.
- **JWT payload:**

```typescript
interface SessionJWT {
  sub: string;          // google_user_id
  email: string;
  name: string;
  picture: string;
  is_admin: boolean;
  iat: number;          // issued at (unix timestamp)
  exp: number;          // expires at (unix timestamp)
}
```

- **JWT signing:** HS256 with a server-side secret (`JWT_SECRET` env var). No need for RS256 — single-server deployment.
- **No token storage in DB.** The JWT is self-contained. Validation = verify signature + check expiry.

### Sign-Out

```
POST /api/auth/signout
→ Server clears the session cookie
→ Set-Cookie: session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
→ 200 OK
```

No server-side session revocation. Token becomes invalid when the cookie is cleared.

### Admin Detection

Admin users are identified by email allowlist, stored as an environment variable:

```
ADMIN_EMAILS=alon@example.com,other-admin@example.com
```

When the JWT is created, `is_admin` is set to `true` if the user's email is in the allowlist. This is checked at login time only — changing the allowlist requires re-login.

---

## 2. Data Model

### Database: SQLite

**Why SQLite:**
- Free (no hosted DB cost)
- Single-file, zero-config — deploys with the app
- More than sufficient for expected scale (tens of thousands of rows)
- Backed up by simply copying the file
- Works with every free-tier hosting option (Render, Railway, Fly.io, etc.)

**Alternative considered:** PostgreSQL on Supabase free tier (25MB). Rejected because it adds a network dependency and the free tier has limitations. SQLite is simpler and fully sufficient.

### Schema

#### Table: `submissions`

This is the primary table. There is **no separate users table** — the submission IS the user record. A user who authenticates but hasn't submitted yet has no row; their identity lives only in the session JWT until they submit.

```sql
CREATE TABLE submissions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    google_user_id  TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    address_text    TEXT NOT NULL,
    inferred_address TEXT,                       -- normalized address from geocoding
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    is_seed         INTEGER NOT NULL DEFAULT 0,   -- 1 = imported from Google Sheet
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX idx_submissions_google_user_id ON submissions(google_user_id);
CREATE INDEX idx_submissions_coords ON submissions(lat, lng);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK, auto-generated hex | Unique submission ID |
| `google_user_id` | TEXT | NOT NULL, UNIQUE | Google `sub` claim. For seed data: `seed_<row>` |
| `email` | TEXT | NOT NULL | Google email. For seed data: `seed_<row>@import.local` |
| `display_name` | TEXT | NOT NULL | Google name. For seed data: column value or `"Rider <row>"` |
| `address_text` | TEXT | NOT NULL | Raw address as entered by user (e.g., Hebrew text, abbreviations) |
| `inferred_address` | TEXT | nullable | Canonical address from geocoding (e.g., "Solomon King Street 99, Tel Aviv-Yafo"). Allows showing users what address was understood. |
| `lat` | REAL | NOT NULL | Geocoded latitude |
| `lng` | REAL | NOT NULL | Geocoded longitude |
| `is_seed` | INTEGER | NOT NULL, DEFAULT 0 | 1 if imported from CSV |
| `created_at` | TEXT | NOT NULL, ISO 8601 | Creation timestamp |
| `updated_at` | TEXT | NOT NULL, ISO 8601 | Last update timestamp |

#### Table: `computed_routes`

Stores the most recent route computation result. Only the latest row matters — older rows are historical records.

```sql
CREATE TABLE computed_routes (
    id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    stops               TEXT NOT NULL,              -- JSON array of stop objects
    polyline            TEXT,                       -- Encoded polyline string (nullable)
    avg_walk_distance_m REAL NOT NULL,
    coverage_400m_pct   REAL NOT NULL,
    num_stops           INTEGER NOT NULL,
    total_submissions   INTEGER NOT NULL,
    k_value             INTEGER NOT NULL,           -- The K that was selected
    computed_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_computed_routes_computed_at ON computed_routes(computed_at DESC);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK | Unique route computation ID |
| `stops` | TEXT (JSON) | NOT NULL | JSON: `[{"lat": 32.08, "lng": 34.78, "label": "Dizengoff / King George"}]` |
| `polyline` | TEXT | nullable | Google encoded polyline for map rendering |
| `avg_walk_distance_m` | REAL | NOT NULL | Average haversine distance to nearest stop (meters) |
| `coverage_400m_pct` | REAL | NOT NULL | % of riders within 400m of a stop (0–100) |
| `num_stops` | INTEGER | NOT NULL | Number of stops in this route |
| `total_submissions` | INTEGER | NOT NULL | Submission count at computation time |
| `k_value` | INTEGER | NOT NULL | The K selected by the algorithm |
| `computed_at` | TEXT | NOT NULL, ISO 8601 | When this route was computed |

### Stops JSON Structure

```typescript
interface Stop {
  lat: number;
  lng: number;
  label: string;          // Human-readable name, e.g., "Dizengoff / King George"
  rider_count: number;    // Number of riders assigned to this stop's cluster
}
```

Example:
```json
[
  { "lat": 32.0853, "lng": 34.7818, "label": "Dizengoff Center", "rider_count": 12 },
  { "lat": 32.0731, "lng": 34.7925, "label": "Rothschild / Allenby", "rider_count": 8 },
  { "lat": 32.0630, "lng": 34.7900, "label": "La Guardia / Kibbutz Galuyot", "rider_count": 3 }
]
```

---

## 3. API Overview

**Base URL:** `/api`
**Content-Type:** `application/json` (all request and response bodies)
**Authentication:** Cookie-based JWT (see Section 1)

### Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google` | None | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | None | OAuth callback |
| GET | `/api/auth/me` | Required | Get current user info |
| POST | `/api/auth/signout` | Required | Sign out |
| POST | `/api/submissions` | Required | Create submission |
| GET | `/api/submissions/me` | Required | Get my submission |
| PUT | `/api/submissions/me` | Required | Update my submission |
| DELETE | `/api/submissions/me` | Required | Delete my submission |
| GET | `/api/route` | None | Get current computed route |
| GET | `/api/submissions/locations` | None | Get all submission coordinates (heatmap) |
| GET | `/api/stats` | None | Get current stats |
| POST | `/api/admin/import` | Admin | Import seed data from CSV |
| POST | `/api/admin/recalculate` | Admin | Force route recalculation |

---

## 4. API Endpoints

### 4.1 Auth — Google Redirect

**`GET /api/auth/google`**

Initiates the Google OAuth flow. The frontend navigates here (full page redirect, not AJAX).

- **Auth:** None
- **Query params:** None
- **Response:** `302 Redirect` to Google OAuth consent screen

```
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid+email+profile&state=<csrf>&prompt=select_account
```

---

### 4.2 Auth — Google Callback

**`GET /api/auth/google/callback`**

Google redirects here after user consents. Backend exchanges code for tokens, creates session.

- **Auth:** None
- **Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `code` | string | Authorization code from Google |
| `state` | string | CSRF token (validated against session) |

- **Success response:** `302 Redirect` to frontend with session cookie set

```
HTTP/1.1 302 Found
Location: /?auth=success
Set-Cookie: session=eyJ...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

- **Error responses:**

| Scenario | Response |
|----------|----------|
| Missing/invalid `code` | `302 /?auth=error&reason=invalid_code` |
| CSRF `state` mismatch | `302 /?auth=error&reason=csrf_mismatch` |
| Google token exchange fails | `302 /?auth=error&reason=google_error` |

Note: Auth errors redirect (not JSON) because this is a browser-initiated flow.

---

### 4.3 Auth — Get Current User

**`GET /api/auth/me`**

Returns the currently authenticated user's info and whether they have a submission.

- **Auth:** Required
- **Response type:**

```typescript
interface MeResponse {
  user: {
    google_user_id: string;
    email: string;
    display_name: string;
    picture: string;
    is_admin: boolean;
  };
  submission: {
    id: string;
    address_text: string;
    lat: number;
    lng: number;
    created_at: string;     // ISO 8601
    updated_at: string;     // ISO 8601
  } | null;                 // null if user hasn't submitted
  nearest_stop: {
    distance_m: number;     // Haversine distance in meters
    stop_label: string;
  } | null;                 // null if no route computed yet or no submission
}
```

- **Success response:** `200 OK`

```json
{
  "user": {
    "google_user_id": "118234567890",
    "email": "rider@gmail.com",
    "display_name": "Alon Cohen",
    "picture": "https://lh3.googleusercontent.com/a/photo",
    "is_admin": false
  },
  "submission": {
    "id": "a1b2c3d4e5f6",
    "address_text": "Dizengoff 50, Tel Aviv",
    "lat": 32.0775,
    "lng": 34.7748,
    "created_at": "2026-02-20T10:30:00Z",
    "updated_at": "2026-02-20T10:30:00Z"
  },
  "nearest_stop": {
    "distance_m": 230,
    "stop_label": "Dizengoff Center"
  }
}
```

Example when user has no submission:
```json
{
  "user": {
    "google_user_id": "118234567890",
    "email": "rider@gmail.com",
    "display_name": "Alon Cohen",
    "picture": "https://lh3.googleusercontent.com/a/photo",
    "is_admin": false
  },
  "submission": null,
  "nearest_stop": null
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No session cookie or invalid/expired JWT |

```json
{
  "error": {
    "code": "NOT_AUTHENTICATED",
    "message": "Authentication required.",
    "message_he": "נדרשת התחברות."
  }
}
```

---

### 4.4 Auth — Sign Out

**`POST /api/auth/signout`**

Clears the session cookie.

- **Auth:** Required
- **Request body:** None
- **Success response:** `200 OK`

```json
{
  "ok": true
}
```

Response header:
```
Set-Cookie: session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |

---

### 4.5 Submissions — Create

**`POST /api/submissions`**

Submits the user's address. One per Google account.

- **Auth:** Required
- **Request body:**

```typescript
interface CreateSubmissionRequest {
  address_text: string;   // Raw address string from Places Autocomplete
  lat: number;            // Latitude from Places Autocomplete result
  lng: number;            // Longitude from Places Autocomplete result
}
```

Example request:
```json
{
  "address_text": "Dizengoff 50, Tel Aviv-Yafo, Israel",
  "lat": 32.0775,
  "lng": 34.7748
}
```

Note: `lat` and `lng` come from the Google Places Autocomplete selection on the frontend. The backend does NOT re-geocode — it trusts the frontend-provided coordinates from Places API.

- **Response type:**

```typescript
interface SubmissionResponse {
  submission: {
    id: string;
    address_text: string;
    lat: number;
    lng: number;
    created_at: string;
    updated_at: string;
  };
}
```

- **Success response:** `201 Created`

```json
{
  "submission": {
    "id": "a1b2c3d4e5f6",
    "address_text": "Dizengoff 50, Tel Aviv-Yafo, Israel",
    "lat": 32.0775,
    "lng": 34.7748,
    "created_at": "2026-02-20T10:30:00Z",
    "updated_at": "2026-02-20T10:30:00Z"
  }
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |
| 409 | `ALREADY_SUBMITTED` | User already has a submission |
| 422 | `VALIDATION_ERROR` | Invalid input (see details) |

```json
{
  "error": {
    "code": "ALREADY_SUBMITTED",
    "message": "You have already submitted an address. You can update it instead.",
    "message_he": "כבר הגשת כתובת. ניתן לעדכן את הכתובת הקיימת."
  }
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "message_he": "שגיאת אימות.",
    "details": [
      {
        "field": "lat",
        "message": "Latitude must be between 31.5 and 32.5.",
        "message_he": "קו הרוחב חייב להיות בין 31.5 ל-32.5."
      }
    ]
  }
}
```

- **Side effect:** After a successful creation, the backend enqueues a debounced route recalculation (see Section 4.9 for trigger logic).

---

### 4.6 Submissions — Get Mine

**`GET /api/submissions/me`**

Returns the current user's submission, if any.

- **Auth:** Required
- **Response:** `200 OK`

If submission exists:
```json
{
  "submission": {
    "id": "a1b2c3d4e5f6",
    "address_text": "Dizengoff 50, Tel Aviv-Yafo, Israel",
    "lat": 32.0775,
    "lng": 34.7748,
    "created_at": "2026-02-20T10:30:00Z",
    "updated_at": "2026-02-20T10:30:00Z"
  }
}
```

If no submission:
```json
{
  "submission": null
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |

---

### 4.7 Submissions — Update Mine

**`PUT /api/submissions/me`**

Updates the current user's address. Same validation as create.

- **Auth:** Required
- **Request body:**

```typescript
interface UpdateSubmissionRequest {
  address_text: string;
  lat: number;
  lng: number;
}
```

Example request:
```json
{
  "address_text": "Ben Yehuda 100, Tel Aviv-Yafo, Israel",
  "lat": 32.0833,
  "lng": 34.7700
}
```

- **Success response:** `200 OK`

```json
{
  "submission": {
    "id": "a1b2c3d4e5f6",
    "address_text": "Ben Yehuda 100, Tel Aviv-Yafo, Israel",
    "lat": 32.0833,
    "lng": 34.7700,
    "created_at": "2026-02-20T10:30:00Z",
    "updated_at": "2026-02-20T11:15:00Z"
  }
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |
| 404 | `NO_SUBMISSION` | User hasn't submitted yet |
| 422 | `VALIDATION_ERROR` | Invalid input |

```json
{
  "error": {
    "code": "NO_SUBMISSION",
    "message": "You haven't submitted an address yet.",
    "message_he": "עדיין לא הגשת כתובת."
  }
}
```

- **Side effect:** Enqueues debounced route recalculation.

---

### 4.8 Submissions — Delete Mine

**`DELETE /api/submissions/me`**

Deletes the current user's submission. They can submit a new one afterward.

- **Auth:** Required
- **Request body:** None
- **Success response:** `200 OK`

```json
{
  "ok": true
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |
| 404 | `NO_SUBMISSION` | Nothing to delete |

- **Side effect:** Enqueues debounced route recalculation.

---

### 4.9 Route — Get Current

**`GET /api/route`**

Returns the latest computed route. This is the primary data source for the map display.

- **Auth:** None (public)
- **Response type:**

```typescript
interface RouteResponse {
  route: {
    id: string;
    stops: Stop[];
    polyline: string | null;
    avg_walk_distance_m: number;
    coverage_400m_pct: number;
    p90_walk_distance_m: number;          // 90th percentile walk distance
    num_stops: number;
    total_submissions: number;
    k_value: number;
    computed_at: string;                  // ISO 8601
    // Baseline comparison (current 712 route)
    current_avg_walk_distance_m: number;  // avg walk to current stops
    current_coverage_400m_pct: number;    // coverage with current stops
    current_stop_count: number;           // number of current route stops (static)
  } | null;                     // null if no route computed yet (no submissions)
}

interface Stop {
  lat: number;
  lng: number;
  label: string;
  rider_count: number;
}
```

- **Success response:** `200 OK`

```json
{
  "route": {
    "id": "f7e6d5c4b3a2",
    "stops": [
      { "lat": 32.0853, "lng": 34.7818, "label": "Dizengoff Center", "rider_count": 12 },
      { "lat": 32.0799, "lng": 34.7805, "label": "King George / Ben Zion", "rider_count": 9 },
      { "lat": 32.0731, "lng": 34.7925, "label": "Rothschild / Allenby", "rider_count": 8 },
      { "lat": 32.0680, "lng": 34.7890, "label": "Nachlat Binyamin", "rider_count": 6 },
      { "lat": 32.0630, "lng": 34.7900, "label": "La Guardia / Kibbutz Galuyot", "rider_count": 3 }
    ],
    "polyline": "o}hcDy~zhEfBgC...",
    "avg_walk_distance_m": 287.5,
    "coverage_400m_pct": 82.3,
    "p90_walk_distance_m": 550.0,
    "num_stops": 5,
    "total_submissions": 38,
    "k_value": 5,
    "computed_at": "2026-02-20T10:35:00Z",
    "current_avg_walk_distance_m": 520.0,
    "current_coverage_400m_pct": 54.0,
    "current_stop_count": 12
  }
}
```

When no route has been computed yet:
```json
{
  "route": null
}
```

---

### 4.9b Submission Locations — For Heatmap

**`GET /api/submissions/locations`**

Returns only lat/lng coordinates for all submissions. Used by the stats page heatmap. No PII — just coordinates.

- **Auth:** None (public)
- **Response type:**

```typescript
interface LocationsResponse {
  locations: { lat: number; lng: number }[];
}
```

- **Success response:** `200 OK`

```json
{
  "locations": [
    { "lat": 32.0775, "lng": 34.7748 },
    { "lat": 32.0853, "lng": 34.7818 },
    { "lat": 32.0680, "lng": 34.7890 }
  ]
}
```

- **Caching:** `Cache-Control: public, max-age=30`
- **No errors** beyond standard 500.

---

### 4.10 Stats — Get Current

**`GET /api/stats`**

Returns aggregated statistics for the stats page. Public (no auth) — this is designed to be shown during presentations.

- **Auth:** None (public)
- **Response type:**

```typescript
interface StatsResponse {
  stats: {
    total_submissions: number;
    avg_walk_distance_m: number | null;     // null if no route
    coverage_400m_pct: number | null;       // null if no route
    num_stops: number | null;               // null if no route
    k_value: number | null;                 // null if no route
    route_computed_at: string | null;       // ISO 8601, null if no route
    submissions_since_last_compute: number; // Submissions added since last recalc
    address_distribution: {
      city: string;
      count: number;
    }[];                                    // Top cities by submission count
  };
}
```

- **Success response:** `200 OK`

```json
{
  "stats": {
    "total_submissions": 47,
    "avg_walk_distance_m": 287.5,
    "coverage_400m_pct": 82.3,
    "num_stops": 5,
    "k_value": 5,
    "route_computed_at": "2026-02-20T10:35:00Z",
    "submissions_since_last_compute": 3,
    "address_distribution": [
      { "city": "Tel Aviv", "count": 32 },
      { "city": "Ramat Gan", "count": 8 },
      { "city": "Givatayim", "count": 5 },
      { "city": "Holon", "count": 2 }
    ]
  }
}
```

When no submissions exist yet:
```json
{
  "stats": {
    "total_submissions": 0,
    "avg_walk_distance_m": null,
    "coverage_400m_pct": null,
    "num_stops": null,
    "k_value": null,
    "route_computed_at": null,
    "submissions_since_last_compute": 0,
    "address_distribution": []
  }
}
```

---

### 4.11 Admin — Import Seed Data

**`POST /api/admin/import`**

Imports submissions from the existing Google Sheet CSV. Admin only.

- **Auth:** Admin required
- **Request body:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File (CSV) | The CSV file to import |
| `address_column` | string | Column name containing addresses (e.g., `"address"`) |
| `name_column` | string (optional) | Column name for display name. If omitted, uses `"Rider <row>"` |
| `skip_header` | boolean (optional) | Whether first row is headers. Default: `true` |

Example using `curl`:
```bash
curl -X POST /api/admin/import \
  -F "file=@riders.csv" \
  -F "address_column=address" \
  -F "name_column=name" \
  -F "skip_header=true"
```

- **Response type:**

```typescript
interface ImportResponse {
  imported: number;       // Successfully imported rows
  skipped: number;        // Rows skipped (geocoding failure, duplicates, etc.)
  errors: {
    row: number;
    address: string;
    reason: string;
  }[];                    // Details of skipped rows (max 100 shown)
  total_rows: number;     // Total rows in the CSV
}
```

- **Success response:** `200 OK`

```json
{
  "imported": 47,
  "skipped": 3,
  "errors": [
    { "row": 12, "address": "somewhere unclear", "reason": "Geocoding returned no results" },
    { "row": 28, "address": "", "reason": "Empty address" },
    { "row": 41, "address": "New York, NY", "reason": "Outside bounding box (lat 40.71 not in 31.5–32.5)" }
  ],
  "total_rows": 50
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |
| 403 | `FORBIDDEN` | User is not an admin |
| 422 | `VALIDATION_ERROR` | Missing file, invalid CSV format, column not found |

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required.",
    "message_he": "נדרשת הרשאת מנהל."
  }
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "message_he": "שגיאת אימות.",
    "details": [
      {
        "field": "address_column",
        "message": "Column 'address' not found in CSV. Available columns: name, street, city",
        "message_he": "העמודה 'address' לא נמצאה ב-CSV."
      }
    ]
  }
}
```

- **Side effect:** Triggers a full route recalculation after import completes.
- **Import behavior:**
  - Each imported row gets `google_user_id = "seed_<row>"` and `is_seed = 1`
  - If a `seed_<row>` ID already exists, that row is skipped (idempotent re-import)
  - Geocoding uses the Google Maps Geocoding API (see Section 7)
  - Rows that fail geocoding are skipped and reported in `errors`

---

### 4.12 Admin — Force Recalculate

**`POST /api/admin/recalculate`**

Forces an immediate route recalculation, bypassing the debounce timer.

- **Auth:** Admin required
- **Request body:** None
- **Success response:** `200 OK`

The response includes the newly computed route:

```json
{
  "route": {
    "id": "new_route_id",
    "stops": [ ... ],
    "polyline": "...",
    "avg_walk_distance_m": 295.1,
    "coverage_400m_pct": 80.5,
    "num_stops": 6,
    "total_submissions": 50,
    "k_value": 6,
    "computed_at": "2026-02-20T12:00:00Z"
  }
}
```

- **Error responses:**

| Code | Error | When |
|------|-------|------|
| 401 | `NOT_AUTHENTICATED` | No valid session |
| 403 | `FORBIDDEN` | Not admin |
| 422 | `NO_SUBMISSIONS` | No submissions in DB to compute from |

```json
{
  "error": {
    "code": "NO_SUBMISSIONS",
    "message": "Cannot compute route: no submissions exist.",
    "message_he": "לא ניתן לחשב מסלול: אין הגשות."
  }
}
```

---

### Route Recalculation Trigger Logic

Recalculation is debounced. When a submission is created, updated, or deleted:

1. A `recalculate_pending` flag is set with a timestamp.
2. A background timer checks every 30 seconds: if `recalculate_pending` is set AND at least 30 seconds have passed since the last submission change, run the algorithm.
3. During recalculation, new submissions are accepted but don't trigger another recalculation until the current one finishes.
4. The admin `POST /api/admin/recalculate` bypasses the debounce and runs immediately.

This prevents rapid-fire recalculations when multiple users submit in quick succession.

---

## 5. Validation Rules

### Submission Fields

| Field | Type | Required | Constraints | Error message (EN) | Error message (HE) |
|-------|------|----------|-------------|--------------------|--------------------|
| `address_text` | string | Yes | 1-500 chars, non-empty after trim | Address is required and must be 1-500 characters. | יש להזין כתובת (עד 500 תווים). |
| `lat` | number | Yes | 31.5 <= lat <= 32.5 | Latitude must be between 31.5 and 32.5 (greater Tel Aviv area). | קו הרוחב חייב להיות באזור תל אביב הגדולה. |
| `lng` | number | Yes | 34.2 <= lng <= 35.0 | Longitude must be between 34.2 and 35.0 (greater Tel Aviv area). | קו האורך חייב להיות באזור תל אביב הגדולה. |

### Lat/Lng Bounding Box

The bounding box for greater Tel Aviv:

```
Northwest: (32.5, 34.2)    Northeast: (32.5, 35.0)
Southwest: (31.5, 34.2)    Southeast: (31.5, 35.0)
```

This is deliberately generous. It includes all of central Israel from Netanya to Ashdod. The algorithm handles outliers gracefully — we don't need tight geographic filtering. The bounding box is a sanity check to reject clearly wrong coordinates (e.g., someone entering a European address).

### Admin Import Fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `file` | CSV file | Yes | Max 5MB, valid CSV with at least 1 data row |
| `address_column` | string | Yes | Must match a column name in the CSV header |
| `name_column` | string | No | If provided, must match a column name |
| `skip_header` | boolean | No | Default: `true` |

---

## 6. Error Format

All API errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    code: string;                   // Machine-readable error code (UPPER_SNAKE_CASE)
    message: string;                // Human-readable English message
    message_he: string;             // Human-readable Hebrew message
    details?: ValidationDetail[];   // Only present for VALIDATION_ERROR
  };
}

interface ValidationDetail {
  field: string;        // Which input field failed
  message: string;      // English explanation
  message_he: string;   // Hebrew explanation
}
```

### Error Code Catalog

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 401 | `NOT_AUTHENTICATED` | No session cookie, or JWT is invalid/expired |
| 403 | `FORBIDDEN` | User is authenticated but not admin |
| 404 | `NOT_FOUND` | Generic resource not found |
| 404 | `NO_SUBMISSION` | User has no submission to update/delete |
| 409 | `ALREADY_SUBMITTED` | User already has a submission (use PUT to update) |
| 422 | `VALIDATION_ERROR` | Request body failed validation (see `details`) |
| 422 | `NO_SUBMISSIONS` | No submissions exist (cannot compute route) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Language Strategy

Every error includes both `message` (English) and `message_he` (Hebrew). The frontend decides which to display based on the user's locale. Admin-facing messages may be English-only in the initial version.

---

## 7. Geocoding Strategy

### Two Contexts, Two Approaches

| Context | API Used | Why |
|---------|----------|-----|
| **User submission (frontend)** | Google Places Autocomplete (JS) | User selects from dropdown — lat/lng come from the selection. No server-side geocoding needed. |
| **Seed data import (backend)** | Google Maps Geocoding API (HTTP) | Free-text addresses from the Google Sheet. Must be converted to lat/lng server-side. |

### Frontend — Google Places Autocomplete

- The address input field uses `google.maps.places.Autocomplete`.
- When the user selects an autocomplete suggestion, the frontend extracts `geometry.location.lat()` and `geometry.location.lng()`.
- These coordinates are sent to the backend in the `POST /api/submissions` request.
- The backend does NOT re-geocode. It trusts the Places API result.
- **Bias:** Autocomplete is biased to Israel (set `componentRestrictions: { country: 'il' }`).

### Backend — Google Maps Geocoding API (for Import)

Used during CSV import only.

```
GET https://maps.googleapis.com/maps/api/geocode/json
  ?address=<url_encoded_address>
  &region=il
  &bounds=31.5,34.2|32.5,35.0
  &key=<GOOGLE_MAPS_API_KEY>
```

**Parameters:**
- `region=il` — bias results toward Israel
- `bounds=31.5,34.2|32.5,35.0` — bias toward greater TLV bounding box

### Rate Limits & Quotas

| API | Free Tier Limit | Our Expected Usage |
|-----|-----------------|-------------------|
| Maps JavaScript API | 28,000 map loads/month | ~500–2,000 (low traffic site) |
| Places Autocomplete | $0 with Maps JS | Included with Maps JS sessions |
| Geocoding API | $200 free credit/month (~40,000 requests) | ~50–200 (one-time seed import) |

### Geocoding Failure Handling (Import)

For each row in the CSV during import:

1. Call Geocoding API with the raw address text.
2. If the response has `status: "OK"` and at least one result:
   - Use the first result's `geometry.location`.
   - Validate lat/lng against the bounding box (31.5-32.5, 34.2-35.0).
   - If outside the box: skip the row, report as error with reason "Outside bounding box".
3. If `status: "ZERO_RESULTS"`: skip, report "Geocoding returned no results".
4. If `status: "OVER_QUERY_LIMIT"`: pause for 1 second, retry up to 3 times. If still failing, abort the entire import and report the error.
5. If any other error status: skip, report the status as the reason.

### Caching

No geocoding cache is needed:
- Frontend geocoding is done via Places Autocomplete (no server call).
- Backend geocoding is a one-time batch operation during import.
- If re-import is needed, the same addresses hit the API again (acceptable given the small dataset).

### Ambiguous Addresses

The Geocoding API may return multiple results for ambiguous addresses. Strategy:
- **Always use the first result.** The API returns results ordered by relevance.
- The `region=il` and `bounds` parameters help ensure the first result is in Israel.
- Ambiguous addresses that geocode outside the bounding box are skipped — this is acceptable.

---

## 8. Data Migration

### Overview

The existing Google Sheet has ~50 rows of rider addresses collected via Google Forms. This data must be imported into the database as seed data before launch.

### Step-by-Step Process

#### Step 1: Export CSV

1. Open the Google Sheet.
2. File > Download > Comma-separated values (.csv).
3. Verify the CSV has at least an address column.

#### Step 2: Inspect Columns

Examine the CSV to identify:
- Which column contains the address (may be named "address", "street", or Hebrew)
- Whether there's a name column
- Any other columns (they will be ignored)

#### Step 3: Import via API

```bash
curl -X POST <BASE_URL>/api/admin/import \
  -H "Cookie: session=<admin_jwt>" \
  -F "file=@riders.csv" \
  -F "address_column=<identified_column_name>" \
  -F "name_column=<name_column_if_exists>" \
  -F "skip_header=true"
```

#### Step 4: Review Results

The API response reports:
- How many rows were imported successfully
- How many were skipped and why
- Specific rows that failed with reasons

#### Step 5: Handle Failures

For skipped rows:
1. Check the `errors` array in the response.
2. Common issues:
   - **Empty address:** Remove the row from CSV or add the address manually.
   - **Geocoding failure:** The address may be too vague. Try editing it in the CSV to be more specific (e.g., add "Tel Aviv" or a street number).
   - **Outside bounding box:** The address resolved to a location outside greater TLV. Either correct the address or accept the exclusion.
3. After fixing, re-run the import. Previously imported rows (with matching `seed_<row>` IDs) are skipped automatically.

#### Step 6: Trigger Recalculation

After import, route recalculation triggers automatically. Alternatively:

```bash
curl -X POST <BASE_URL>/api/admin/recalculate \
  -H "Cookie: session=<admin_jwt>"
```

### Seed Data Rules

| Rule | Detail |
|------|--------|
| IDs | `google_user_id = "seed_<row_number>"` (1-indexed, after header) |
| Email | `seed_<row_number>@import.local` |
| Display name | From CSV name column, or `"Rider <row_number>"` if no column |
| `is_seed` flag | Set to `1` for all imported rows |
| Idempotency | Re-importing the same CSV skips existing `seed_*` IDs |
| No auth conflict | Seed IDs cannot collide with real Google user IDs (which are numeric) |

### Rollback

If the import needs to be reversed:
- Delete all rows where `is_seed = 1`.
- This is a manual DB operation (admin SQL). No API endpoint for bulk delete.
- After deletion, trigger recalculation.

```sql
DELETE FROM submissions WHERE is_seed = 1;
```

---

## 9. Rate Limits

To prevent abuse while keeping the app accessible:

| Endpoint | Rate Limit | Window | Scope |
|----------|-----------|--------|-------|
| `POST /api/submissions` | 5 requests | per minute | per user (JWT sub) |
| `PUT /api/submissions/me` | 5 requests | per minute | per user |
| `DELETE /api/submissions/me` | 5 requests | per minute | per user |
| `GET /api/route` | 60 requests | per minute | per IP |
| `GET /api/stats` | 60 requests | per minute | per IP |
| `GET /api/auth/me` | 30 requests | per minute | per IP |
| `POST /api/admin/import` | 3 requests | per hour | per user |
| `POST /api/admin/recalculate` | 10 requests | per hour | per user |

Rate limit exceeded response:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "message_he": "יותר מדי בקשות. נסה שוב מאוחר יותר."
  }
}
```

HTTP headers on every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1708423200
```

### Implementation

For a free-tier single-server deployment, rate limiting can be implemented with an in-memory store (e.g., a simple dictionary with TTL cleanup). No need for Redis.

---

## Appendix: TypeScript Type Reference

Complete type definitions for frontend developers:

```typescript
// === Auth ===
interface MeResponse {
  user: {
    google_user_id: string;
    email: string;
    display_name: string;
    picture: string;
    is_admin: boolean;
  };
  submission: SubmissionData | null;
  nearest_stop: {
    distance_m: number;
    stop_label: string;
  } | null;
}

// === Submissions ===
interface CreateSubmissionRequest {
  address_text: string;
  lat: number;
  lng: number;
}

interface UpdateSubmissionRequest {
  address_text: string;
  lat: number;
  lng: number;
}

interface SubmissionResponse {
  submission: SubmissionData;
}

interface SubmissionData {
  id: string;
  address_text: string;
  inferred_address: string | null;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

interface SubmissionNullResponse {
  submission: null;
}

// === Route ===
interface RouteResponse {
  route: RouteData | null;
}

interface RouteData {
  id: string;
  stops: Stop[];
  polyline: string | null;
  avg_walk_distance_m: number;
  coverage_400m_pct: number;
  p90_walk_distance_m: number;
  num_stops: number;
  total_submissions: number;
  k_value: number;
  computed_at: string;
  current_avg_walk_distance_m: number;
  current_coverage_400m_pct: number;
  current_stop_count: number;
}

interface LocationsResponse {
  locations: { lat: number; lng: number }[];
}

interface Stop {
  lat: number;
  lng: number;
  label: string;
  rider_count: number;
}

// === Stats ===
interface StatsResponse {
  stats: {
    total_submissions: number;
    avg_walk_distance_m: number | null;
    coverage_400m_pct: number | null;
    num_stops: number | null;
    k_value: number | null;
    route_computed_at: string | null;
    submissions_since_last_compute: number;
    address_distribution: CityCount[];
  };
}

interface CityCount {
  city: string;
  count: number;
}

// === Admin ===
interface ImportResponse {
  imported: number;
  skipped: number;
  errors: ImportError[];
  total_rows: number;
}

interface ImportError {
  row: number;
  address: string;
  reason: string;
}

// === Errors ===
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    message_he: string;
    details?: ValidationDetail[];
  };
}

interface ValidationDetail {
  field: string;
  message: string;
  message_he: string;
}

// === Generic ===
interface OkResponse {
  ok: true;
}
```
