import { describe, it, expect } from 'vitest';
import { kmeans } from './kmeans';
import { haversine } from './distance';
import type { WeightedPoint, AlgoParams } from './types';
import { DEFAULT_ALGO_PARAMS } from './types';

const params: Pick<AlgoParams, 'N_INIT' | 'MAX_ITER'> = {
  N_INIT: DEFAULT_ALGO_PARAMS.N_INIT,
  MAX_ITER: DEFAULT_ALGO_PARAMS.MAX_ITER,
};

/** Helper: generate N points clustered around a center with small jitter. */
function makeCluster(
  centerLat: number,
  centerLng: number,
  count: number,
  startId: number,
  jitter: number = 0.002
): WeightedPoint[] {
  const points: WeightedPoint[] = [];
  // Deterministic spread pattern (no random)
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    points.push({
      lat: centerLat + jitter * Math.cos(angle),
      lng: centerLng + jitter * Math.sin(angle),
      weight: 1,
    });
  }
  return points;
}

describe('kmeans', () => {
  it('clusters 50 points into K=5 and returns 5 clusters', () => {
    // 5 well-separated clusters of 10 points each
    const points: WeightedPoint[] = [
      ...makeCluster(32.08, 34.77, 10, 0),   // central TLV
      ...makeCluster(32.10, 34.79, 10, 10),  // north TLV
      ...makeCluster(32.06, 34.76, 10, 20),  // south TLV
      ...makeCluster(32.09, 34.75, 10, 30),  // west TLV
      ...makeCluster(32.07, 34.80, 10, 40),  // east TLV
    ];

    const { clusters, labels } = kmeans(points, 5, params);

    expect(clusters).toHaveLength(5);
    expect(labels).toHaveLength(50);

    // Every label should be 0..4
    for (const label of labels) {
      expect(label).toBeGreaterThanOrEqual(0);
      expect(label).toBeLessThan(5);
    }
  });

  it('cluster centers are close to the actual group centers', () => {
    const groupCenters = [
      { lat: 32.08, lng: 34.77 },
      { lat: 32.12, lng: 34.80 }, // well separated
    ];

    const points: WeightedPoint[] = [
      ...makeCluster(groupCenters[0].lat, groupCenters[0].lng, 25, 0),
      ...makeCluster(groupCenters[1].lat, groupCenters[1].lng, 25, 25),
    ];

    const { clusters } = kmeans(points, 2, params);

    // Each cluster center should be within 500m of the true center
    for (const gc of groupCenters) {
      const closestCluster = clusters.reduce((best, c) => {
        const d = haversine(gc.lat, gc.lng, c.center_lat, c.center_lng);
        const bestD = haversine(gc.lat, gc.lng, best.center_lat, best.center_lng);
        return d < bestD ? c : best;
      });
      const dist = haversine(
        gc.lat,
        gc.lng,
        closestCluster.center_lat,
        closestCluster.center_lng
      );
      expect(dist).toBeLessThan(500);
    }
  });

  it('handles 30 close + 10 far points in K=2', () => {
    // 30 points clustered in central TLV
    const closePoints = makeCluster(32.08, 34.78, 30, 0, 0.003);
    // 10 points far away (Herzliya area)
    const farPoints = makeCluster(32.16, 34.79, 10, 30, 0.002);

    const { clusters, labels } = kmeans(
      [...closePoints, ...farPoints],
      2,
      params
    );

    expect(clusters).toHaveLength(2);

    // The large cluster should have member_count ~30, the small one ~10
    const counts = clusters.map((c) => c.member_count).sort((a, b) => a - b);
    expect(counts[0]).toBe(10);
    expect(counts[1]).toBe(30);

    // Verify labels partition correctly: first 30 should mostly share a label,
    // last 10 should mostly share a different label
    const closeLabels = labels.slice(0, 30);
    const farLabels = labels.slice(30, 40);

    // Count the dominant label in each group
    const closeLabelCounts = new Map<number, number>();
    for (const l of closeLabels) {
      closeLabelCounts.set(l, (closeLabelCounts.get(l) || 0) + 1);
    }
    const farLabelCounts = new Map<number, number>();
    for (const l of farLabels) {
      farLabelCounts.set(l, (farLabelCounts.get(l) || 0) + 1);
    }

    const closeDominant = Math.max(...closeLabelCounts.values());
    const farDominant = Math.max(...farLabelCounts.values());

    // At least 90% of each group should share the same label
    expect(closeDominant).toBeGreaterThanOrEqual(27);
    expect(farDominant).toBeGreaterThanOrEqual(9);
  });

  it('same seed produces the same result (deterministic)', () => {
    const points: WeightedPoint[] = [
      ...makeCluster(32.08, 34.77, 15, 0),
      ...makeCluster(32.10, 34.80, 15, 15),
    ];

    const result1 = kmeans(points, 2, params, 42);
    const result2 = kmeans(points, 2, params, 42);

    expect(result1.labels).toEqual(result2.labels);
    expect(result1.clusters).toEqual(result2.clusters);
  });

  it('different seeds can produce different results', () => {
    // With many well-separated clusters, different seeds should still converge
    // to the same solution. Use a trickier case with overlapping clusters.
    const points: WeightedPoint[] = [
      ...makeCluster(32.08, 34.78, 20, 0, 0.005),
      ...makeCluster(32.085, 34.785, 20, 20, 0.005),
    ];

    const result1 = kmeans(points, 3, params, 1);
    const result2 = kmeans(points, 3, params, 999);

    // They may or may not differ, but both should be valid
    expect(result1.clusters).toHaveLength(3);
    expect(result2.clusters).toHaveLength(3);
  });

  it('weighted member counts sum to total weight', () => {
    const points: WeightedPoint[] = [
      ...makeCluster(32.08, 34.77, 10, 0),
      ...makeCluster(32.10, 34.80, 10, 10),
    ];

    // Give some points higher weight
    points[0].weight = 5;
    points[10].weight = 3;

    const totalWeight = points.reduce((s, p) => s + p.weight, 0);
    const { clusters } = kmeans(points, 2, params);

    const clusterWeight = clusters.reduce((s, c) => s + c.member_count, 0);
    expect(clusterWeight).toBeCloseTo(totalWeight, 5);
  });

  it('K=1 produces a single cluster containing all points', () => {
    const points = makeCluster(32.08, 34.78, 20, 0);
    const { clusters, labels } = kmeans(points, 1, params);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].member_count).toBe(20);
    expect(labels.every((l) => l === 0)).toBe(true);
  });

  it('K=N produces N clusters with one point each', () => {
    // 5 well-separated points
    const points: WeightedPoint[] = [
      { lat: 32.05, lng: 34.75, weight: 1 },
      { lat: 32.07, lng: 34.77, weight: 1 },
      { lat: 32.09, lng: 34.79, weight: 1 },
      { lat: 32.11, lng: 34.81, weight: 1 },
      { lat: 32.13, lng: 34.83, weight: 1 },
    ];

    const { clusters } = kmeans(points, 5, params);
    expect(clusters).toHaveLength(5);
    // Each cluster should have exactly 1 member
    for (const c of clusters) {
      expect(c.member_count).toBe(1);
    }
  });

  it('throws if K > number of points', () => {
    const points = makeCluster(32.08, 34.78, 3, 0);
    expect(() => kmeans(points, 5, params)).toThrow('K (5) cannot exceed');
  });

  it('throws if K <= 0', () => {
    const points = makeCluster(32.08, 34.78, 10, 0);
    expect(() => kmeans(points, 0, params)).toThrow('K must be positive');
  });

  it('returns empty for empty input', () => {
    const { clusters, labels } = kmeans([], 0, params);
    // Special case: 0 points with K check bypassed
    expect(clusters).toHaveLength(0);
    expect(labels).toHaveLength(0);
  });

  it('cluster centers are valid lat/lng (within Israel area)', () => {
    const points: WeightedPoint[] = [
      ...makeCluster(32.08, 34.77, 20, 0),
      ...makeCluster(32.10, 34.79, 20, 20),
      ...makeCluster(32.06, 34.76, 20, 40),
    ];

    const { clusters } = kmeans(points, 3, params);

    for (const c of clusters) {
      expect(c.center_lat).toBeGreaterThan(31.0);
      expect(c.center_lat).toBeLessThan(33.5);
      expect(c.center_lng).toBeGreaterThan(34.0);
      expect(c.center_lng).toBeLessThan(35.5);
    }
  });

  it('member_ids is empty (caller responsibility)', () => {
    const points = makeCluster(32.08, 34.78, 10, 0);
    const { clusters } = kmeans(points, 2, params);

    for (const c of clusters) {
      expect(c.member_ids).toEqual([]);
    }
  });
});
