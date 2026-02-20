import { describe, it, expect } from "vitest";
import { haversine } from "./distance";

describe("haversine", () => {
  it("Tel Aviv city center to Tel Aviv Port is approximately 2.5km", () => {
    const dist = haversine(32.0853, 34.7818, 32.1047, 34.7679);
    expect(dist).toBeGreaterThan(2300);
    expect(dist).toBeLessThan(2700);
  });

  it("same point returns 0", () => {
    const dist = haversine(32.0853, 34.7818, 32.0853, 34.7818);
    expect(dist).toBe(0);
  });

  it("antipodal points return half the Earth circumference", () => {
    const dist = haversine(90, 0, -90, 0);
    const expectedM = Math.PI * 6_371_000;
    expect(dist).toBeCloseTo(expectedM, -2);
  });

  it("north-south only movement along same longitude", () => {
    // 1 degree of latitude is approximately 111,195 m
    const dist = haversine(32.0, 34.78, 33.0, 34.78);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it("east-west only movement along same latitude", () => {
    // At 32 deg N, 1 degree of longitude is approximately 94,500 m
    const dist = haversine(32.0, 34.0, 32.0, 35.0);
    expect(dist).toBeGreaterThan(93_000);
    expect(dist).toBeLessThan(96_000);
  });

  it("is symmetric", () => {
    const d1 = haversine(32.0853, 34.7818, 32.1047, 34.7679);
    const d2 = haversine(32.1047, 34.7679, 32.0853, 34.7818);
    expect(d1).toBeCloseTo(d2, 10);
  });

  it("equator to north pole is a quarter circumference", () => {
    const dist = haversine(0, 0, 90, 0);
    const expected = (Math.PI / 2) * 6_371_000;
    expect(dist).toBeCloseTo(expected, -2);
  });
});
