import { describe, it, expect } from "vitest";
import {
  validateBounds,
  deduplicatePoints,
  detectOutliers,
  preprocess,
} from "./preprocessing";
import { generateMockSubmissions } from "./mockData";
import type { Submission, WeightedPoint } from "./types";
import { ISRAEL_BOUNDS } from "./types";

// --- validateBounds ---

describe("validateBounds", () => {
  it("accepts points inside Israel bounds", () => {
    const subs: Submission[] = [
      { id: "1", lat: 32.07, lng: 34.78 },
      { id: "2", lat: 31.5, lng: 34.5 },
    ];
    const { valid, rejected } = validateBounds(subs);
    expect(valid).toHaveLength(2);
    expect(rejected).toHaveLength(0);
  });

  it("rejects points outside Israel bounds", () => {
    const subs: Submission[] = [
      { id: "nyc", lat: 40.71, lng: -74.0 },
      { id: "ok", lat: 32.0, lng: 34.78 },
    ];
    const { valid, rejected } = validateBounds(subs);
    expect(valid).toHaveLength(1);
    expect(valid[0].id).toBe("ok");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].id).toBe("nyc");
    expect(rejected[0].reason).toContain("Outside bounds");
  });

  it("rejects all points outside bounds", () => {
    const subs: Submission[] = [
      { id: "a", lat: 30.0, lng: 33.0 },
      { id: "b", lat: 34.0, lng: 36.0 },
    ];
    const { valid, rejected } = validateBounds(subs);
    expect(valid).toHaveLength(0);
    expect(rejected).toHaveLength(2);
  });

  it("handles edge values on the boundary (inclusive)", () => {
    const subs: Submission[] = [
      { id: "min", lat: ISRAEL_BOUNDS.lat.min, lng: ISRAEL_BOUNDS.lng.min },
      { id: "max", lat: ISRAEL_BOUNDS.lat.max, lng: ISRAEL_BOUNDS.lng.max },
    ];
    const { valid } = validateBounds(subs);
    expect(valid).toHaveLength(2);
  });

  it("handles empty input", () => {
    const { valid, rejected } = validateBounds([]);
    expect(valid).toHaveLength(0);
    expect(rejected).toHaveLength(0);
  });
});

// --- deduplicatePoints ---

describe("deduplicatePoints", () => {
  it("collapses 10 identical points into 1 with weight 10", () => {
    const subs: Submission[] = Array.from({ length: 10 }, (_, i) => ({
      id: `dup_${i}`,
      lat: 32.08530,
      lng: 34.78180,
    }));
    const result = deduplicatePoints(subs);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(10);
  });

  it("keeps distinct points separate", () => {
    const subs: Submission[] = [
      { id: "a", lat: 32.08530, lng: 34.78180 },
      { id: "b", lat: 32.09000, lng: 34.79000 },
      { id: "c", lat: 32.10000, lng: 34.80000 },
    ];
    const result = deduplicatePoints(subs);
    expect(result).toHaveLength(3);
    expect(result.every((p) => p.weight === 1)).toBe(true);
  });

  it("rounds to 5 decimal places for dedup", () => {
    // These differ only at the 7th decimal place, so they round to the same 5-decimal value
    // 32.085304 and 32.085302 both round to 32.08530
    const subs: Submission[] = [
      { id: "a", lat: 32.0853040, lng: 34.7818040 },
      { id: "b", lat: 32.0853020, lng: 34.7818020 },
    ];
    const result = deduplicatePoints(subs);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(2);
  });

  it("does not collapse points that differ at the 5th decimal", () => {
    const subs: Submission[] = [
      { id: "a", lat: 32.08531, lng: 34.78180 },
      { id: "b", lat: 32.08532, lng: 34.78180 },
    ];
    const result = deduplicatePoints(subs);
    expect(result).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(deduplicatePoints([])).toHaveLength(0);
  });
});

// --- detectOutliers ---

describe("detectOutliers", () => {
  it("returns no outliers when all points are close together", () => {
    const points: WeightedPoint[] = [
      { lat: 32.070, lng: 34.780, weight: 1 },
      { lat: 32.071, lng: 34.781, weight: 1 },
      { lat: 32.069, lng: 34.779, weight: 1 },
      { lat: 32.072, lng: 34.782, weight: 1 },
      { lat: 32.068, lng: 34.778, weight: 1 },
    ];
    const { valid, outliers } = detectOutliers(points);
    expect(outliers).toHaveLength(0);
    expect(valid).toHaveLength(5);
  });

  it("flags a distant point as an outlier", () => {
    const points: WeightedPoint[] = [
      // Tight cluster in central Tel Aviv
      { lat: 32.070, lng: 34.780, weight: 1 },
      { lat: 32.071, lng: 34.781, weight: 1 },
      { lat: 32.069, lng: 34.779, weight: 1 },
      { lat: 32.072, lng: 34.782, weight: 1 },
      { lat: 32.068, lng: 34.778, weight: 1 },
      { lat: 32.070, lng: 34.779, weight: 1 },
      { lat: 32.071, lng: 34.780, weight: 1 },
      { lat: 32.069, lng: 34.781, weight: 1 },
      { lat: 32.070, lng: 34.780, weight: 1 },
      // Very far away point (Haifa)
      { lat: 32.800, lng: 34.990, weight: 1 },
    ];
    const { valid, outliers } = detectOutliers(points);
    expect(outliers.length).toBeGreaterThanOrEqual(1);
    // The Haifa point should be an outlier
    const haifaOutlier = outliers.find((o) => o.lat === 32.800);
    expect(haifaOutlier).toBeDefined();
    expect(valid.length).toBeLessThan(points.length);
  });

  it("handles empty input", () => {
    const { valid, outliers } = detectOutliers([]);
    expect(valid).toHaveLength(0);
    expect(outliers).toHaveLength(0);
  });

  it("handles single point (no outliers possible)", () => {
    const points: WeightedPoint[] = [
      { lat: 32.07, lng: 34.78, weight: 1 },
    ];
    const { valid, outliers } = detectOutliers(points);
    expect(valid).toHaveLength(1);
    expect(outliers).toHaveLength(0);
  });

  it("respects a lower threshold (more aggressive outlier detection)", () => {
    const points: WeightedPoint[] = [
      { lat: 32.070, lng: 34.780, weight: 1 },
      { lat: 32.071, lng: 34.781, weight: 1 },
      { lat: 32.069, lng: 34.779, weight: 1 },
      { lat: 32.068, lng: 34.778, weight: 1 },
      // Moderately distant point
      { lat: 32.100, lng: 34.800, weight: 1 },
    ];
    const lenient = detectOutliers(points, 10);
    const strict = detectOutliers(points, 1);
    expect(strict.outliers.length).toBeGreaterThanOrEqual(
      lenient.outliers.length
    );
  });
});

// --- preprocess (full pipeline) ---

describe("preprocess", () => {
  it("processes mock data: separates valid, outliers, and rejected", () => {
    const subs = generateMockSubmissions({
      count: 100,
      outlierCount: 7,
      invalidCount: 3,
      seed: 42,
    });
    const result = preprocess(subs);

    // 3 invalid points should be rejected
    expect(result.rejected).toHaveLength(3);

    // Valid + outliers should account for all non-rejected submissions
    // (after dedup, counts may differ from raw input)
    expect(result.valid.length).toBeGreaterThan(0);
    expect(result.valid.length + result.outliers.length).toBeGreaterThan(0);

    // No rejected point should appear in valid or outliers
    for (const r of result.rejected) {
      const inValid = result.valid.find(
        (v) => v.lat === r.lat && v.lng === r.lng
      );
      expect(inValid).toBeUndefined();
    }
  });

  it("rejects nothing when all submissions are within bounds", () => {
    const subs = generateMockSubmissions({
      count: 50,
      outlierCount: 0,
      invalidCount: 0,
      seed: 99,
    });
    const result = preprocess(subs);
    expect(result.rejected).toHaveLength(0);
    expect(result.valid.length + result.outliers.length).toBeGreaterThan(0);
  });

  it("handles all-invalid input", () => {
    const subs: Submission[] = [
      { id: "a", lat: 40.0, lng: -74.0 },
      { id: "b", lat: 50.0, lng: 10.0 },
    ];
    const result = preprocess(subs);
    expect(result.rejected).toHaveLength(2);
    expect(result.valid).toHaveLength(0);
    expect(result.outliers).toHaveLength(0);
  });

  it("deduplicates before outlier detection", () => {
    // 20 identical points + 1 far point
    const subs: Submission[] = [
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `dup_${i}`,
        lat: 32.07,
        lng: 34.78,
      })),
      { id: "far", lat: 33.0, lng: 35.0 },
    ];
    const result = preprocess(subs);
    // The 20 duplicates should become 1 weighted point
    // The far point may or may not be an outlier depending on MAD,
    // but total deduped count should be 2
    const totalDeduped = result.valid.length + result.outliers.length;
    expect(totalDeduped).toBe(2);
  });

  it("handles empty input", () => {
    const result = preprocess([]);
    expect(result.valid).toHaveLength(0);
    expect(result.outliers).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
  });
});
