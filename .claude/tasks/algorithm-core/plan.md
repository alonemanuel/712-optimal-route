# Task: Implement Algorithm Core (Phase 1)

## Goal
Build the complete route optimization algorithm in TypeScript, generating optimal bus stops from mock rider submissions.

**Acceptance Criteria:**
- All 7 subtasks completed
- End-to-end: mock data → preprocessing → clustering → snapping → TSP → scoring → best route output
- Performance: Completes <1s for 50 points
- Zero TypeScript errors
- Unit tests for each module

---

## Subtasks

### 1. Distance & Projection Utilities (`lib/algorithm/distance.ts`)
- [ ] Haversine distance function (meters, on sphere)
- [ ] Local XY projection (lat/lng → x/y meters around reference point)
- [ ] Inverse projection (x/y → lat/lng)
- [ ] Unit tests with known coordinates

**Dependency:** types-agent completed (types.ts exists)
**Estimated time:** Quick

---

### 2. Preprocessing Module (`lib/algorithm/preprocess.ts`)
- [ ] Deduplication: round to 5 decimals, collapse to weighted points
- [ ] Median center calculation
- [ ] MAD (Median Absolute Deviation) outlier detection
- [ ] Bounding box validation (Israel bounds)
- [ ] Output: valid_points, outlier_points, rejected_points

**Dependency:** distance utils, types
**Input source:** mock data (will generate if needed)
**Estimated time:** Medium

---

### 3. Mock Data Generator (`lib/algorithm/mock-data.ts`)
- [ ] Generate ~50 random addresses within Tel Aviv bounds (31.8-32.1 lat, 34.7-34.9 lng)
- [ ] Add 5-10% outliers (far addresses, e.g., Ramat Hasharon, Jaffa)
- [ ] Add 1-2 invalid points (outside Israel bounding box)
- [ ] Export as JSON for reuse
- [ ] Function to load mock data for testing

**Dependency:** types
**Estimated time:** Quick

---

### 4. K-Means Clustering (`lib/algorithm/kmeans.ts`)
- [ ] Local projection of all points
- [ ] Initialize k-means++ centers
- [ ] Main k-means loop (assign → update centroids → check convergence)
- [ ] Support weighted points (from deduplication)
- [ ] Project centers back to lat/lng
- [ ] Return clusters with metadata (center, member_ids, member_count)

**Dependency:** distance utils, preprocessing, types
**Algorithm reference:** Section 2 of algorithm.md
**Estimated time:** Longer

---

### 5. TSP Solver with Held-Karp (`lib/algorithm/tsp.ts`)
- [ ] Held-Karp exact DP for TSP
- [ ] Compute distance matrix from haversine
- [ ] Run TSP from each possible start node
- [ ] Select best start (lowest total distance)
- [ ] Return ordered route + total distance

**Dependency:** distance utils, types
**Algorithm reference:** Section 4 of algorithm.md
**Note:** May need numeric.js or custom matrix ops for DP table
**Estimated time:** Longer

---

### 6. Scoring Function (`lib/algorithm/scoring.ts`)
- [ ] Compute average walk distance for all riders to nearest stop
- [ ] Compute coverage % (riders within 400m of a stop)
- [ ] Score combines: avg_walk_weight * avg_walk + coverage_weight * (1 - coverage) + route_length_weight * route / 1000 + K_penalty * K
- [ ] Configurable weights (with defaults from algorithm.md)

**Dependency:** distance utils, types
**Algorithm reference:** Section 5 of algorithm.md
**Estimated time:** Quick

---

### 7. Main Algorithm Pipeline (`lib/algorithm/optimize.ts`)
- [ ] Orchestrate: preprocess → for K in [5..15]: cluster(K) → TSP → score → pick best
- [ ] Handle road snapping placeholder (TODO: real snapping in Phase 4)
- [ ] Return final route + metrics

**Dependency:** All modules above
**Estimated time:** Medium

---

## Implementation Order

**Recommended order (follows data flow):**

1. Distance utilities (foundation for everything)
2. Mock data generator (enables testing without user input)
3. Preprocessing (first real pipeline step)
4. K-means clustering (core algorithm)
5. TSP solver (route ordering)
6. Scoring (K selection)
7. Main pipeline (orchestration)

---

## Files to Create

```
lib/algorithm/
├── distance.ts       (subtask 1)
├── preprocess.ts     (subtask 2)
├── mock-data.ts      (subtask 3)
├── kmeans.ts         (subtask 4)
├── tsp.ts            (subtask 5)
├── scoring.ts        (subtask 6)
├── optimize.ts       (subtask 7)
└── __tests__/
    ├── distance.test.ts
    ├── preprocess.test.ts
    ├── kmeans.test.ts
    ├── tsp.test.ts
    ├── scoring.test.ts
    └── end-to-end.test.ts
```

---

## Technical Decisions Needed

### K-Means Implementation
- **Option A (Recommended):** Use local XY projection + standard k-means (simpler, faster)
- **Option B:** Custom haversine k-means (more accurate but slower)
→ Recommend Option A (projection error negligible at city scale)

### TSP Solver
- **Option A (Recommended):** Held-Karp exact solution, try all start nodes
- **Option B:** Nearest-neighbor + 2-opt heuristic (faster but not exact)
→ Recommend Option A (K <= 15 makes exact solution feasible, <2s total)

### Dependencies
- Need: numeric.js or similar for matrix operations? Or implement DP manually?
- Probably manual DP (simpler, no extra deps)

---

## Known Challenges

1. **DP memory for Held-Karp:** O(2^K * K) for K=15 → 2^15 * 15 = 491k ints → ~2MB (fine)
2. **Numeric precision:** Haversine calculations can have floating point errors → use consistent rounding
3. **Weighted k-means:** Must properly handle sample_weight in centroid updates

---

## Success Criteria

✅ End-to-end execution: `preprocess(mock_data) → cluster(K=5..15) → tsp(each) → score(each) → best_route`
✅ Performance: <1s for 50 points
✅ Output: Route with 5-15 stops, total distance, metrics (avg walk, coverage)
✅ Tests pass with >80% coverage on algorithm code
✅ Console output shows final route + statistics
