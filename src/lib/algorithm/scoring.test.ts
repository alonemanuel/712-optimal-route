import { describe, it, expect } from 'vitest';
import {
  scoreRoute,
  computeWalkDistances,
  computeRouteLength,
} from './scoring';
import { haversine } from './distance';
import { DEFAULT_ALGO_PARAMS } from './types';
import type { LatLng } from './types';

const scoringParams = {
  AVG_WALK_WEIGHT: DEFAULT_ALGO_PARAMS.AVG_WALK_WEIGHT,
  COVERAGE_WEIGHT: DEFAULT_ALGO_PARAMS.COVERAGE_WEIGHT,
  ROUTE_LENGTH_WEIGHT: DEFAULT_ALGO_PARAMS.ROUTE_LENGTH_WEIGHT,
  K_PENALTY_WEIGHT: DEFAULT_ALGO_PARAMS.K_PENALTY_WEIGHT,
  COVERAGE_THRESHOLD_M: DEFAULT_ALGO_PARAMS.COVERAGE_THRESHOLD_M,
};

// --- Helper: generate points in a ring around a center ---
function makeRing(
  center: LatLng,
  count: number,
  radiusDeg: number
): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    points.push({
      lat: center.lat + radiusDeg * Math.cos(angle),
      lng: center.lng + radiusDeg * Math.sin(angle),
    });
  }
  return points;
}

// --- Five stops spread across TLV ---
const STOPS: LatLng[] = [
  { lat: 32.08, lng: 34.77 },
  { lat: 32.09, lng: 34.79 },
  { lat: 32.07, lng: 34.78 },
  { lat: 32.10, lng: 34.78 },
  { lat: 32.06, lng: 34.77 },
];

// 50 submissions: 10 near each stop
const SUBMISSIONS: LatLng[] = STOPS.flatMap((s) =>
  makeRing(s, 10, 0.002)
);

describe('computeWalkDistances', () => {
  it('returns one distance per point', () => {
    const dists = computeWalkDistances(SUBMISSIONS, STOPS);
    expect(dists).toHaveLength(50);
  });

  it('all distances are non-negative', () => {
    const dists = computeWalkDistances(SUBMISSIONS, STOPS);
    for (const d of dists) {
      expect(d).toBeGreaterThanOrEqual(0);
    }
  });

  it('points near a stop have small walk distances', () => {
    // Points are 0.002 deg (~200m) from their nearest stop
    const dists = computeWalkDistances(SUBMISSIONS, STOPS);
    for (const d of dists) {
      expect(d).toBeLessThan(500); // all within 500m
    }
  });

  it('point exactly at a stop has distance 0', () => {
    const dists = computeWalkDistances([STOPS[0]], STOPS);
    expect(dists[0]).toBe(0);
  });

  it('returns Infinity when there are no stops', () => {
    const dists = computeWalkDistances(SUBMISSIONS.slice(0, 3), []);
    expect(dists).toHaveLength(3);
    for (const d of dists) {
      expect(d).toBe(Infinity);
    }
  });

  it('distance matches direct haversine to nearest stop', () => {
    const point: LatLng = { lat: 32.085, lng: 34.775 };
    const dists = computeWalkDistances([point], STOPS);

    const expectedMin = Math.min(
      ...STOPS.map((s) => haversine(point.lat, point.lng, s.lat, s.lng))
    );
    expect(dists[0]).toBeCloseTo(expectedMin, 5);
  });
});

describe('computeRouteLength', () => {
  it('single stop has route length 0', () => {
    expect(computeRouteLength([STOPS[0]])).toBe(0);
  });

  it('empty stops has route length 0', () => {
    expect(computeRouteLength([])).toBe(0);
  });

  it('two stops returns the haversine between them', () => {
    const len = computeRouteLength([STOPS[0], STOPS[1]]);
    const expected = haversine(
      STOPS[0].lat,
      STOPS[0].lng,
      STOPS[1].lat,
      STOPS[1].lng
    );
    expect(len).toBeCloseTo(expected, 5);
  });

  it('total length is sum of consecutive segments', () => {
    const threeStops = [STOPS[0], STOPS[1], STOPS[2]];
    const len = computeRouteLength(threeStops);
    const seg1 = haversine(
      threeStops[0].lat, threeStops[0].lng,
      threeStops[1].lat, threeStops[1].lng
    );
    const seg2 = haversine(
      threeStops[1].lat, threeStops[1].lng,
      threeStops[2].lat, threeStops[2].lng
    );
    expect(len).toBeCloseTo(seg1 + seg2, 5);
  });
});

describe('scoreRoute', () => {
  it('50 submissions with 5 nearby stops produces reasonable metrics', () => {
    const result = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);

    // avg_walk should be small (points are ~200m from stops)
    expect(result.avg_walk).toBeGreaterThan(0);
    expect(result.avg_walk).toBeLessThan(5000);

    // coverage should be high (all points within ~200m < 400m threshold)
    expect(result.coverage_pct).toBeGreaterThan(0);
    expect(result.coverage_pct).toBeLessThanOrEqual(1);

    // score should be a positive number
    expect(result.score).toBeGreaterThan(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('coverage is between 0 and 1', () => {
    const result = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);
    expect(result.coverage_pct).toBeGreaterThanOrEqual(0);
    expect(result.coverage_pct).toBeLessThanOrEqual(1);
  });

  it('points very close to stops give high coverage', () => {
    // All 50 points are within ~220m of a stop (0.002 deg radius)
    const result = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);
    expect(result.coverage_pct).toBeGreaterThan(0.9);
  });

  it('more stops (higher K) increases score via K penalty', () => {
    // Same stops and submissions, just vary K
    const score5 = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);
    const score10 = scoreRoute(10, STOPS, SUBMISSIONS, [], scoringParams);

    // score10 should be higher by K_PENALTY_WEIGHT * (10 - 5) = 50
    expect(score10.score - score5.score).toBeCloseTo(
      scoringParams.K_PENALTY_WEIGHT * 5,
      5
    );
  });

  it('lower coverage increases score via coverage penalty', () => {
    // Create points that are far from all stops (low coverage)
    const farPoints: LatLng[] = makeRing(
      { lat: 32.20, lng: 34.90 }, // far from all stops
      20,
      0.01
    );

    const resultNear = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);
    const resultFar = scoreRoute(5, STOPS, farPoints, [], scoringParams);

    // Far points should have much worse (higher) score
    expect(resultFar.score).toBeGreaterThan(resultNear.score);
    // Far points should have lower coverage
    expect(resultFar.coverage_pct).toBeLessThan(resultNear.coverage_pct);
  });

  it('including outliers increases avg_walk and lowers coverage', () => {
    const outliers: LatLng[] = [
      { lat: 32.20, lng: 34.90 }, // ~15km away
      { lat: 32.25, lng: 34.85 }, // ~20km away
    ];

    const withoutOutliers = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);
    const withOutliers = scoreRoute(5, STOPS, SUBMISSIONS, outliers, scoringParams);

    expect(withOutliers.avg_walk).toBeGreaterThan(withoutOutliers.avg_walk);
    expect(withOutliers.coverage_pct).toBeLessThanOrEqual(
      withoutOutliers.coverage_pct
    );
    expect(withOutliers.score).toBeGreaterThan(withoutOutliers.score);
  });

  it('route_length_m reflects stop-to-stop distance', () => {
    const result = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);
    const expectedLen = computeRouteLength(STOPS);
    expect(result.route_length_m).toBeCloseTo(expectedLen, 5);
  });

  it('score formula matches manual calculation', () => {
    const result = scoreRoute(5, STOPS, SUBMISSIONS, [], scoringParams);

    const expectedScore =
      scoringParams.AVG_WALK_WEIGHT * result.avg_walk +
      scoringParams.COVERAGE_WEIGHT * (1 - result.coverage_pct) * 1000 +
      scoringParams.ROUTE_LENGTH_WEIGHT * (result.route_length_m / 1000) +
      scoringParams.K_PENALTY_WEIGHT * 5;

    expect(result.score).toBeCloseTo(expectedScore, 5);
  });

  it('empty submissions returns zero score', () => {
    const result = scoreRoute(5, STOPS, [], [], scoringParams);
    expect(result.score).toBe(0);
    expect(result.avg_walk).toBe(0);
    expect(result.coverage_pct).toBe(1);
  });

  it('custom threshold changes coverage calculation', () => {
    // Use a very tight threshold — fewer points should be "covered"
    const tightParams = { ...scoringParams, COVERAGE_THRESHOLD_M: 50 };
    const resultTight = scoreRoute(5, STOPS, SUBMISSIONS, [], tightParams);

    // Use a very loose threshold — more points should be "covered"
    const looseParams = { ...scoringParams, COVERAGE_THRESHOLD_M: 10000 };
    const resultLoose = scoreRoute(5, STOPS, SUBMISSIONS, [], looseParams);

    expect(resultLoose.coverage_pct).toBeGreaterThanOrEqual(
      resultTight.coverage_pct
    );
  });
});
