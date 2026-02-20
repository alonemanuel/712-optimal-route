import { describe, it, expect } from 'vitest';
import { toLocalXY, fromLocalXY, projectMany, unprojectMany } from './projection';
import { haversine } from './distance';

// Tel Aviv city center as reference point
const REF_LAT = 32.0853;
const REF_LNG = 34.7818;

describe('toLocalXY', () => {
  it('projects the reference point to (0, 0)', () => {
    const { x, y } = toLocalXY(REF_LAT, REF_LNG, REF_LAT, REF_LNG);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it('point north of ref has positive y, x near zero', () => {
    const { x, y } = toLocalXY(REF_LAT + 0.01, REF_LNG, REF_LAT, REF_LNG);
    expect(y).toBeGreaterThan(1000); // ~1.1 km
    expect(Math.abs(x)).toBe(0);
  });

  it('point east of ref has positive x, y near zero', () => {
    const { x, y } = toLocalXY(REF_LAT, REF_LNG + 0.01, REF_LAT, REF_LNG);
    expect(x).toBeGreaterThan(800); // ~0.9 km at 32 deg N
    expect(Math.abs(y)).toBe(0);
  });

  it('point south of ref has negative y', () => {
    const { x, y } = toLocalXY(REF_LAT - 0.01, REF_LNG, REF_LAT, REF_LNG);
    expect(y).toBeLessThan(-1000);
  });

  it('point west of ref has negative x', () => {
    const { x, y } = toLocalXY(REF_LAT, REF_LNG - 0.01, REF_LAT, REF_LNG);
    expect(x).toBeLessThan(-800);
  });

  it('distance from origin matches haversine distance', () => {
    const targetLat = 32.1047; // Tel Aviv Port
    const targetLng = 34.7679;
    const { x, y } = toLocalXY(targetLat, targetLng, REF_LAT, REF_LNG);

    const xyDist = Math.sqrt(x ** 2 + y ** 2);
    const haversineDist = haversine(REF_LAT, REF_LNG, targetLat, targetLng);

    // At city scale, Euclidean distance on projected coords should match
    // haversine within 1% (the projection is accurate at this range)
    expect(xyDist).toBeCloseTo(haversineDist, -1); // within ~10m
  });
});

describe('fromLocalXY', () => {
  it('unprojects (0, 0) back to the reference point', () => {
    const { lat, lng } = fromLocalXY(0, 0, REF_LAT, REF_LNG);
    expect(lat).toBeCloseTo(REF_LAT, 10);
    expect(lng).toBeCloseTo(REF_LNG, 10);
  });

  it('positive y returns a point north of ref', () => {
    const { lat } = fromLocalXY(0, 1000, REF_LAT, REF_LNG);
    expect(lat).toBeGreaterThan(REF_LAT);
  });

  it('positive x returns a point east of ref', () => {
    const { lng } = fromLocalXY(1000, 0, REF_LAT, REF_LNG);
    expect(lng).toBeGreaterThan(REF_LNG);
  });
});

describe('round-trip: toLocalXY → fromLocalXY', () => {
  const testPoints = [
    { name: 'Tel Aviv Port', lat: 32.1047, lng: 34.7679 },
    { name: 'Jaffa', lat: 32.0505, lng: 34.7508 },
    { name: 'Ramat Aviv', lat: 32.1133, lng: 34.7981 },
    { name: 'Florentin', lat: 32.0580, lng: 34.7700 },
    { name: 'Central Bus Station', lat: 32.0564, lng: 34.7812 },
  ];

  for (const point of testPoints) {
    it(`round-trips ${point.name} within 1 meter`, () => {
      const { x, y } = toLocalXY(point.lat, point.lng, REF_LAT, REF_LNG);
      const recovered = fromLocalXY(x, y, REF_LAT, REF_LNG);

      const errorM = haversine(point.lat, point.lng, recovered.lat, recovered.lng);
      expect(errorM).toBeLessThan(1); // less than 1 meter error
    });
  }
});

describe('projectMany / unprojectMany', () => {
  const points = [
    { lat: 32.1047, lng: 34.7679 },
    { lat: 32.0505, lng: 34.7508 },
    { lat: 32.0580, lng: 34.7700 },
  ];

  it('projects all points', () => {
    const projected = projectMany(points, REF_LAT, REF_LNG);
    expect(projected).toHaveLength(3);
    projected.forEach((p) => {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
    });
  });

  it('unprojects all points', () => {
    const projected = projectMany(points, REF_LAT, REF_LNG);
    const unprojected = unprojectMany(projected, REF_LAT, REF_LNG);
    expect(unprojected).toHaveLength(3);
    unprojected.forEach((p) => {
      expect(typeof p.lat).toBe('number');
      expect(typeof p.lng).toBe('number');
    });
  });

  it('round-trips all points within 1 meter', () => {
    const projected = projectMany(points, REF_LAT, REF_LNG);
    const unprojected = unprojectMany(projected, REF_LAT, REF_LNG);

    for (let i = 0; i < points.length; i++) {
      const errorM = haversine(
        points[i].lat,
        points[i].lng,
        unprojected[i].lat,
        unprojected[i].lng
      );
      expect(errorM).toBeLessThan(1);
    }
  });

  it('handles empty arrays', () => {
    expect(projectMany([], REF_LAT, REF_LNG)).toEqual([]);
    expect(unprojectMany([], REF_LAT, REF_LNG)).toEqual([]);
  });
});
