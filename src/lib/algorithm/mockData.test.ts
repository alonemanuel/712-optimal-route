import { describe, it, expect } from "vitest";
import { generateMockSubmissions, Submission } from "./mockData";

// Israel bounding box from algorithm spec Section 1c
const ISRAEL_LAT_MIN = 31.0;
const ISRAEL_LAT_MAX = 33.5;
const ISRAEL_LNG_MIN = 34.0;
const ISRAEL_LNG_MAX = 35.5;

// Tel Aviv approximate bounds
const TLV_LAT_MIN = 31.8;
const TLV_LAT_MAX = 32.2;
const TLV_LNG_MIN = 34.7;
const TLV_LNG_MAX = 34.9;

function isInIsraelBox(s: Submission): boolean {
  return (
    s.lat >= ISRAEL_LAT_MIN &&
    s.lat <= ISRAEL_LAT_MAX &&
    s.lng >= ISRAEL_LNG_MIN &&
    s.lng <= ISRAEL_LNG_MAX
  );
}

function isInTelAvivArea(s: Submission): boolean {
  return (
    s.lat >= TLV_LAT_MIN &&
    s.lat <= TLV_LAT_MAX &&
    s.lng >= TLV_LNG_MIN &&
    s.lng <= TLV_LNG_MAX
  );
}

describe("generateMockSubmissions", () => {
  it("returns the requested total count", () => {
    const subs = generateMockSubmissions({ count: 100 });
    expect(subs).toHaveLength(100);
  });

  it("returns default count of 100 with no options", () => {
    const subs = generateMockSubmissions();
    expect(subs).toHaveLength(100);
  });

  it("generates unique IDs for all submissions", () => {
    const subs = generateMockSubmissions({ count: 200 });
    const ids = new Set(subs.map((s) => s.id));
    expect(ids.size).toBe(200);
  });

  it("is reproducible with the same seed", () => {
    const a = generateMockSubmissions({ count: 50, seed: 123 });
    const b = generateMockSubmissions({ count: 50, seed: 123 });
    expect(a).toEqual(b);
  });

  it("produces different results with different seeds", () => {
    const a = generateMockSubmissions({ count: 50, seed: 1 });
    const b = generateMockSubmissions({ count: 50, seed: 2 });
    const sameCount = a.filter(
      (s, i) => s.lat === b[i].lat && s.lng === b[i].lng
    ).length;
    expect(sameCount).toBeLessThan(a.length);
  });

  it("most points fall within Tel Aviv area", () => {
    const subs = generateMockSubmissions({ count: 100 });
    const inTlv = subs.filter(isInTelAvivArea).length;
    // Main cluster points (90) + most outliers should be in greater TLV area
    expect(inTlv).toBeGreaterThan(70);
  });

  it("includes the expected number of outlier-labeled points", () => {
    const subs = generateMockSubmissions({ count: 100, outlierCount: 7 });
    const outliers = subs.filter((s) => s.id.includes("outlier"));
    expect(outliers).toHaveLength(7);
  });

  it("includes the expected number of invalid-labeled points", () => {
    const subs = generateMockSubmissions({ count: 100, invalidCount: 3 });
    const invalid = subs.filter((s) => s.id.includes("invalid"));
    expect(invalid).toHaveLength(3);
  });

  it("invalid points are outside the Israel bounding box", () => {
    const subs = generateMockSubmissions({ count: 100, invalidCount: 3 });
    const invalid = subs.filter((s) => s.id.includes("invalid"));
    for (const s of invalid) {
      expect(isInIsraelBox(s)).toBe(false);
    }
  });

  it("main cluster points are inside the Israel bounding box", () => {
    const subs = generateMockSubmissions({
      count: 100,
      outlierCount: 5,
      invalidCount: 3,
    });
    const main = subs.filter(
      (s) => !s.id.includes("outlier") && !s.id.includes("invalid")
    );
    for (const m of main) {
      expect(isInIsraelBox(m)).toBe(true);
    }
  });

  it("distributes points across multiple neighborhoods", () => {
    const subs = generateMockSubmissions({ count: 200, outlierCount: 0, invalidCount: 0 });
    const central = subs.filter((s) => s.lat >= 32.04 && s.lat <= 32.10);
    const north = subs.filter((s) => s.lat > 32.10);
    const south = subs.filter((s) => s.lat < 32.04);
    // Each neighborhood should have some representation
    expect(central.length).toBeGreaterThan(20);
    expect(north.length).toBeGreaterThan(10);
    expect(south.length).toBeGreaterThan(10);
  });

  it("works with custom counts", () => {
    const subs = generateMockSubmissions({
      count: 50,
      outlierCount: 3,
      invalidCount: 2,
    });
    expect(subs).toHaveLength(50);
    expect(subs.filter((s) => s.id.includes("outlier"))).toHaveLength(3);
    expect(subs.filter((s) => s.id.includes("invalid"))).toHaveLength(2);
    // Main points = 50 - 3 - 2 = 45
    const main = subs.filter(
      (s) => !s.id.includes("outlier") && !s.id.includes("invalid")
    );
    expect(main).toHaveLength(45);
  });
});
