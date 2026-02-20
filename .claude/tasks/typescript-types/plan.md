# Task: TypeScript Types & Interfaces

## Goal
Define all TypeScript types for the algorithm system in `lib/algorithm/types.ts`.

## Steps
1. [x] Read algorithm spec (`.claude/specs/algorithm.md` Section 9)
2. [x] Read API data spec for additional context (`.claude/specs/api-data.md`)
3. [x] Read stack doc to confirm TypeScript conventions
4. [x] Create `lib/algorithm/` directory
5. [x] Create `types.ts` with all interfaces and types
6. [x] Ensure JSDoc on every exported type

## Types defined
- `LatLng` — coordinate pair
- `Coordinate` — local (x, y) projection in meters
- `Submission` — rider submission input
- `WeightedPoint` — deduplicated point with weight
- `OutlierPoint` — flagged outlier
- `RejectedPoint` — rejected invalid data
- `PreprocessResult` — preprocessing output bundle
- `ClusterResult` — cluster metadata
- `SnappedStop` — stop after road snapping
- `RouteCandidate` — per-K candidate during optimization
- `AlgoParams` — all algorithm parameters
- `RouteStatus` — union type for route status
- `Stop` — final stop in output
- `Route` — complete algorithm output
- `AlgoResult` — convenience wrapper with route + params + candidates
