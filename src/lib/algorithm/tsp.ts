/**
 * TSP solver using Held-Karp exact dynamic programming.
 * Finds the shortest route through K stops ending at a fixed endpoint.
 * See algorithm.md Section 4.
 */

import { haversine } from "./distance";
import type { LatLng } from "./types";

export interface TSPResult {
  /** Node indices in traversal order (includes start and end). */
  path: number[];
  /** Total route distance in meters. */
  distance: number;
}

export interface OptimalRouteResult {
  /** Stop indices in traversal order (indices into the input stops array). */
  ordering: number[];
  /** Total route distance in meters. */
  distance: number;
}

/**
 * Build a pairwise distance matrix for a list of coordinates using haversine.
 */
export function buildDistanceMatrix(points: LatLng[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return matrix;
}

/**
 * Exact TSP with fixed start and fixed end using Held-Karp bitmask DP.
 *
 * dp[S][i] = minimum distance to reach node i having visited exactly the set S.
 * S is a bitmask where bit j is set if node j has been visited.
 *
 * Complexity: O(2^n * n^2) where n = number of nodes.
 * For n=16: ~4.2M operations, <100ms.
 */
export function heldKarpTSP(
  distMatrix: number[][],
  startIdx: number,
  endIdx: number
): TSPResult {
  const n = distMatrix.length;

  if (n === 0) {
    return { path: [], distance: 0 };
  }
  if (n === 1) {
    return { path: [0], distance: 0 };
  }
  if (startIdx === endIdx) {
    // Degenerate: start === end with only that node
    if (n === 1) return { path: [startIdx], distance: 0 };
    // For n>1 with start===end, this doesn't make sense for our use case.
    // Treat as a round trip isn't needed; caller should avoid this.
  }

  const totalStates = 1 << n;
  const INF = Infinity;

  // dp[S][i] = min distance to reach node i with visited set S
  const dp: number[][] = Array.from({ length: totalStates }, () =>
    new Array(n).fill(INF)
  );
  // parent[S][i] = [prevS, prevNode] for path reconstruction
  const parent: Array<Array<[number, number]>> = Array.from(
    { length: totalStates },
    () => new Array(n).fill([-1, -1]) as Array<[number, number]>
  );

  // Base case: start at startIdx
  dp[1 << startIdx][startIdx] = 0;

  for (let S = 0; S < totalStates; S++) {
    for (let u = 0; u < n; u++) {
      if (dp[S][u] === INF) continue;
      if (!(S & (1 << u))) continue; // u must be in S

      for (let v = 0; v < n; v++) {
        if (S & (1 << v)) continue; // v must not be in S yet

        const newS = S | (1 << v);
        const newDist = dp[S][u] + distMatrix[u][v];

        if (newDist < dp[newS][v]) {
          dp[newS][v] = newDist;
          parent[newS][v] = [S, u];
        }
      }
    }
  }

  // Read optimal distance: all nodes visited, ending at endIdx
  const fullMask = totalStates - 1;
  const distance = dp[fullMask][endIdx];

  if (distance === INF) {
    // No valid path found (shouldn't happen with a complete distance matrix)
    return { path: [], distance: INF };
  }

  // Backtrack to reconstruct path
  const path: number[] = [];
  let S = fullMask;
  let u = endIdx;

  while (u !== -1) {
    path.push(u);
    const [prevS, prevU] = parent[S][u];
    S = prevS;
    u = prevU;
  }

  path.reverse();

  return { path, distance };
}

/**
 * Find the optimal route through stops ending at endpoint.
 * Tries every stop as a potential start node and returns the shortest route.
 *
 * From algorithm.md Section 4 (Recommended approach):
 * "Run Held-Karp from all possible start nodes. Pick the route with
 *  the lowest total travel distance."
 */
export function findOptimalRoute(
  stops: LatLng[],
  endpoint: LatLng
): OptimalRouteResult {
  if (stops.length === 0) {
    return { ordering: [], distance: 0 };
  }

  // Build nodes array: stops first, then endpoint at the end
  const endIdx = stops.length;
  const nodes: LatLng[] = [...stops, endpoint];
  const distMatrix = buildDistanceMatrix(nodes);

  let bestPath: number[] = [];
  let bestDistance = Infinity;

  // Try each stop as the start node (not the endpoint)
  for (let startIdx = 0; startIdx < stops.length; startIdx++) {
    const result = heldKarpTSP(distMatrix, startIdx, endIdx);
    if (result.distance < bestDistance) {
      bestDistance = result.distance;
      bestPath = result.path;
    }
  }

  // Convert path to ordering of stop indices (excluding the endpoint at the end)
  const ordering = bestPath.filter((idx) => idx !== endIdx);

  return { ordering, distance: bestDistance };
}
