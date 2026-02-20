/**
 * Route scoring: evaluate how good a route configuration is.
 *
 * For each candidate K, computes walk distances, coverage, route length,
 * and combines into a single score. Lower score = better route.
 *
 * See algorithm.md Section 5.
 */

import { haversine } from './distance';
import type { LatLng, AlgoParams } from './types';

/** Scoring parameters used by scoreRoute. */
type ScoringParams = Pick<
  AlgoParams,
  | 'AVG_WALK_WEIGHT'
  | 'COVERAGE_WEIGHT'
  | 'ROUTE_LENGTH_WEIGHT'
  | 'K_PENALTY_WEIGHT'
  | 'COVERAGE_THRESHOLD_M'
>;

/** Result of scoring a route. */
export interface ScoreResult {
  score: number;
  avg_walk: number;
  coverage_pct: number;
  route_length_m: number;
}

/**
 * Compute the haversine distance from each point to its nearest stop.
 *
 * Returns an array of distances in meters, one per input point.
 */
export function computeWalkDistances(
  points: LatLng[],
  stops: LatLng[]
): number[] {
  if (stops.length === 0) {
    return points.map(() => Infinity);
  }

  return points.map((p) => {
    let minDist = Infinity;
    for (const stop of stops) {
      const d = haversine(p.lat, p.lng, stop.lat, stop.lng);
      if (d < minDist) minDist = d;
    }
    return minDist;
  });
}

/**
 * Compute the total sequential route distance (sum of consecutive stop-to-stop
 * haversine distances). Stops must already be in traversal order.
 */
export function computeRouteLength(orderedStops: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < orderedStops.length; i++) {
    total += haversine(
      orderedStops[i - 1].lat,
      orderedStops[i - 1].lng,
      orderedStops[i].lat,
      orderedStops[i].lng
    );
  }
  return total;
}

/**
 * Score a route configuration. LOWER is better.
 *
 * Components:
 * - avg_walk: average haversine distance from each rider to nearest stop (m)
 * - coverage: fraction of riders within COVERAGE_THRESHOLD_M of a stop
 * - route_length: total route distance in meters
 * - K_penalty: preference for fewer stops
 *
 * Outlier points are included in walk/coverage metrics for transparency
 * (they show up as "riders not served").
 *
 * @param K - number of stops (for penalty term)
 * @param orderedStops - stops in traversal order (used for route length)
 * @param allSubmissions - all rider points (valid, deduplicated)
 * @param outlierPoints - outlier points excluded from clustering
 * @param params - scoring weights and thresholds
 */
export function scoreRoute(
  K: number,
  orderedStops: LatLng[],
  allSubmissions: LatLng[],
  outlierPoints: LatLng[],
  params: ScoringParams
): ScoreResult {
  // Combine submissions + outliers for honest metrics
  const allPoints = [...allSubmissions, ...outlierPoints];

  if (allPoints.length === 0) {
    return { score: 0, avg_walk: 0, coverage_pct: 1, route_length_m: 0 };
  }

  // Walk distances
  const walkDistances = computeWalkDistances(allPoints, orderedStops);

  const avg_walk =
    walkDistances.reduce((sum, d) => sum + d, 0) / walkDistances.length;

  const coveredCount = walkDistances.filter(
    (d) => d <= params.COVERAGE_THRESHOLD_M
  ).length;
  const coverage_pct = coveredCount / walkDistances.length;

  // Route length (sequential distance along ordered stops)
  const route_length_m = computeRouteLength(orderedStops);

  // Weighted score (lower is better)
  const score =
    params.AVG_WALK_WEIGHT * avg_walk +
    params.COVERAGE_WEIGHT * (1 - coverage_pct) * 1000 +
    params.ROUTE_LENGTH_WEIGHT * (route_length_m / 1000) +
    params.K_PENALTY_WEIGHT * K;

  return { score, avg_walk, coverage_pct, route_length_m };
}
