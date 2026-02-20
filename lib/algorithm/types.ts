/**
 * Type definitions for the 712 Optimal Route algorithm system.
 *
 * These types cover the full pipeline: preprocessing, clustering,
 * stop snapping, route ordering, scoring, and final output.
 *
 * Reference: .claude/specs/algorithm.md
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** A latitude/longitude coordinate pair (WGS84). */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * A point in local Cartesian coordinates (meters), projected from LatLng
 * using a reference point. Used internally by k-means clustering so that
 * standard Euclidean distance is valid at city scale.
 */
export interface Coordinate {
  /** East-west distance in meters from the reference point. */
  x: number;
  /** North-south distance in meters from the reference point. */
  y: number;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** A rider address submission as stored in the database. */
export interface Submission {
  /** Unique submission ID. */
  id: string;
  /** Google account ID (or "seed_<row>" for imported data). */
  google_user_id: string;
  /** Raw address text as entered or imported. */
  address_text: string;
  /** Geocoded latitude. */
  lat: number;
  /** Geocoded longitude. */
  lng: number;
  /** ISO 8601 timestamp of creation. */
  created_at: string;
}

// ---------------------------------------------------------------------------
// Preprocessing
// ---------------------------------------------------------------------------

/**
 * A deduplicated point with a weight representing the number of
 * original submissions that mapped to this coordinate (rounded to
 * 5 decimal places, ~1.1 m precision).
 */
export interface WeightedPoint {
  lat: number;
  lng: number;
  /** Number of original submissions at this coordinate. */
  weight: number;
}

/** A submission flagged as an outlier during preprocessing. */
export interface OutlierPoint {
  lat: number;
  lng: number;
  /** Original submission ID. */
  id: string;
}

/** A submission rejected during preprocessing (e.g., outside Israel bounding box). */
export interface RejectedPoint {
  lat: number;
  lng: number;
  /** Original submission ID. */
  id: string;
  /** Human-readable reason for rejection. */
  reason: string;
}

/** Output of the preprocessing step. */
export interface PreprocessResult {
  /** Deduplicated, outlier-free points ready for clustering. */
  valid_points: WeightedPoint[];
  /** Points flagged as statistical outliers (excluded from clustering, included in metrics). */
  outlier_points: OutlierPoint[];
  /** Points rejected as invalid data (e.g., outside bounding box). */
  rejected_points: RejectedPoint[];
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

/** Metadata for a single cluster produced by k-means. */
export interface ClusterResult {
  /** Cluster center latitude. */
  center_lat: number;
  /** Cluster center longitude. */
  center_lng: number;
  /** Number of weighted points assigned to this cluster. */
  member_count: number;
  /** Original submission IDs of members in this cluster. */
  member_ids: string[];
}

// ---------------------------------------------------------------------------
// Stop snapping
// ---------------------------------------------------------------------------

/** A bus stop location after snapping a cluster center to the nearest road. */
export interface SnappedStop {
  /** Snapped latitude (on the road). */
  lat: number;
  /** Snapped longitude (on the road). */
  lng: number;
  /** Original cluster center latitude before snapping. */
  original_center_lat: number;
  /** Original cluster center longitude before snapping. */
  original_center_lng: number;
  /** Distance in meters between original center and snapped location. */
  snap_distance_m: number;
  /** Street name from reverse geocode, if available. */
  road_name?: string;
}

// ---------------------------------------------------------------------------
// Route ordering
// ---------------------------------------------------------------------------

/**
 * A candidate route for a given K value, produced during the
 * K-selection loop before final scoring comparison.
 */
export interface RouteCandidate {
  /** Number of stops (K value). */
  K: number;
  /** Indices into the stops array representing traversal order. */
  ordering: number[];
  /** Total route distance in meters. */
  distance: number;
  /** Snapped stop locations for this candidate. */
  stops: SnappedStop[];
  /** Cluster metadata for each stop. */
  clusters: ClusterResult[];
  /** Composite score assigned by the scoring function (lower is better). */
  score: number;
}

// ---------------------------------------------------------------------------
// Algorithm parameters
// ---------------------------------------------------------------------------

/**
 * All tunable parameters for the route optimization algorithm.
 * Defaults are documented inline; all should be configurable via
 * environment variables or a config file.
 */
export interface AlgoParams {
  // --- Clustering ---

  /** Minimum number of stops to evaluate. @default 5 */
  K_MIN: number;
  /** Maximum number of stops to evaluate. @default 15 */
  K_MAX: number;
  /** Number of k-means random initializations. @default 10 */
  N_INIT: number;
  /** Maximum iterations per k-means run. @default 300 */
  MAX_ITER: number;

  // --- Preprocessing ---

  /** MAD multiplier for outlier detection. @default 5.0 */
  OUTLIER_MAD_THRESHOLD: number;

  // --- Stop snapping ---

  /** Maximum distance (m) to move a cluster center to snap to a road. @default 300 */
  SNAP_RADIUS_M: number;
  /** Bias toward major roads (0 = nearest road, 1 = always major road within radius). @default 0.3 */
  MAJOR_ROAD_BIAS: number;

  // --- Scoring ---

  /** Weight for average walking distance in the scoring function. @default 1.0 */
  AVG_WALK_WEIGHT: number;
  /** Weight for coverage gap (higher = prioritize coverage). @default 2.0 */
  COVERAGE_WEIGHT: number;
  /** Weight for total route length. @default 0.1 */
  ROUTE_LENGTH_WEIGHT: number;
  /** Penalty per additional stop. @default 10.0 */
  K_PENALTY_WEIGHT: number;
  /** Distance threshold in meters for a rider to be considered "covered". @default 400 */
  COVERAGE_THRESHOLD_M: number;

  // --- Edge cases ---

  /** Merge stops closer than this distance (m). @default 200 */
  MIN_STOP_DISTANCE_M: number;

  // --- Recalculation ---

  /** Seconds to wait after last submission before recalculating. @default 30 */
  DEBOUNCE_SECONDS: number;
  /** Minimum seconds between recalculations. @default 60 */
  MIN_RECALC_INTERVAL: number;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** Possible statuses for a computed route. */
export type RouteStatus = "ok" | "insufficient_data";

/** A single stop in the final computed route. */
export interface Stop {
  /** Stop latitude. */
  lat: number;
  /** Stop longitude. */
  lng: number;
  /** Human-readable label, e.g. "Stop 1" or "Dizengoff / King George". */
  label: string;
  /** Number of riders in this stop's cluster. */
  cluster_size: number;
  /** Street name from road snapping, if available. */
  road_name?: string;
}

/**
 * The complete output of the route optimization algorithm.
 * Includes the optimized stops, metrics, and metadata.
 */
export interface Route {
  /** Ordered array of stops (excluding the fixed endpoint). */
  stops: Stop[];
  /** Fixed route endpoint (La Guardia / Kibbutz Galuyot). */
  endpoint: LatLng;
  /** Average haversine distance (m) from each rider to their nearest stop. */
  avg_walk_distance_m: number;
  /** Fraction (0-1) of riders within COVERAGE_THRESHOLD_M of a stop. */
  coverage_400m_pct: number;
  /** Total number of submissions considered. */
  total_submissions: number;
  /** Number of valid (non-outlier, non-rejected) submissions. */
  valid_submissions: number;
  /** Number of submissions flagged as outliers. */
  outlier_count: number;
  /** Number of submissions rejected as invalid. */
  rejected_count: number;
  /** The K value (number of stops) selected by the algorithm. */
  K: number;
  /** Composite score of this route (lower is better). */
  score: number;
  /** Total route travel distance in meters. */
  route_distance_m: number;
  /** ISO 8601 timestamp of when this route was computed. */
  computed_at: string;
  /** Whether the computation succeeded or lacked data. */
  status: RouteStatus;
  /** Explanatory message when status is not "ok". */
  message?: string;
}

// ---------------------------------------------------------------------------
// Algorithm result (convenience wrapper used by the API layer)
// ---------------------------------------------------------------------------

/**
 * Convenience type wrapping the core algorithm output with the
 * parameters that produced it. Useful for caching and debugging.
 */
export interface AlgoResult {
  /** The computed route. */
  route: Route;
  /** The parameters used for this computation. */
  params: AlgoParams;
  /** All K candidates evaluated, sorted by score ascending. */
  candidates: RouteCandidate[];
}
