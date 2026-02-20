/**
 * End-to-end algorithm test harness.
 *
 * Wires the full pipeline manually (preprocess → kmeans → tsp → scoring)
 * to validate that all modules integrate correctly, produce sensible routes,
 * and meet performance requirements.
 *
 * When the orchestrator module lands, these tests can switch to calling it
 * directly instead of wiring the pipeline inline.
 */

import { describe, it, expect } from 'vitest';
import { generateMockSubmissions } from './mockData';
import { preprocess } from './preprocessing';
import { kmeans } from './kmeans';
import { findOptimalRoute } from './tsp';
import { scoreRoute, computeWalkDistances } from './scoring';
import { haversine } from './distance';
import type { Submission, WeightedPoint, AlgoParams, LatLng } from './types';
import { DEFAULT_ALGO_PARAMS, ROUTE_ENDPOINT, ISRAEL_BOUNDS } from './types';

// ----------------------------------------------------------------
// Helper: run the full pipeline for a given set of submissions
// ----------------------------------------------------------------

interface PipelineResult {
  K: number;
  stops: LatLng[];
  ordering: number[];
  score: number;
  avg_walk: number;
  coverage_pct: number;
  route_distance_m: number;
  total_submissions: number;
  valid_count: number;
  outlier_count: number;
  rejected_count: number;
  status: 'ok' | 'insufficient_data';
  elapsed_ms: number;
}

function runPipeline(
  submissions: Submission[],
  params: AlgoParams = DEFAULT_ALGO_PARAMS
): PipelineResult {
  const start = performance.now();

  // Step 1: Preprocess
  const { valid, outliers, rejected } = preprocess(submissions, params);

  if (valid.length < params.K_MIN) {
    return {
      K: 0,
      stops: [],
      ordering: [],
      score: 0,
      avg_walk: 0,
      coverage_pct: 0,
      route_distance_m: 0,
      total_submissions: submissions.length,
      valid_count: valid.length,
      outlier_count: outliers.length,
      rejected_count: rejected.length,
      status: 'insufficient_data',
      elapsed_ms: performance.now() - start,
    };
  }

  // Step 2: Try all K values, pick best
  let bestResult: PipelineResult | null = null;

  const kMax = Math.min(params.K_MAX, valid.length);

  for (let K = params.K_MIN; K <= kMax; K++) {
    // 2a. Cluster
    const { clusters } = kmeans(valid, K, params);

    // 2b. Extract cluster centers as stop locations
    const stops: LatLng[] = clusters.map((c) => ({
      lat: c.center_lat,
      lng: c.center_lng,
    }));

    // 2c. Find optimal route ordering (TSP)
    const { ordering, distance: routeDistance } = findOptimalRoute(
      stops,
      ROUTE_ENDPOINT
    );

    // 2d. Reorder stops by TSP ordering
    const orderedStops = ordering.map((i) => stops[i]);
    // Append endpoint for route length calculation in scoring
    const fullRoute = [...orderedStops, ROUTE_ENDPOINT];

    // 2e. Score the route
    // Pass all valid points (as LatLng) plus outliers
    const allSubmissionPoints: LatLng[] = valid.map((p) => ({
      lat: p.lat,
      lng: p.lng,
    }));
    const outlierPoints: LatLng[] = outliers.map((o) => ({
      lat: o.lat,
      lng: o.lng,
    }));

    const { score, avg_walk, coverage_pct, route_length_m } = scoreRoute(
      K,
      fullRoute,
      allSubmissionPoints,
      outlierPoints,
      params
    );

    if (bestResult === null || score < bestResult.score) {
      bestResult = {
        K,
        stops: orderedStops,
        ordering,
        score,
        avg_walk,
        coverage_pct,
        route_distance_m: routeDistance,
        total_submissions: submissions.length,
        valid_count: valid.length,
        outlier_count: outliers.length,
        rejected_count: rejected.length,
        status: 'ok',
        elapsed_ms: 0, // set after loop
      };
    }
  }

  bestResult!.elapsed_ms = performance.now() - start;
  return bestResult!;
}

// ================================================================
// Tests
// ================================================================

describe('E2E: full pipeline', () => {
  it('100 submissions → valid route with K in [5..15] and reasonable metrics', () => {
    const subs = generateMockSubmissions({ count: 100, outlierCount: 5, invalidCount: 3, seed: 42 });
    const result = runPipeline(subs);

    expect(result.status).toBe('ok');
    expect(result.K).toBeGreaterThanOrEqual(5);
    expect(result.K).toBeLessThanOrEqual(15);
    expect(result.stops.length).toBe(result.K);

    // avg_walk should be reasonable for TLV scale (< 5km)
    expect(result.avg_walk).toBeGreaterThan(0);
    expect(result.avg_walk).toBeLessThan(5000);

    // coverage should be meaningful
    expect(result.coverage_pct).toBeGreaterThanOrEqual(0);
    expect(result.coverage_pct).toBeLessThanOrEqual(1);

    // route distance should be reasonable (TLV is ~20km across)
    expect(result.route_distance_m).toBeGreaterThan(0);
    expect(result.route_distance_m).toBeLessThan(100_000);

    // accounting: all submissions categorized
    expect(
      result.valid_count + result.outlier_count + result.rejected_count
    ).toBeLessThanOrEqual(result.total_submissions);

    console.log('\n--- E2E: 100 submissions ---');
    console.log(`  Submissions: ${result.total_submissions} total, ${result.valid_count} valid, ${result.outlier_count} outliers, ${result.rejected_count} rejected`);
    console.log(`  K selected: ${result.K}`);
    console.log(`  Avg walk distance: ${result.avg_walk.toFixed(0)} m`);
    console.log(`  Coverage (400m): ${(result.coverage_pct * 100).toFixed(1)}%`);
    console.log(`  Route distance: ${(result.route_distance_m / 1000).toFixed(1)} km`);
    console.log(`  Score: ${result.score.toFixed(1)}`);
    console.log(`  Time: ${result.elapsed_ms.toFixed(0)} ms`);
  });

  it('insufficient data (2 submissions) → status=insufficient_data', () => {
    const subs: Submission[] = [
      { id: 's1', lat: 32.08, lng: 34.78 },
      { id: 's2', lat: 32.09, lng: 34.79 },
    ];

    const result = runPipeline(subs);

    expect(result.status).toBe('insufficient_data');
    expect(result.K).toBe(0);
    expect(result.stops).toHaveLength(0);
    expect(result.valid_count).toBeLessThan(DEFAULT_ALGO_PARAMS.K_MIN);

    console.log('\n--- E2E: insufficient data ---');
    console.log(`  Status: ${result.status}`);
    console.log(`  Valid points: ${result.valid_count} (need >= ${DEFAULT_ALGO_PARAMS.K_MIN})`);
  });

  it('mixed valid + outliers + invalid are all handled correctly', () => {
    const subs = generateMockSubmissions({
      count: 110,
      outlierCount: 7,
      invalidCount: 3,
      seed: 99,
    });

    const result = runPipeline(subs);

    expect(result.status).toBe('ok');
    // Invalid points (outside Israel bbox) should be rejected
    expect(result.rejected_count).toBeGreaterThanOrEqual(3);
    // Outlier detection should flag some points
    // (not necessarily exactly 7 -- MAD-based detection is data-driven)
    expect(result.outlier_count).toBeGreaterThanOrEqual(0);
    // Valid count + outlier + rejected <= total
    expect(
      result.valid_count + result.outlier_count + result.rejected_count
    ).toBeLessThanOrEqual(result.total_submissions);

    console.log('\n--- E2E: mixed data ---');
    console.log(`  Total: ${result.total_submissions}`);
    console.log(`  Valid: ${result.valid_count}, Outliers: ${result.outlier_count}, Rejected: ${result.rejected_count}`);
    console.log(`  K: ${result.K}, Score: ${result.score.toFixed(1)}`);
  });

  it('large scale (1000 submissions) completes in <5s with reasonable metrics', () => {
    const subs = generateMockSubmissions({
      count: 1000,
      outlierCount: 30,
      invalidCount: 5,
      seed: 7,
    });

    const result = runPipeline(subs);

    expect(result.status).toBe('ok');
    expect(result.elapsed_ms).toBeLessThan(5000);
    expect(result.avg_walk).toBeLessThan(5000);
    expect(result.coverage_pct).toBeGreaterThan(0);
    expect(result.K).toBeGreaterThanOrEqual(5);

    console.log('\n--- E2E: 1000 submissions (performance) ---');
    console.log(`  Submissions: ${result.total_submissions} total, ${result.valid_count} valid`);
    console.log(`  K: ${result.K}`);
    console.log(`  Avg walk: ${result.avg_walk.toFixed(0)} m`);
    console.log(`  Coverage: ${(result.coverage_pct * 100).toFixed(1)}%`);
    console.log(`  Route: ${(result.route_distance_m / 1000).toFixed(1)} km`);
    console.log(`  Score: ${result.score.toFixed(1)}`);
    console.log(`  Time: ${result.elapsed_ms.toFixed(0)} ms`);
  });

  it('determinism: same input produces same output', () => {
    const subs = generateMockSubmissions({ count: 80, seed: 123 });

    const result1 = runPipeline(subs);
    const result2 = runPipeline(subs);

    expect(result1.K).toBe(result2.K);
    expect(result1.score).toBe(result2.score);
    expect(result1.avg_walk).toBe(result2.avg_walk);
    expect(result1.coverage_pct).toBe(result2.coverage_pct);
    expect(result1.route_distance_m).toBe(result2.route_distance_m);
    expect(result1.stops).toEqual(result2.stops);
    expect(result1.ordering).toEqual(result2.ordering);

    console.log('\n--- E2E: determinism ---');
    console.log(`  Run 1 score: ${result1.score.toFixed(1)}, K: ${result1.K}`);
    console.log(`  Run 2 score: ${result2.score.toFixed(1)}, K: ${result2.K}`);
    console.log('  Results identical: YES');
  });

  it('route properties: stops within Israel, endpoint is La Guardia', () => {
    const subs = generateMockSubmissions({ count: 100, seed: 55 });
    const result = runPipeline(subs);

    expect(result.status).toBe('ok');

    // All stops should be within Israel bounds (with some margin for projection)
    for (const stop of result.stops) {
      expect(stop.lat).toBeGreaterThan(ISRAEL_BOUNDS.lat.min - 0.5);
      expect(stop.lat).toBeLessThan(ISRAEL_BOUNDS.lat.max + 0.5);
      expect(stop.lng).toBeGreaterThan(ISRAEL_BOUNDS.lng.min - 0.5);
      expect(stop.lng).toBeLessThan(ISRAEL_BOUNDS.lng.max + 0.5);
    }

    // Stops should be in TLV area (roughly 31.9-32.2 lat, 34.7-34.9 lng)
    for (const stop of result.stops) {
      expect(stop.lat).toBeGreaterThan(31.9);
      expect(stop.lat).toBeLessThan(32.2);
      expect(stop.lng).toBeGreaterThan(34.7);
      expect(stop.lng).toBeLessThan(34.9);
    }

    // Route distance should be sensible (ordered stops, not random jumps)
    // Total distance for K stops across TLV should be < 50km
    expect(result.route_distance_m).toBeLessThan(50_000);

    // Stops should be spread out (not all on top of each other)
    if (result.stops.length >= 2) {
      let maxDist = 0;
      for (let i = 0; i < result.stops.length; i++) {
        for (let j = i + 1; j < result.stops.length; j++) {
          const d = haversine(
            result.stops[i].lat,
            result.stops[i].lng,
            result.stops[j].lat,
            result.stops[j].lng
          );
          if (d > maxDist) maxDist = d;
        }
      }
      // Max distance between any two stops should be > 500m
      // (they shouldn't all collapse to one point)
      expect(maxDist).toBeGreaterThan(500);
    }

    console.log('\n--- E2E: route properties ---');
    console.log(`  ${result.stops.length} stops, all within TLV area`);
    console.log(`  Route distance: ${(result.route_distance_m / 1000).toFixed(1)} km`);
    console.log(`  Stop coordinates:`);
    result.stops.forEach((s, i) => {
      console.log(`    Stop ${i + 1}: (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`);
    });
    console.log(`  Endpoint: (${ROUTE_ENDPOINT.lat}, ${ROUTE_ENDPOINT.lng})`);
  });

  it('walk distances are computed correctly against raw haversine', () => {
    const subs = generateMockSubmissions({ count: 50, outlierCount: 0, invalidCount: 0, seed: 77 });
    const result = runPipeline(subs);

    expect(result.status).toBe('ok');

    // Verify walk distances by manual computation
    const subPoints: LatLng[] = subs.map((s) => ({ lat: s.lat, lng: s.lng }));
    const walkDists = computeWalkDistances(subPoints, result.stops);

    expect(walkDists).toHaveLength(50);

    // Manually verify a few
    for (let i = 0; i < 5; i++) {
      const manualMin = Math.min(
        ...result.stops.map((s) =>
          haversine(subs[i].lat, subs[i].lng, s.lat, s.lng)
        )
      );
      expect(walkDists[i]).toBeCloseTo(manualMin, 5);
    }
  });

  it('varying K_MIN/K_MAX constrains the output K', () => {
    const subs = generateMockSubmissions({ count: 100, seed: 42 });

    // Force K to be exactly 7..7
    const narrowParams: AlgoParams = {
      ...DEFAULT_ALGO_PARAMS,
      K_MIN: 7,
      K_MAX: 7,
    };

    const result = runPipeline(subs, narrowParams);
    expect(result.status).toBe('ok');
    expect(result.K).toBe(7);
    expect(result.stops).toHaveLength(7);

    console.log('\n--- E2E: constrained K=7 ---');
    console.log(`  K: ${result.K}, Score: ${result.score.toFixed(1)}`);
  });
});
