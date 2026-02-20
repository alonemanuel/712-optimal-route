/**
 * Main route optimization orchestrator.
 * Ties together preprocessing, clustering, TSP ordering, and scoring
 * to produce the optimal bus route for a given set of rider submissions.
 *
 * See algorithm.md Section 6 — Complete Pipeline.
 */

import { preprocess } from "./preprocessing";
import { kmeans } from "./kmeans";
import { findOptimalRoute } from "./tsp";
import { scoreRoute, computeWalkDistances } from "./scoring";
import type {
  Submission,
  AlgoParams,
  Route,
  LatLng,
  Stop,
} from "./types";
import { DEFAULT_ALGO_PARAMS, ROUTE_ENDPOINT } from "./types";

/**
 * Main entry point: compute the optimal bus route from rider submissions.
 *
 * Pipeline:
 * 1. Preprocess: validate bounds, dedup, detect outliers
 * 2. If insufficient data (< K_MIN valid points), return early
 * 3. For each K in [K_MIN, K_MAX]:
 *    a. Cluster with k-means
 *    b. Order stops with TSP (exact Held-Karp)
 *    c. Score the route
 * 4. Select K with lowest score
 * 5. Build and return Route object
 */
export function computeOptimalRoute(
  submissions: Submission[],
  params: AlgoParams = DEFAULT_ALGO_PARAMS
): Route {
  const endpoint = ROUTE_ENDPOINT;

  // --- Step 1: Preprocess ---
  const { valid, outliers, rejected } = preprocess(submissions, params);

  if (valid.length < params.K_MIN) {
    return {
      stops: [],
      endpoint,
      avg_walk_distance_m: 0,
      coverage_400m_pct: 0,
      total_submissions: submissions.length,
      valid_submissions: valid.length,
      outlier_count: outliers.length,
      rejected_count: rejected.length,
      K: 0,
      score: Infinity,
      route_distance_m: 0,
      computed_at: new Date().toISOString(),
      status: "insufficient_data",
      message: `Need at least ${params.K_MIN} valid points, have ${valid.length}`,
    };
  }

  // --- Step 2: Try all K values ---
  const outlierLatLngs: LatLng[] = outliers.map((o) => ({
    lat: o.lat,
    lng: o.lng,
  }));
  const validLatLngs: LatLng[] = valid.map((v) => ({
    lat: v.lat,
    lng: v.lng,
  }));

  let bestK = params.K_MIN;
  let bestScore = Infinity;
  let bestOrdering: number[] = [];
  let bestDistance = 0;
  let bestClusters: ReturnType<typeof kmeans>["clusters"] = [];
  let bestStopLatLngs: LatLng[] = [];
  let bestAvgWalk = 0;
  let bestCoveragePct = 0;
  let bestRouteLength = 0;

  const maxK = Math.min(params.K_MAX, valid.length);

  for (let K = params.K_MIN; K <= maxK; K++) {
    // 2a. Cluster
    const { clusters } = kmeans(valid, K, params);

    // 2b. Extract cluster centers as stop candidates
    const stopLatLngs: LatLng[] = clusters.map((c) => ({
      lat: c.center_lat,
      lng: c.center_lng,
    }));

    // 2c. Order stops with TSP
    const { ordering, distance } = findOptimalRoute(stopLatLngs, endpoint);

    // 2d. Build ordered stops list for scoring
    const orderedStops: LatLng[] = [
      ...ordering.map((i) => stopLatLngs[i]),
      endpoint,
    ];

    // 2e. Score the route
    const scoreResult = scoreRoute(
      K,
      orderedStops,
      validLatLngs,
      outlierLatLngs,
      params
    );

    if (scoreResult.score < bestScore) {
      bestK = K;
      bestScore = scoreResult.score;
      bestOrdering = ordering;
      bestDistance = distance;
      bestClusters = clusters;
      bestStopLatLngs = stopLatLngs;
      bestAvgWalk = scoreResult.avg_walk;
      bestCoveragePct = scoreResult.coverage_pct;
      bestRouteLength = scoreResult.route_length_m;
    }
  }

  // --- Step 3: Build final Route ---
  const stops: Stop[] = bestOrdering.map((stopIdx, i) => ({
    lat: bestStopLatLngs[stopIdx].lat,
    lng: bestStopLatLngs[stopIdx].lng,
    label: `Stop ${i + 1}`,
    cluster_size: bestClusters[stopIdx].member_count,
  }));

  return {
    stops,
    endpoint,
    avg_walk_distance_m: bestAvgWalk,
    coverage_400m_pct: bestCoveragePct,
    total_submissions: submissions.length,
    valid_submissions: valid.length,
    outlier_count: outliers.length,
    rejected_count: rejected.length,
    K: bestK,
    score: bestScore,
    route_distance_m: bestDistance,
    computed_at: new Date().toISOString(),
    status: "ok",
  };
}
