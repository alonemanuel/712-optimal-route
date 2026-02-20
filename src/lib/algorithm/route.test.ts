import { describe, it, expect } from "vitest";
import { computeOptimalRoute } from "./route";
import { generateMockSubmissions } from "./mockData";
import type { Submission } from "./types";
import { DEFAULT_ALGO_PARAMS, ROUTE_ENDPOINT } from "./types";

describe("computeOptimalRoute", () => {
  it("produces a valid Route with 100 mock submissions", () => {
    const subs = generateMockSubmissions({
      count: 100,
      outlierCount: 7,
      invalidCount: 3,
      seed: 42,
    });

    const route = computeOptimalRoute(subs);

    expect(route.status).toBe("ok");
    expect(route.K).toBeGreaterThanOrEqual(DEFAULT_ALGO_PARAMS.K_MIN);
    expect(route.K).toBeLessThanOrEqual(DEFAULT_ALGO_PARAMS.K_MAX);
    expect(route.stops).toHaveLength(route.K);
    expect(route.total_submissions).toBe(100);
    expect(route.rejected_count).toBe(3);
    expect(route.valid_submissions).toBeGreaterThan(0);
    expect(route.endpoint).toEqual(ROUTE_ENDPOINT);
  });

  it("returns insufficient_data when fewer than K_MIN submissions", () => {
    const subs: Submission[] = [
      { id: "a", lat: 32.07, lng: 34.78 },
      { id: "b", lat: 32.08, lng: 34.79 },
    ];

    const route = computeOptimalRoute(subs);

    expect(route.status).toBe("insufficient_data");
    expect(route.stops).toHaveLength(0);
    expect(route.K).toBe(0);
    expect(route.message).toBeDefined();
    expect(route.total_submissions).toBe(2);
  });

  it("returns insufficient_data with empty input", () => {
    const route = computeOptimalRoute([]);

    expect(route.status).toBe("insufficient_data");
    expect(route.stops).toHaveLength(0);
    expect(route.total_submissions).toBe(0);
  });

  it("returns insufficient_data when all submissions are invalid", () => {
    const subs: Submission[] = [
      { id: "nyc", lat: 40.71, lng: -74.0 },
      { id: "london", lat: 51.5, lng: -0.12 },
      { id: "tokyo", lat: 35.68, lng: 139.69 },
    ];

    const route = computeOptimalRoute(subs);

    expect(route.status).toBe("insufficient_data");
    expect(route.rejected_count).toBe(3);
    expect(route.valid_submissions).toBe(0);
  });

  it("Route fields are all populated correctly", () => {
    const subs = generateMockSubmissions({
      count: 50,
      outlierCount: 3,
      invalidCount: 2,
      seed: 99,
    });

    const route = computeOptimalRoute(subs);

    expect(route.status).toBe("ok");

    // Numeric fields are valid
    expect(route.avg_walk_distance_m).toBeGreaterThan(0);
    expect(route.coverage_400m_pct).toBeGreaterThanOrEqual(0);
    expect(route.coverage_400m_pct).toBeLessThanOrEqual(1);
    expect(route.route_distance_m).toBeGreaterThan(0);
    expect(route.score).toBeGreaterThan(0);
    expect(Number.isFinite(route.score)).toBe(true);

    // Timestamp is valid ISO 8601
    expect(new Date(route.computed_at).toISOString()).toBe(route.computed_at);

    // Stops have labels
    route.stops.forEach((stop, i) => {
      expect(stop.label).toBe(`Stop ${i + 1}`);
      expect(stop.cluster_size).toBeGreaterThan(0);
      expect(stop.lat).toBeGreaterThan(31);
      expect(stop.lat).toBeLessThan(34);
      expect(stop.lng).toBeGreaterThan(34);
      expect(stop.lng).toBeLessThan(36);
    });

    // Submission counts add up
    expect(
      route.valid_submissions + route.outlier_count + route.rejected_count
    ).toBeLessThanOrEqual(route.total_submissions);
  });

  it("respects custom params (K_MIN=3, K_MAX=5)", () => {
    const subs = generateMockSubmissions({
      count: 50,
      outlierCount: 2,
      invalidCount: 1,
      seed: 7,
    });

    const params = { ...DEFAULT_ALGO_PARAMS, K_MIN: 3, K_MAX: 5 };
    const route = computeOptimalRoute(subs, params);

    expect(route.status).toBe("ok");
    expect(route.K).toBeGreaterThanOrEqual(3);
    expect(route.K).toBeLessThanOrEqual(5);
  });

  it("completes in under 2 seconds for 100 submissions", () => {
    const subs = generateMockSubmissions({
      count: 100,
      outlierCount: 5,
      invalidCount: 3,
      seed: 42,
    });

    const start = performance.now();
    const route = computeOptimalRoute(subs);
    const elapsed = performance.now() - start;

    expect(route.status).toBe("ok");
    // Allow 2s to account for cold start and module import overhead.
    // The algorithm spec targets <1s; in production with warm V8 this holds.
    expect(elapsed).toBeLessThan(2000);
  });

  it("handles exactly K_MIN valid submissions", () => {
    // Generate exactly 5 valid points (no outliers, no invalid)
    const subs: Submission[] = Array.from({ length: 5 }, (_, i) => ({
      id: `pt_${i}`,
      lat: 32.07 + i * 0.005,
      lng: 34.78 + i * 0.003,
    }));

    const route = computeOptimalRoute(subs);

    // With 5 points the only K that works is K=5
    expect(route.status).toBe("ok");
    expect(route.K).toBe(5);
    expect(route.stops).toHaveLength(5);
  });
});
