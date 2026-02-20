// ============================================================
// Algorithm Types — Route Optimization
// Based on algorithm.md Sections 9 (Data Structures) and 10 (Parameters)
// ============================================================

// --- Primitives ---

/** A latitude/longitude coordinate pair. */
export interface LatLng {
  lat: number;
  lng: number;
}

// --- Input ---

/** A single rider address submission. */
export interface Submission {
  id: string;
  lat: number;
  lng: number;
}

/** A deduplicated point with a weight representing how many submissions share this location. */
export interface WeightedPoint {
  lat: number;
  lng: number;
  weight: number;
}

/** A point projected to local Cartesian coordinates (meters from a reference point). */
export interface LocalXYPoint {
  x: number;
  y: number;
  weight: number;
}

/** A submission flagged as an outlier during preprocessing. */
export interface OutlierPoint {
  lat: number;
  lng: number;
  id: string;
}

/** A submission rejected during preprocessing (e.g., outside Israel bounding box). */
export interface RejectedPoint {
  lat: number;
  lng: number;
  id: string;
  reason: string;
}

/** Result of the preprocessing step. */
export interface PreprocessResult {
  valid: WeightedPoint[];
  outliers: OutlierPoint[];
  rejected: RejectedPoint[];
}

// --- Clustering ---

/** Metadata for a single k-means cluster. */
export interface Cluster {
  center_lat: number;
  center_lng: number;
  member_count: number;
  member_ids: string[];
}

// --- Stops ---

/** A bus stop in the final route. */
export interface Stop {
  lat: number;
  lng: number;
  label: string;
  cluster_size: number;
  road_name?: string;
}

/** A snapped stop with metadata about the snap operation. */
export interface SnappedStop {
  lat: number;
  lng: number;
  original_center_lat: number;
  original_center_lng: number;
  snap_distance_m: number;
  road_name?: string;
}

// --- Route Candidates ---

/**
 * An intermediate route produced during K selection.
 * One RouteCandidate is generated per K value tested.
 */
export interface RouteCandidate {
  K: number;
  /** Indices into the stops array defining traversal order. */
  ordering: number[];
  /** Total route distance in meters. */
  distance: number;
  stops: SnappedStop[];
  clusters: Cluster[];
  score: number;
}

// --- Final Output ---

export type RouteStatus = 'ok' | 'insufficient_data';

/** The final optimized route returned by the algorithm. */
export interface Route {
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
  /** ISO 8601 timestamp. */
  computed_at: string;
  status: RouteStatus;
  /** Present only when status !== 'ok'. */
  message?: string;
}

// --- Parameters ---

/** All tunable algorithm parameters with their defaults documented. */
export interface AlgoParams {
  // Clustering (Section 2)
  /** Minimum number of stops to try. Default: 5 */
  K_MIN: number;
  /** Maximum number of stops to try. Default: 15 */
  K_MAX: number;
  /** Number of k-means random initializations. Default: 10 */
  N_INIT: number;
  /** Max iterations per k-means run. Default: 300 */
  MAX_ITER: number;

  // Preprocessing (Section 1)
  /** MAD multiplier for outlier detection. Default: 5.0 */
  OUTLIER_MAD_THRESHOLD: number;

  // Stop Snapping (Section 3)
  /** Max distance in meters to snap a cluster center to a road. Default: 300 */
  SNAP_RADIUS_M: number;
  /** Bias toward major roads: 0 = nearest road, 1 = always major road. Default: 0.3 */
  MAJOR_ROAD_BIAS: number;

  // Scoring (Section 5)
  /** Weight for average walking distance. Default: 1.0 */
  AVG_WALK_WEIGHT: number;
  /** Weight for coverage gap. Default: 2.0 */
  COVERAGE_WEIGHT: number;
  /** Weight for total route length. Default: 0.1 */
  ROUTE_LENGTH_WEIGHT: number;
  /** Penalty per additional stop. Default: 10.0 */
  K_PENALTY_WEIGHT: number;
  /** Distance threshold in meters for "covered" riders. Default: 400 */
  COVERAGE_THRESHOLD_M: number;

  // Edge Cases (Section 8)
  /** Merge stops closer than this distance in meters. Default: 200 */
  MIN_STOP_DISTANCE_M: number;

  // Recalculation (Section 7)
  /** Seconds to wait after last submission before recalculating. Default: 30 */
  DEBOUNCE_SECONDS: number;
  /** Minimum seconds between recalculations. Default: 60 */
  MIN_RECALC_INTERVAL: number;
}

/** Default algorithm parameters. */
export const DEFAULT_ALGO_PARAMS: AlgoParams = {
  K_MIN: 5,
  K_MAX: 15,
  N_INIT: 10,
  MAX_ITER: 300,
  OUTLIER_MAD_THRESHOLD: 5.0,
  SNAP_RADIUS_M: 300,
  MAJOR_ROAD_BIAS: 0.3,
  AVG_WALK_WEIGHT: 1.0,
  COVERAGE_WEIGHT: 2.0,
  ROUTE_LENGTH_WEIGHT: 0.1,
  K_PENALTY_WEIGHT: 10.0,
  COVERAGE_THRESHOLD_M: 400,
  MIN_STOP_DISTANCE_M: 200,
  DEBOUNCE_SECONDS: 30,
  MIN_RECALC_INTERVAL: 60,
};

/** Fixed route endpoint (La Guardia / Kibbutz Galuyot). */
export const ROUTE_ENDPOINT: LatLng = {
  lat: 32.063,
  lng: 34.790,
};

/** Israel bounding box for sanity-checking submissions (Section 1c). */
export const ISRAEL_BOUNDS = {
  lat: { min: 31.0, max: 33.5 },
  lng: { min: 34.0, max: 35.5 },
} as const;
