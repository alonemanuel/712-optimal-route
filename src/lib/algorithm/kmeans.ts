/**
 * K-means clustering with weighted points on projected coordinates.
 *
 * Projects lat/lng to local (x, y) meters, runs k-means with k-means++
 * initialization and Lloyd's algorithm, then projects centers back to lat/lng.
 *
 * See algorithm.md Section 2.
 */

import { toLocalXY, fromLocalXY } from './projection';
import type { WeightedPoint, AlgoParams, Cluster } from './types';

/** Internal representation of a 2D point with weight and original index. */
interface XYWeighted {
  x: number;
  y: number;
  weight: number;
  index: number;
}

/**
 * Squared Euclidean distance between two 2D points.
 * Using squared distance avoids sqrt in the inner loop.
 */
function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * K-means++ initialization: pick K initial centers with probability
 * proportional to squared distance from the nearest existing center,
 * weighted by sample weight.
 */
function kmeansppInit(
  points: XYWeighted[],
  K: number,
  rng: () => number
): { x: number; y: number }[] {
  const centers: { x: number; y: number }[] = [];

  // Pick first center with probability proportional to weight
  const totalWeight = points.reduce((s, p) => s + p.weight, 0);
  let r = rng() * totalWeight;
  let firstIdx = points.length - 1;
  for (let i = 0; i < points.length; i++) {
    r -= points[i].weight;
    if (r <= 0) {
      firstIdx = i;
      break;
    }
  }
  centers.push({ x: points[firstIdx].x, y: points[firstIdx].y });

  // Pick remaining centers
  for (let c = 1; c < K; c++) {
    // Compute weighted distance to nearest center for each point
    const dists: number[] = new Array(points.length);
    let totalDist = 0;
    for (let i = 0; i < points.length; i++) {
      let minD = Infinity;
      for (const center of centers) {
        const d = distSq(points[i].x, points[i].y, center.x, center.y);
        if (d < minD) minD = d;
      }
      dists[i] = minD * points[i].weight;
      totalDist += dists[i];
    }

    // Sample next center proportional to weighted distance
    r = rng() * totalDist;
    let nextIdx = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        nextIdx = i;
        break;
      }
    }
    centers.push({ x: points[nextIdx].x, y: points[nextIdx].y });
  }

  return centers;
}

/**
 * Run a single k-means trial: assign points to nearest center, recompute
 * weighted centers, repeat until convergence or maxIter.
 *
 * Returns { centers, labels, inertia } where inertia is the weighted
 * sum of squared distances (lower is better).
 */
function kmeansLloyd(
  points: XYWeighted[],
  initialCenters: { x: number; y: number }[],
  maxIter: number
): { centers: { x: number; y: number }[]; labels: number[]; inertia: number } {
  const K = initialCenters.length;
  const N = points.length;

  // Clone centers
  let centers = initialCenters.map((c) => ({ x: c.x, y: c.y }));
  const labels = new Array<number>(N).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step: assign each point to the nearest center
    let changed = false;
    for (let i = 0; i < N; i++) {
      let minD = Infinity;
      let bestC = 0;
      for (let c = 0; c < K; c++) {
        const d = distSq(points[i].x, points[i].y, centers[c].x, centers[c].y);
        if (d < minD) {
          minD = d;
          bestC = c;
        }
      }
      if (labels[i] !== bestC) {
        labels[i] = bestC;
        changed = true;
      }
    }

    // Update step: recompute centers as weighted mean of assigned points
    const newCenters = Array.from({ length: K }, () => ({
      x: 0,
      y: 0,
      totalWeight: 0,
    }));

    for (let i = 0; i < N; i++) {
      const c = labels[i];
      newCenters[c].x += points[i].x * points[i].weight;
      newCenters[c].y += points[i].y * points[i].weight;
      newCenters[c].totalWeight += points[i].weight;
    }

    centers = newCenters.map((nc) => {
      if (nc.totalWeight === 0) return { x: 0, y: 0 };
      return { x: nc.x / nc.totalWeight, y: nc.y / nc.totalWeight };
    });

    if (!changed) break; // converged
  }

  // Compute inertia (weighted sum of squared distances)
  let inertia = 0;
  for (let i = 0; i < N; i++) {
    inertia +=
      points[i].weight *
      distSq(points[i].x, points[i].y, centers[labels[i]].x, centers[labels[i]].y);
  }

  return { centers, labels, inertia };
}

/**
 * Seeded PRNG (mulberry32) for reproducible k-means initialization.
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cluster weighted points into K groups using k-means.
 *
 * 1. Projects all points to local (x, y) meters
 * 2. Runs k-means with k-means++ init, n_init restarts
 * 3. Projects centers back to lat/lng
 * 4. Returns Cluster metadata (without member_ids -- caller maps those)
 *
 * Note: Cluster.member_ids is left empty because WeightedPoint carries no IDs
 * (points are deduplicated). The caller should map assignments back to original
 * submission IDs using the returned labels.
 */
export function kmeans(
  points: WeightedPoint[],
  K: number,
  params: Pick<AlgoParams, 'N_INIT' | 'MAX_ITER'>,
  seed: number = 42
): { clusters: Cluster[]; labels: number[] } {
  if (points.length === 0) {
    return { clusters: [], labels: [] };
  }
  if (K <= 0) {
    throw new Error(`K must be positive, got ${K}`);
  }
  if (K > points.length) {
    throw new Error(
      `K (${K}) cannot exceed number of points (${points.length})`
    );
  }

  // Step 1: Compute reference point (weighted centroid)
  let totalWeight = 0;
  let sumLat = 0;
  let sumLng = 0;
  for (const p of points) {
    sumLat += p.lat * p.weight;
    sumLng += p.lng * p.weight;
    totalWeight += p.weight;
  }
  const refLat = sumLat / totalWeight;
  const refLng = sumLng / totalWeight;

  // Step 2: Project to local (x, y)
  const xyPoints: XYWeighted[] = points.map((p, i) => {
    const { x, y } = toLocalXY(p.lat, p.lng, refLat, refLng);
    return { x, y, weight: p.weight, index: i };
  });

  // Step 3: Run k-means n_init times, keep best (lowest inertia)
  const rng = mulberry32(seed);
  let bestResult: { centers: { x: number; y: number }[]; labels: number[]; inertia: number } | null = null;

  for (let init = 0; init < params.N_INIT; init++) {
    const initialCenters = kmeansppInit(xyPoints, K, rng);
    const result = kmeansLloyd(xyPoints, initialCenters, params.MAX_ITER);

    if (bestResult === null || result.inertia < bestResult.inertia) {
      bestResult = result;
    }
  }

  // Step 4: Project centers back to lat/lng and build Cluster metadata
  const { centers, labels } = bestResult!;

  // Count members per cluster
  const memberCounts = new Array<number>(K).fill(0);
  for (let i = 0; i < points.length; i++) {
    memberCounts[labels[i]] += points[i].weight;
  }

  const clusters: Cluster[] = centers.map((c, i) => {
    const latlng = fromLocalXY(c.x, c.y, refLat, refLng);
    return {
      center_lat: latlng.lat,
      center_lng: latlng.lng,
      member_count: memberCounts[i],
      member_ids: [], // caller maps these from original submissions
    };
  });

  return { clusters, labels };
}
