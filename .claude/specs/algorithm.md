# Algorithm Spec — Route Optimization

**Parent:** `overview.md` | **PRD:** `.claude/prd/prd-v0-200226.md`
**Date:** 2026-02-20

---

## Overview

Given N rider addresses (lat/lng), select K stops (5 <= K <= 15) and order them into a route ending at the fixed highway endpoint, minimizing average walking distance while maintaining route simplicity.

**Pipeline:**

```
Submissions (lat/lng[])
  → Preprocessing (dedup, outlier flagging)
  → For K in 5..15:
      → Cluster into K groups (k-means, haversine)
      → Snap cluster centers to roads
      → Order stops (TSP heuristic)
      → Score route
  → Pick best K by scoring function
  → Return route
```

---

## 1. Preprocessing

### Input
- `submissions: Array<{lat: float, lng: float, id: string}>`

### Steps

**1a. Deduplication**
- Round coordinates to 5 decimal places (~1.1m precision)
- Collapse identical coordinates into weighted points: `{lat, lng, weight: count}`
- Preserve all original submission IDs for metrics

**1b. Outlier Flagging**
- Compute the median center of all points
- Compute median absolute deviation (MAD) of haversine distances from center
- Flag points where `distance_from_median > median + 5 * MAD` as outliers
- Outliers are **excluded from clustering** but **included in coverage metrics** (they show up in stats as "riders not served")
- Do NOT delete outliers — keep them for transparency

**1c. Bounding Box Sanity Check**
- If any point falls outside `[31.0, 33.5] lat, [34.0, 35.5] lng` (roughly Israel bounding box), reject it as invalid data (likely geocoding error or joke submission)
- Log rejected points for admin review

### Output
- `valid_points: Array<{lat, lng, weight}>` — deduplicated, outlier-free
- `outlier_points: Array<{lat, lng, id}>` — flagged outliers
- `rejected_points: Array<{lat, lng, id, reason}>` — invalid data

---

## 2. Clustering

### Algorithm: K-Means with Haversine Distance

**Why k-means:**
- Simple, well-understood, fast (O(n * K * iterations))
- K is externally set (we iterate 5..15), so no need for density-based clustering
- Cluster centers naturally represent "average location" — ideal for stop placement
- Adequate for this scale (even 50K points completes in <1s)

**Why NOT DBSCAN/HDBSCAN:**
- Doesn't let us control the number of clusters directly
- Can produce irregular cluster counts, making K-optimization harder
- Better for discovering natural clusters, but we want to *impose* K clusters

**Why NOT k-medoids:**
- Slower (O(n^2 per iteration))
- Advantage (centers are actual data points) is irrelevant since we snap to roads anyway

### Distance Metric: Haversine

```python
def haversine(lat1, lng1, lat2, lng2) -> float:
    """Returns distance in meters between two coordinates."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lng2 - lng1)
    a = sin(dphi/2)**2 + cos(phi1) * cos(phi2) * sin(dlambda/2)**2
    return 2 * R * asin(sqrt(a))
```

**Why not Euclidean on lat/lng:** At Tel Aviv's latitude (~32 deg N), 1 degree longitude ~ 94.5 km but 1 degree latitude ~ 111 km. Euclidean would distort east-west distances by ~15%. Haversine is exact and cheap to compute.

### K-Means Implementation

Use **scikit-learn** with a custom approach: since sklearn's KMeans uses Euclidean distance, we use a two-step process:

**Option A (Recommended): Project to local Cartesian, then standard k-means**

```python
def to_local_xy(lat, lng, ref_lat, ref_lng):
    """Project to meters from a reference point. Good enough for city-scale."""
    x = haversine(ref_lat, ref_lng, ref_lat, lng)  # east-west
    if lng < ref_lng:
        x = -x
    y = haversine(ref_lat, ref_lng, lat, ref_lng)  # north-south
    if lat < ref_lat:
        y = -y
    return x, y
```

1. Compute reference point as centroid of all valid points
2. Project all points to local (x, y) meters
3. Run standard sklearn KMeans on (x, y) with `n_init=10, max_iter=300`
4. Apply sample weights from deduplication
5. Project cluster centers back to (lat, lng)

**Why this over spherical k-means:** At city scale (~20km across), the projection error is negligible (<0.01%). Standard k-means is faster, better tested, and easier to debug.

**Option B (Fallback): Iterative haversine k-means**
- Custom implementation using haversine in the assignment step
- Weighted mean for center update (this is approximate on a sphere but fine at city scale)
- Only use if Option A shows measurable distortion issues (it won't)

### Parameters

| Parameter | Default | Tunable | Notes |
|-----------|---------|---------|-------|
| `K_MIN` | 5 | Yes | Minimum number of stops |
| `K_MAX` | 15 | Yes | Maximum number of stops |
| `N_INIT` | 10 | No | Number of k-means random initializations |
| `MAX_ITER` | 300 | No | Max iterations per k-means run |
| `OUTLIER_MAD_THRESHOLD` | 5.0 | Yes | MAD multiplier for outlier detection |

### Output
- For each K in `[K_MIN..K_MAX]`: `clusters: Array<{center_lat, center_lng, member_count, member_ids}>`

---

## 3. Stop Snapping

Cluster centers land on arbitrary coordinates (possibly inside buildings, parks, or the sea). Snap them to bus-friendly road locations.

### Approach: Google Roads API Snap-to-Road + Major Road Bias

**Step 1: Snap to nearest road**

Use the Google Maps Roads API `nearestRoads` endpoint (or the Snap to Roads endpoint) to move each cluster center to the nearest road segment.

**Free tier note:** The Roads API has a generous free tier. If it's insufficient, fall back to a simple approach: use the Google Geocoding API reverse-geocode the cluster center, which returns a street address on the nearest road.

**Step 2: Major road bias**

```python
def snap_with_bias(center_lat, center_lng, major_road_bias=0.3):
    """
    Snap cluster center to road, with preference for major roads.

    1. Query nearby roads within SNAP_RADIUS
    2. For each candidate road point:
       - Compute walk_penalty = haversine(center, candidate)
       - Compute road_bonus = major_road_score(candidate) * MAJOR_ROAD_WEIGHT
       - score = -walk_penalty + road_bonus
    3. Return candidate with highest score
    """
```

**Major road detection:**
- Use Google Places API `nearbySearch` with type `bus_station` near the cluster center — existing bus stops are by definition on bus-friendly roads
- Alternatively, reverse-geocode and check if the road name contains known major road keywords (maintained in a config list, e.g., ["Ibn Gvirol", "Dizengoff", "Rothschild", "Arlozorov", "Namir", "Kaplan", "Begin", "Kibbutz Galuyot", "La Guardia"])
- If no major road is found within `SNAP_RADIUS`, accept the nearest road as-is

**Fallback (if APIs are too expensive):**
- Maintain a static list of candidate bus-stop coordinates (existing bus stops in greater TLV, scraped once from GTFS data or Google Maps)
- Snap each cluster center to the nearest candidate from this list
- Cheaper, deterministic, and arguably better since these locations already have bus infrastructure

### Parameters

| Parameter | Default | Tunable | Notes |
|-----------|---------|---------|-------|
| `SNAP_RADIUS_M` | 300 | Yes | Max distance to move a cluster center to snap to a road |
| `MAJOR_ROAD_BIAS` | 0.3 | Yes | 0.0 = no bias, 1.0 = always prefer major road within radius |
| `MAJOR_ROAD_KEYWORDS` | (config list) | Yes | Known major street names for heuristic detection |

### Edge Case: Sea/Water

If a cluster center falls in the Mediterranean (west of approximately lng 34.74 in the TLV area):
- Push it east to the nearest valid road
- This can happen if rider addresses are along the coast and the centroid drifts west
- Detection: reverse-geocode the point; if no road is returned, shift east in 50m increments until a road is found (max 10 attempts, then flag for admin review)

### Output
- `snapped_stops: Array<{lat, lng, original_center_lat, original_center_lng, snap_distance_m, road_name}>`

---

## 4. Route Ordering

Given K snapped stops + 1 fixed endpoint, find an efficient traversal order.

### Problem Formulation

This is a variant of TSP with:
- **No fixed start** — the algorithm picks the start point (farthest stop from the endpoint, or the stop in the densest area)
- **Fixed end** — La Guardia / Kibbutz Galuyot (~32.063, 34.790)
- **K+1 nodes** (K stops + 1 endpoint), so K is 5..15 meaning 6..16 nodes total

### Algorithm: Nearest Neighbor + 2-opt Improvement

**Why:**
- At K <= 15 nodes, even brute force is feasible (15! = 1.3 trillion, but with branch-and-bound it's fast). However, nearest-neighbor + 2-opt gives near-optimal results and is simpler to implement.
- Christofides algorithm guarantees 1.5x optimal but is overkill for 15 nodes.
- For K <= 12, exact solution via Held-Karp DP is O(2^K * K^2) which is ~600K operations for K=12 — entirely feasible. For K=15 it's ~7.4M — still fine.

**Recommended: Held-Karp exact TSP for K <= 15**

Since our K is always <= 15, we can use the exact DP solution:

```python
def held_karp_tsp(dist_matrix, start_idx, end_idx):
    """
    Exact TSP with fixed start and end.

    dist_matrix: (K+1) x (K+1) pairwise haversine distances
    start_idx: index of the starting stop
    end_idx: index of the fixed endpoint (La Guardia)

    Returns: optimal ordering of stops, total route distance

    Complexity: O(2^n * n^2) where n = K+1
    For n=16: ~4.2M operations — completes in <100ms
    """
    n = len(dist_matrix)
    # Standard Held-Karp DP
    # dp[S][i] = min distance to reach node i, having visited set S
    dp = [[float('inf')] * n for _ in range(1 << n)]
    parent = [[(-1, -1)] * n for _ in range(1 << n)]

    dp[1 << start_idx][start_idx] = 0

    for S in range(1 << n):
        for u in range(n):
            if dp[S][u] == float('inf'):
                continue
            if not (S & (1 << u)):
                continue
            for v in range(n):
                if S & (1 << v):
                    continue
                new_S = S | (1 << v)
                new_dist = dp[S][u] + dist_matrix[u][v]
                if new_dist < dp[new_S][v]:
                    dp[new_S][v] = new_dist
                    parent[new_S][v] = (S, u)

    # Reconstruct path ending at end_idx
    full_mask = (1 << n) - 1
    optimal_dist = dp[full_mask][end_idx]

    # Backtrack to get ordering
    path = []
    S, u = full_mask, end_idx
    while u != -1:
        path.append(u)
        S_prev, u_prev = parent[S][u]
        S, u = S_prev, u_prev
    path.reverse()

    return path, optimal_dist
```

### Start Point Selection

The route start is NOT fixed. The algorithm picks the best start:

```python
def select_start_point(stops, endpoint, clusters):
    """
    Pick the start stop. Strategy: the stop farthest from the endpoint
    that serves a large cluster.

    Score each stop:
      start_score = distance_to_endpoint * 0.7 + cluster_weight * 0.3

    The stop with highest start_score becomes the start.
    Intuition: start where riders are, far from the highway.
    """
    scores = []
    for i, stop in enumerate(stops):
        dist = haversine(stop.lat, stop.lng, endpoint.lat, endpoint.lng)
        weight = clusters[i].member_count / max(c.member_count for c in clusters)
        scores.append(dist * 0.7 + weight * 0.3)
    return argmax(scores)
```

**Alternative approach:** Run Held-Karp with every possible start node, keep the route with the lowest total distance. Since K <= 15, this means at most 15 TSP runs — still <2s total. This is the better approach if simplicity of implementation is preferred over the heuristic scoring.

**Recommended:** Run Held-Karp from all possible start nodes. Pick the route with the lowest total travel distance. This is exact and fast enough.

### Output
- `ordered_route: Array<{lat, lng, label, cluster_member_count}>` — stops in traversal order, ending at the fixed endpoint
- `total_route_distance_m: float` — total route length in meters

---

## 5. Scoring & K Selection

### Scoring Function

For each candidate K (5..15), compute a score that balances rider convenience against route complexity.

```python
def score_route(K, stops, all_submissions, outlier_points):
    """
    Score a route configuration. LOWER is better.

    Components:
    - avg_walk: average haversine distance from each rider to nearest stop (meters)
    - coverage: fraction of riders within 400m of a stop
    - route_length: total route distance in meters (proxy for bus travel time)
    - K_penalty: slight preference for fewer stops (simpler route)
    """
    # Compute per-rider metrics (including outliers for honesty)
    all_points = all_submissions + outlier_points
    walk_distances = []
    for point in all_points:
        min_dist = min(haversine(point, stop) for stop in stops)
        walk_distances.append(min_dist)

    avg_walk = mean(walk_distances)
    coverage_400 = sum(1 for d in walk_distances if d <= 400) / len(walk_distances)
    route_length = total_route_distance(stops)

    # Normalized score (lower is better)
    score = (
        AVG_WALK_WEIGHT * avg_walk
        + COVERAGE_WEIGHT * (1 - coverage_400) * 1000  # scale to meters-ish
        + ROUTE_LENGTH_WEIGHT * route_length / 1000     # convert to km
        + K_PENALTY_WEIGHT * K
    )

    return score
```

### Scoring Parameters

| Parameter | Default | Tunable | Notes |
|-----------|---------|---------|-------|
| `AVG_WALK_WEIGHT` | 1.0 | Yes | Weight for average walking distance |
| `COVERAGE_WEIGHT` | 2.0 | Yes | Weight for coverage gap (higher = prioritize coverage) |
| `ROUTE_LENGTH_WEIGHT` | 0.1 | Yes | Weight for total route length |
| `K_PENALTY_WEIGHT` | 10.0 | Yes | Penalty per additional stop |
| `COVERAGE_THRESHOLD_M` | 400 | Yes | Distance threshold for "covered" riders |

### K Selection Logic

```python
def find_optimal_k(submissions, outliers, endpoint, params):
    """
    Try all K from K_MIN to K_MAX. Return the K with the lowest score.
    """
    best_score = float('inf')
    best_route = None

    for K in range(params.K_MIN, params.K_MAX + 1):
        clusters = run_kmeans(submissions, K)
        stops = snap_to_roads(clusters)
        start = select_start_from_all(stops, endpoint)  # try all starts
        route, route_dist = held_karp_tsp(stops, start, endpoint)
        score = score_route(K, route, submissions, outliers)

        if score < best_score:
            best_score = score
            best_route = {
                'K': K,
                'stops': route,
                'score': score,
                'avg_walk': avg_walk,
                'coverage_400': coverage_400,
                'route_distance': route_dist,
            }

    return best_route
```

### Elbow Detection (Optional Enhancement)

If the score curve has a clear elbow (diminishing returns), prefer the elbow point over the absolute minimum. This prevents overfitting to the data when the score difference between K=8 and K=12 is marginal.

```python
def apply_elbow_preference(scores_by_k):
    """
    If adding more stops yields <5% improvement, stop at the elbow.
    """
    for k in sorted(scores_by_k.keys()):
        if k == K_MIN:
            continue
        improvement = (scores_by_k[k-1] - scores_by_k[k]) / scores_by_k[k-1]
        if improvement < 0.05:
            return k - 1  # elbow point
    return max(scores_by_k.keys())  # no elbow found, use max
```

---

## 6. Complete Pipeline Pseudocode

```python
def compute_optimal_route(submissions: List[Submission], params: AlgoParams) -> Route:
    """
    Main entry point. Called on recalculation trigger.

    Returns a Route object ready for display and caching.
    """
    ENDPOINT = LatLng(32.063, 34.790)  # La Guardia / Kibbutz Galuyot

    # --- Step 1: Preprocess ---
    valid, outliers, rejected = preprocess(submissions)

    if len(valid) < params.K_MIN:
        # Not enough data for meaningful clustering
        return Route(
            stops=[],
            status='insufficient_data',
            message=f'Need at least {params.K_MIN} valid submissions, have {len(valid)}',
            total_submissions=len(submissions),
        )

    # --- Step 2: Project to local coordinates ---
    ref_lat = mean(p.lat for p in valid)
    ref_lng = mean(p.lng for p in valid)
    xy_points = [to_local_xy(p.lat, p.lng, ref_lat, ref_lng, weight=p.weight) for p in valid]

    # --- Step 3: Try all K values ---
    candidates = []

    for K in range(params.K_MIN, min(params.K_MAX + 1, len(valid) + 1)):
        # 3a. Cluster
        kmeans = KMeans(n_clusters=K, n_init=params.N_INIT, max_iter=params.MAX_ITER)
        kmeans.fit(xy_points, sample_weight=[p.weight for p in xy_points])
        centers_xy = kmeans.cluster_centers_

        # 3b. Convert centers back to lat/lng
        centers_latlng = [from_local_xy(c, ref_lat, ref_lng) for c in centers_xy]

        # 3c. Build cluster metadata
        labels = kmeans.labels_
        clusters = build_cluster_metadata(centers_latlng, labels, valid)

        # 3d. Snap to roads
        snapped = [snap_with_bias(c.lat, c.lng, params.MAJOR_ROAD_BIAS) for c in centers_latlng]

        # 3e. Build distance matrix (stops + endpoint)
        nodes = snapped + [ENDPOINT]
        dist_matrix = build_haversine_matrix(nodes)

        # 3f. Find optimal route (try all start nodes)
        best_route_for_k = None
        for start_idx in range(len(snapped)):  # don't start at endpoint
            route, dist = held_karp_tsp(dist_matrix, start_idx, len(snapped))
            if best_route_for_k is None or dist < best_route_for_k.distance:
                best_route_for_k = RouteCandidate(
                    K=K,
                    ordering=route,
                    distance=dist,
                    stops=snapped,
                    clusters=clusters,
                )

        # 3g. Score
        best_route_for_k.score = score_route(
            K, best_route_for_k, submissions, outliers, params
        )
        candidates.append(best_route_for_k)

    # --- Step 4: Select best K ---
    candidates.sort(key=lambda c: c.score)
    winner = candidates[0]

    # Optional: apply elbow preference
    # winner = apply_elbow_preference(candidates)

    # --- Step 5: Build final route ---
    ordered_stops = [winner.stops[i] for i in winner.ordering]

    # Compute metrics
    walk_distances = compute_walk_distances(submissions, ordered_stops)

    return Route(
        stops=[
            Stop(
                lat=s.lat,
                lng=s.lng,
                label=f'Stop {i+1}',
                cluster_size=winner.clusters[i].member_count,
                road_name=s.road_name,
            )
            for i, s in enumerate(ordered_stops[:-1])  # exclude endpoint
        ],
        endpoint=ENDPOINT,
        avg_walk_distance_m=mean(walk_distances),
        coverage_400m_pct=sum(1 for d in walk_distances if d <= 400) / len(walk_distances),
        total_submissions=len(submissions),
        valid_submissions=len(valid),
        outlier_count=len(outliers),
        rejected_count=len(rejected),
        K=winner.K,
        score=winner.score,
        route_distance_m=winner.distance,
        computed_at=datetime.utcnow(),
        status='ok',
    )
```

---

## 7. Recalculation Strategy

### Trigger Conditions

A recalculation is triggered when:
1. **New submission** — a rider submits their address
2. **Submission deleted** — admin removes a submission (spam, duplicate account, etc.)
3. **Manual trigger** — admin clicks "Recalculate" button
4. **Seed data import** — initial data load from Google Sheet

### Debounce Logic

Submissions arrive sporadically. Recalculating on every single one is wasteful.

```python
DEBOUNCE_SECONDS = 30  # Wait 30s after last submission before recalculating
MIN_RECALC_INTERVAL = 60  # Never recalculate more often than once per 60s

class RecalcScheduler:
    def __init__(self):
        self.pending_timer = None
        self.last_recalc_at = 0
        self.is_computing = False

    def on_submission(self):
        """Called when a new submission arrives."""
        if self.pending_timer:
            cancel(self.pending_timer)

        self.pending_timer = schedule(
            self._maybe_recalc,
            delay=DEBOUNCE_SECONDS
        )

    def _maybe_recalc(self):
        now = time()
        if now - self.last_recalc_at < MIN_RECALC_INTERVAL:
            # Too soon, reschedule
            remaining = MIN_RECALC_INTERVAL - (now - self.last_recalc_at)
            self.pending_timer = schedule(self._maybe_recalc, delay=remaining)
            return

        if self.is_computing:
            # Already running, will pick up new data when done
            self.needs_rerun = True
            return

        self._run_recalc()

    def _run_recalc(self):
        self.is_computing = True
        self.last_recalc_at = time()

        try:
            submissions = db.get_all_submissions()
            route = compute_optimal_route(submissions, get_params())
            db.cache_route(route)
            broadcast_route_update(route)  # push to connected clients
        finally:
            self.is_computing = False
            if self.needs_rerun:
                self.needs_rerun = False
                self.on_submission()  # re-trigger with latest data
```

### Incremental vs Full Recompute

**Always do full recompute.** Rationale:
- K-means is inherently global (adding one point can shift all clusters)
- The computation is fast enough even at 50K points (<5s)
- Incremental k-means is complex and error-prone
- The debounce ensures we don't recompute too often

### Concurrent Request Handling

- Only one recalculation runs at a time (guarded by `is_computing` flag)
- If a new submission arrives during computation, set `needs_rerun = True`
- When the current computation finishes, it checks `needs_rerun` and triggers another pass
- Clients always read from the cached route — they never wait for computation

### Parameters

| Parameter | Default | Tunable | Notes |
|-----------|---------|---------|-------|
| `DEBOUNCE_SECONDS` | 30 | Yes | Wait after last submission before recalc |
| `MIN_RECALC_INTERVAL` | 60 | Yes | Minimum time between recalculations |

---

## 8. Edge Cases

### Few Submissions (N < K_MIN)

- If `N < 5`: Return a special status `insufficient_data` with a message
- Display a "waiting for more submissions" state on the map
- Show submitted points but no route

### All Submissions in One Area

- K-means with K > 1 will still produce K clusters, some very close together
- After snapping, if two stops are within `MIN_STOP_DISTANCE_M` (default: 200m), merge them into one
- This naturally reduces K — the scoring function will then favor the lower K anyway

```python
MIN_STOP_DISTANCE_M = 200

def merge_close_stops(stops):
    merged = []
    used = set()
    for i, s1 in enumerate(stops):
        if i in used:
            continue
        group = [s1]
        for j, s2 in enumerate(stops[i+1:], i+1):
            if j in used:
                continue
            if haversine(s1, s2) < MIN_STOP_DISTANCE_M:
                group.append(s2)
                used.add(j)
        # Weighted average of merged stops
        merged.append(weighted_center(group))
        used.add(i)
    return merged
```

### Outliers (Riders Far From Everything)

- Handled in preprocessing (Section 1b)
- Excluded from clustering so they don't pull stops toward them
- Included in coverage metrics so the stats page accurately reflects "riders NOT served"
- If >30% of submissions are outliers, flag for admin review (the MAD threshold may need adjustment)

### Duplicate Accounts

- Enforced at the application layer (one submission per Google account)
- Seed data uses `seed_<row>` IDs — no collision with real Google IDs
- If a user updates their address, the old submission is replaced (not duplicated)

### Large Scale (10K+ Submissions)

Performance profile for `compute_optimal_route`:

| N (submissions) | Preprocessing | K-means (per K) | Snap (per K) | TSP (per K) | Scoring (per K) | Total (11 K values) |
|-----------------|--------------|-----------------|-------------|------------|----------------|-------------------|
| 50 | <1ms | <1ms | ~500ms* | <1ms | <1ms | ~6s |
| 1,000 | <10ms | <10ms | ~500ms* | <1ms | <5ms | ~6s |
| 10,000 | <50ms | <100ms | ~500ms* | <1ms | <50ms | ~8s |
| 50,000 | <200ms | <500ms | ~500ms* | <1ms | <200ms | ~15s |

*Snap time is API-call-bound (one call per cluster center per K). With static stop list fallback, snap is <1ms.

**Key insight:** The bottleneck is road-snapping API calls, not computation. With K_MAX=15 and 11 K values, that's up to 165 API calls. Mitigation:
- Cache snap results — the same cluster center (within 10m) maps to the same road point
- Use the static bus-stop list fallback for zero API cost
- Snap is per-cluster-center (max 15), not per-submission

### Addresses in the Sea

- Cluster centers can drift west of the coastline
- Detected in snap step: if reverse-geocode returns no road, shift east (see Section 3)
- Individual submissions in the sea are caught by the Israel bounding box check in preprocessing

### All Submissions on One Street

- K-means will spread stops along the street
- Route ordering will be trivially linear
- This is actually the correct behavior — a linear route along a single dense corridor

---

## 9. Data Structures

```typescript
// Input
interface Submission {
  id: string;
  lat: number;
  lng: number;
}

interface AlgoParams {
  K_MIN: number;              // default: 5
  K_MAX: number;              // default: 15
  N_INIT: number;             // default: 10
  MAX_ITER: number;           // default: 300
  OUTLIER_MAD_THRESHOLD: number; // default: 5.0
  SNAP_RADIUS_M: number;     // default: 300
  MAJOR_ROAD_BIAS: number;   // default: 0.3
  AVG_WALK_WEIGHT: number;   // default: 1.0
  COVERAGE_WEIGHT: number;   // default: 2.0
  ROUTE_LENGTH_WEIGHT: number; // default: 0.1
  K_PENALTY_WEIGHT: number;  // default: 10.0
  COVERAGE_THRESHOLD_M: number; // default: 400
  MIN_STOP_DISTANCE_M: number;  // default: 200
  DEBOUNCE_SECONDS: number;  // default: 30
  MIN_RECALC_INTERVAL: number;  // default: 60
}

// Output
interface Route {
  stops: Stop[];
  endpoint: LatLng;
  avg_walk_distance_m: number;
  coverage_400m_pct: number;
  total_submissions: number;
  valid_submissions: number;
  outlier_count: number;
  rejected_count: number;
  K: number;
  score: number;
  route_distance_m: number;
  computed_at: string;        // ISO 8601
  status: 'ok' | 'insufficient_data';
  message?: string;           // only if status != 'ok'
}

interface Stop {
  lat: number;
  lng: number;
  label: string;              // "Stop 1", "Stop 2", ...
  cluster_size: number;       // riders in this stop's cluster
  road_name?: string;         // street name from snap
}

interface LatLng {
  lat: number;
  lng: number;
}
```

---

## 10. All Parameters Summary

| Parameter | Default | Section | Impact |
|-----------|---------|---------|--------|
| `K_MIN` | 5 | Clustering | Minimum stops to try |
| `K_MAX` | 15 | Clustering | Maximum stops to try |
| `N_INIT` | 10 | Clustering | K-means restarts (quality vs speed) |
| `MAX_ITER` | 300 | Clustering | K-means convergence limit |
| `OUTLIER_MAD_THRESHOLD` | 5.0 | Preprocessing | How aggressively to flag outliers |
| `SNAP_RADIUS_M` | 300 | Stop Snapping | Max road-snap distance |
| `MAJOR_ROAD_BIAS` | 0.3 | Stop Snapping | 0=nearest road, 1=always major road |
| `MAJOR_ROAD_KEYWORDS` | (list) | Stop Snapping | Known major streets |
| `AVG_WALK_WEIGHT` | 1.0 | Scoring | Importance of walk distance |
| `COVERAGE_WEIGHT` | 2.0 | Scoring | Importance of 400m coverage |
| `ROUTE_LENGTH_WEIGHT` | 0.1 | Scoring | Importance of total route length |
| `K_PENALTY_WEIGHT` | 10.0 | Scoring | Penalty per extra stop |
| `COVERAGE_THRESHOLD_M` | 400 | Scoring | "Covered" = within this distance |
| `MIN_STOP_DISTANCE_M` | 200 | Edge Cases | Merge stops closer than this |
| `DEBOUNCE_SECONDS` | 30 | Recalculation | Wait after last submission |
| `MIN_RECALC_INTERVAL` | 60 | Recalculation | Min seconds between recalcs |
| `ENDPOINT_LAT` | 32.063 | Route | Fixed endpoint latitude |
| `ENDPOINT_LNG` | 34.790 | Route | Fixed endpoint longitude |

All parameters should be configurable via environment variables or a config file. The defaults are reasonable starting points for the Tel Aviv use case.
