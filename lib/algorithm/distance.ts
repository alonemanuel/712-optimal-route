import { LatLng, Coordinate } from "./types";

/**
 * Earth's radius in meters (WGS84 mean)
 */
const EARTH_RADIUS_M = 6_371_000;

/**
 * Haversine formula: compute great-circle distance between two points on Earth.
 *
 * @param lat1 Latitude of first point (degrees)
 * @param lng1 Longitude of first point (degrees)
 * @param lat2 Latitude of second point (degrees)
 * @param lng2 Longitude of second point (degrees)
 * @returns Distance in meters (accurate to ~0.5% for typical city distances)
 *
 * @example
 * const distMeters = haversineDistance(32.07, 34.77, 32.09, 34.80);
 * // ~ 3.6 km between two Tel Aviv coordinates
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180; // radians
  const phi2 = (lat2 * Math.PI) / 180; // radians
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));

  return EARTH_RADIUS_M * c;
}

/**
 * Haversine distance between two LatLng objects.
 *
 * @param point1 First point
 * @param point2 Second point
 * @returns Distance in meters
 */
export function haversineDistancePoints(
  point1: LatLng,
  point2: LatLng
): number {
  return haversineDistance(point1.lat, point1.lng, point2.lat, point2.lng);
}

/**
 * Project a geographic point (lat/lng) to local Cartesian coordinates (x, y) in meters.
 *
 * This uses a flat-earth approximation around a reference point, valid for city-scale
 * distances (~20 km). The projection error is negligible (<0.01%) for our use case.
 *
 * @param lat Latitude of the point (degrees)
 * @param lng Longitude of the point (degrees)
 * @param refLat Reference latitude (degrees) — typically the centroid
 * @param refLng Reference longitude (degrees) — typically the centroid
 * @returns {x, y} in meters relative to reference point
 *
 * @example
 * const ref = { lat: 32.08, lng: 34.77 };
 * const point = { lat: 32.09, lng: 34.80 };
 * const xy = toLocalXY(point.lat, point.lng, ref.lat, ref.lng);
 * // xy ≈ { x: 3000, y: 1100 } (approximate, in meters)
 */
export function toLocalXY(
  lat: number,
  lng: number,
  refLat: number,
  refLng: number
): Coordinate {
  // East-West component: haversine from ref point along the same latitude
  let x = haversineDistance(refLat, refLng, refLat, lng);
  if (lng < refLng) {
    x = -x; // negative if west of reference
  }

  // North-South component: haversine from ref point along the same longitude
  let y = haversineDistance(refLat, refLng, lat, refLng);
  if (lat < refLat) {
    y = -y; // negative if south of reference
  }

  return { x, y };
}

/**
 * Convert local Cartesian coordinates (x, y) in meters back to geographic (lat/lng).
 *
 * Inverse of toLocalXY. Uses the same flat-earth approximation.
 *
 * @param x X coordinate in meters (east-positive)
 * @param y Y coordinate in meters (north-positive)
 * @param refLat Reference latitude (degrees)
 * @param refLng Reference longitude (degrees)
 * @returns {lat, lng} in degrees
 *
 * @example
 * const xy = { x: 3000, y: 1100 };
 * const ref = { lat: 32.08, lng: 34.77 };
 * const latLng = fromLocalXY(xy.x, xy.y, ref.lat, ref.lng);
 * // latLng ≈ { lat: 32.09, lng: 34.80 }
 */
export function fromLocalXY(
  x: number,
  y: number,
  refLat: number,
  refLng: number
): LatLng {
  // Start from reference and move in local coordinates
  // We need to invert the haversine projection, which is approximate.
  // For city scale, we can use linear approximation: 1 degree ≈ 111 km

  // Approximate conversion: 1 degree latitude ≈ 111,000 meters
  const metersPerDegreeLat = 111_000;

  // 1 degree longitude varies with latitude. At Tel Aviv (~32°N):
  // 1 degree longitude ≈ 111,000 * cos(32°) ≈ 94,100 meters
  const metersPerDegreeLng =
    111_000 * Math.cos((refLat * Math.PI) / 180);

  const lat = refLat + y / metersPerDegreeLat;
  const lng = refLng + x / metersPerDegreeLng;

  return { lat, lng };
}

/**
 * Compute the centroid (average point) of a set of geographic coordinates.
 *
 * Uses a simple arithmetic mean, valid for city-scale. For larger regions,
 * spherical mean would be more accurate, but negligible difference here.
 *
 * @param points Array of {lat, lng} coordinates
 * @returns Centroid {lat, lng}
 */
export function computeCentroid(points: LatLng[]): LatLng {
  if (points.length === 0) {
    throw new Error("Cannot compute centroid of empty point set");
  }

  let sumLat = 0,
    sumLng = 0;
  for (const point of points) {
    sumLat += point.lat;
    sumLng += point.lng;
  }

  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}

/**
 * Compute the weighted centroid of geographic coordinates.
 *
 * Each point can have an associated weight (e.g., from deduplication).
 *
 * @param points Array of {lat, lng} coordinates
 * @param weights Array of weights (same length as points), default all 1.0
 * @returns Weighted centroid {lat, lng}
 */
export function computeWeightedCentroid(
  points: LatLng[],
  weights?: number[]
): LatLng {
  if (points.length === 0) {
    throw new Error("Cannot compute centroid of empty point set");
  }

  const w = weights || Array(points.length).fill(1);
  if (w.length !== points.length) {
    throw new Error("Weights array must match points array length");
  }

  let sumLat = 0,
    sumLng = 0,
    sumWeight = 0;

  for (let i = 0; i < points.length; i++) {
    sumLat += points[i].lat * w[i];
    sumLng += points[i].lng * w[i];
    sumWeight += w[i];
  }

  if (sumWeight === 0) {
    throw new Error("Sum of weights is zero");
  }

  return {
    lat: sumLat / sumWeight,
    lng: sumLng / sumWeight,
  };
}
