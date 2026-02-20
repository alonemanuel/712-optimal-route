# Notes: TypeScript Types

## Decisions

### Submission type extended beyond spec Section 9
The algorithm spec Section 9 defines `Submission` with only `{id, lat, lng}`. I added
`google_user_id`, `address_text`, and `created_at` from the database schema in the API
spec, since these are present on the DB model and useful for preprocessing/tracing.

### Added pipeline-internal types
The spec Section 9 only defines the top-level input/output interfaces. I added
intermediate types for each pipeline stage (preprocessing, clustering, snapping,
route ordering) based on the pseudocode in Sections 1-6. These are:
- `WeightedPoint`, `OutlierPoint`, `RejectedPoint`, `PreprocessResult`
- `ClusterResult`
- `SnappedStop`
- `RouteCandidate`

These keep the pipeline type-safe without requiring `any` at intermediate steps.

### AlgoResult as convenience wrapper
Added `AlgoResult` to bundle the route with its params and all evaluated candidates.
This is not in the spec but will be useful for the API layer and for debugging
(e.g., showing all K candidates on the stats page).

### RouteStatus as a union type
Used `type RouteStatus = "ok" | "insufficient_data"` instead of an enum, consistent
with idiomatic TypeScript and the string literal values in the spec.

### Stop uses cluster_size, not rider_count
The algorithm spec Section 9 uses `cluster_size` for the Stop interface, while the
API spec uses `rider_count`. I followed the algorithm spec since this file is for the
algorithm layer. The API layer can map `cluster_size` -> `rider_count` at the boundary.
