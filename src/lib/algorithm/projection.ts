/**
 * Coordinate projection: lat/lng ↔ local (x, y) meters.
 *
 * Projects geographic coordinates to a flat Cartesian plane centered on a
 * reference point. At city scale (~20km), the projection error is negligible
 * (<0.01%). This allows standard Euclidean k-means on the projected points.
 *
 * See algorithm.md Section 2 for the math.
 */

import { haversine } from './distance';
import type { LatLng } from './types';

const EARTH_RADIUS_M = 6_371_000;

/**
 * Project a single lat/lng to local (x, y) in meters from a reference point.
 *
 * x = east-west distance (positive = east of ref)
 * y = north-south distance (positive = north of ref)
 */
export function toLocalXY(
  lat: number,
  lng: number,
  refLat: number,
  refLng: number
): { x: number; y: number } {
  // East-west: hold lat constant at refLat, vary lng
  let x = haversine(refLat, refLng, refLat, lng);
  if (lng < refLng) x = -x;

  // North-south: hold lng constant at refLng, vary lat
  let y = haversine(refLat, refLng, lat, refLng);
  if (lat < refLat) y = -y;

  return { x, y };
}

/**
 * Unproject local (x, y) meters back to lat/lng.
 *
 * Inverts toLocalXY by converting meter offsets back to degree offsets.
 * Uses the exact formulas:
 *   dLat = y / R  (in radians)
 *   dLng = x / (R * cos(refLat))  (in radians)
 */
export function fromLocalXY(
  x: number,
  y: number,
  refLat: number,
  refLng: number
): LatLng {
  const refLatRad = (refLat * Math.PI) / 180;

  // y meters → latitude offset in degrees
  const dLatRad = y / EARTH_RADIUS_M;
  const lat = refLat + (dLatRad * 180) / Math.PI;

  // x meters → longitude offset in degrees (adjusted for latitude)
  const dLngRad = x / (EARTH_RADIUS_M * Math.cos(refLatRad));
  const lng = refLng + (dLngRad * 180) / Math.PI;

  return { lat, lng };
}

/**
 * Project an array of lat/lng points to local (x, y) coordinates.
 */
export function projectMany(
  points: LatLng[],
  refLat: number,
  refLng: number
): { x: number; y: number }[] {
  return points.map((p) => toLocalXY(p.lat, p.lng, refLat, refLng));
}

/**
 * Unproject an array of local (x, y) coordinates back to lat/lng.
 */
export function unprojectMany(
  points: { x: number; y: number }[],
  refLat: number,
  refLng: number
): LatLng[] {
  return points.map((p) => fromLocalXY(p.x, p.y, refLat, refLng));
}
