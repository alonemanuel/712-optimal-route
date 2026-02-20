import { describe, it, expect } from "vitest";
import {
  heldKarpTSP,
  findOptimalRoute,
  buildDistanceMatrix,
} from "./tsp";
import { haversine } from "./distance";
import type { LatLng } from "./types";

// --- buildDistanceMatrix ---

describe("buildDistanceMatrix", () => {
  it("builds a symmetric matrix with zero diagonal", () => {
    const points: LatLng[] = [
      { lat: 32.07, lng: 34.78 },
      { lat: 32.08, lng: 34.79 },
      { lat: 32.09, lng: 34.80 },
    ];
    const matrix = buildDistanceMatrix(points);

    expect(matrix).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(matrix[i][i]).toBe(0);
      for (let j = i + 1; j < 3; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i]);
        expect(matrix[i][j]).toBeGreaterThan(0);
      }
    }
  });

  it("matches direct haversine calculations", () => {
    const points: LatLng[] = [
      { lat: 32.0853, lng: 34.7818 },
      { lat: 32.1047, lng: 34.7679 },
    ];
    const matrix = buildDistanceMatrix(points);
    const direct = haversine(32.0853, 34.7818, 32.1047, 34.7679);
    expect(matrix[0][1]).toBeCloseTo(direct, 5);
  });
});

// --- heldKarpTSP ---

describe("heldKarpTSP", () => {
  it("solves trivial 2-node case (start → end)", () => {
    const matrix = [
      [0, 100],
      [100, 0],
    ];
    const result = heldKarpTSP(matrix, 0, 1);
    expect(result.path).toEqual([0, 1]);
    expect(result.distance).toBe(100);
  });

  it("solves 3-node case (K=2 stops + endpoint)", () => {
    // Triangle: A(0) → B(1) → C(2)
    // Distances: A-B=10, A-C=25, B-C=15
    // Fixed end = C (idx 2)
    // From A: A→B→C = 10+15 = 25
    // From B: B→A→C = 10+25 = 35
    // Best start is A, path A→B→C = 25
    const matrix = [
      [0, 10, 25],
      [10, 0, 15],
      [25, 15, 0],
    ];
    const result = heldKarpTSP(matrix, 0, 2);
    expect(result.path).toEqual([0, 1, 2]);
    expect(result.distance).toBe(25);
  });

  it("picks optimal order for 4 nodes", () => {
    // Nodes: 0, 1, 2, 3. Start=0, End=3.
    // Must visit all. Best route avoids expensive edges.
    //
    //   0 --5-- 1
    //   |       |
    //  20       3
    //   |       |
    //   2 --4-- 3
    //
    // Direct: 0→1→3 (skip 2? no, must visit all)
    // 0→1→2→3 = 5+?+4. Need 1→2 distance.
    // Let's define: 0-1=5, 0-2=20, 0-3=100, 1-2=10, 1-3=3, 2-3=4
    // Possible orderings from start=0, end=3:
    //   0→1→2→3 = 5+10+4 = 19
    //   0→2→1→3 = 20+10+3 = 33
    // Best: 0→1→2→3 = 19
    const matrix = [
      [0, 5, 20, 100],
      [5, 0, 10, 3],
      [20, 10, 0, 4],
      [100, 3, 4, 0],
    ];
    const result = heldKarpTSP(matrix, 0, 3);
    expect(result.distance).toBe(19);
    expect(result.path).toEqual([0, 1, 2, 3]);
  });

  it("handles single node", () => {
    const matrix = [[0]];
    const result = heldKarpTSP(matrix, 0, 0);
    expect(result.path).toEqual([0]);
    expect(result.distance).toBe(0);
  });

  it("returns a path visiting all nodes", () => {
    // 5 nodes, start=0, end=4
    const matrix = [
      [0, 10, 20, 30, 40],
      [10, 0, 15, 25, 35],
      [20, 15, 0, 12, 28],
      [30, 25, 12, 0, 18],
      [40, 35, 28, 18, 0],
    ];
    const result = heldKarpTSP(matrix, 0, 4);
    expect(result.path).toHaveLength(5);
    expect(result.path[0]).toBe(0);
    expect(result.path[4]).toBe(4);
    // All nodes visited exactly once
    expect(new Set(result.path).size).toBe(5);
  });
});

// --- findOptimalRoute ---

describe("findOptimalRoute", () => {
  it("handles empty stops", () => {
    const endpoint: LatLng = { lat: 32.063, lng: 34.790 };
    const result = findOptimalRoute([], endpoint);
    expect(result.ordering).toEqual([]);
    expect(result.distance).toBe(0);
  });

  it("handles K=1 (single stop + endpoint)", () => {
    const stops: LatLng[] = [{ lat: 32.10, lng: 34.78 }];
    const endpoint: LatLng = { lat: 32.063, lng: 34.790 };
    const result = findOptimalRoute(stops, endpoint);
    expect(result.ordering).toEqual([0]);
    const expectedDist = haversine(32.10, 34.78, 32.063, 34.790);
    expect(result.distance).toBeCloseTo(expectedDist, 0);
  });

  it("handles K=2 and picks optimal start", () => {
    // Stop A (north), Stop B (middle), Endpoint (south)
    // The route should go A→B→endpoint or B→A→endpoint, whichever is shorter
    const stops: LatLng[] = [
      { lat: 32.12, lng: 34.78 }, // A - north
      { lat: 32.09, lng: 34.78 }, // B - middle
    ];
    const endpoint: LatLng = { lat: 32.063, lng: 34.790 };
    const result = findOptimalRoute(stops, endpoint);

    expect(result.ordering).toHaveLength(2);
    // The route should end at endpoint (not in ordering), and visit both stops

    // Calculate both possible routes
    const distAB = haversine(32.12, 34.78, 32.09, 34.78);
    const distBEnd = haversine(32.09, 34.78, 32.063, 34.790);
    const distAEnd = haversine(32.12, 34.78, 32.063, 34.790);
    const distBA = distAB;

    const routeABE = distAB + distBEnd;
    const routeBAE = distBA + distAEnd;

    const bestDist = Math.min(routeABE, routeBAE);
    expect(result.distance).toBeCloseTo(bestDist, 0);
  });

  it("finds optimal route for 5 Tel Aviv stops", () => {
    // 5 stops roughly arranged north-to-south along the coast
    const stops: LatLng[] = [
      { lat: 32.115, lng: 34.782 }, // North TLV
      { lat: 32.095, lng: 34.775 }, // Ramat Aviv-ish
      { lat: 32.075, lng: 34.770 }, // Central
      { lat: 32.050, lng: 34.765 }, // Florentin-ish
      { lat: 32.030, lng: 34.760 }, // South
    ];
    const endpoint: LatLng = { lat: 32.063, lng: 34.790 };

    const result = findOptimalRoute(stops, endpoint);

    // All 5 stops should appear in ordering
    expect(result.ordering).toHaveLength(5);
    expect(new Set(result.ordering).size).toBe(5);

    // Distance should be positive and reasonable (all in TLV, so <20km)
    expect(result.distance).toBeGreaterThan(0);
    expect(result.distance).toBeLessThan(20_000);
  });

  it("produces a route no worse than a naive sequential ordering", () => {
    const stops: LatLng[] = [
      { lat: 32.115, lng: 34.782 },
      { lat: 32.050, lng: 34.765 },
      { lat: 32.095, lng: 34.775 },
      { lat: 32.075, lng: 34.770 },
    ];
    const endpoint: LatLng = { lat: 32.063, lng: 34.790 };

    const optimal = findOptimalRoute(stops, endpoint);

    // Compute naive route: 0→1→2→3→endpoint
    let naiveDist = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      naiveDist += haversine(
        stops[i].lat, stops[i].lng,
        stops[i + 1].lat, stops[i + 1].lng
      );
    }
    naiveDist += haversine(
      stops[stops.length - 1].lat, stops[stops.length - 1].lng,
      endpoint.lat, endpoint.lng
    );

    // Optimal should be <= naive (or equal if naive happens to be optimal)
    expect(optimal.distance).toBeLessThanOrEqual(naiveDist + 1); // +1m tolerance
  });

  it("returns consistent results (deterministic)", () => {
    const stops: LatLng[] = [
      { lat: 32.10, lng: 34.78 },
      { lat: 32.08, lng: 34.77 },
      { lat: 32.06, lng: 34.79 },
    ];
    const endpoint: LatLng = { lat: 32.063, lng: 34.790 };

    const r1 = findOptimalRoute(stops, endpoint);
    const r2 = findOptimalRoute(stops, endpoint);
    expect(r1.ordering).toEqual(r2.ordering);
    expect(r1.distance).toBe(r2.distance);
  });
});
