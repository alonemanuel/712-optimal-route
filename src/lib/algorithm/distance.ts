/**
 * Haversine distance calculation between two geographic coordinates.
 * Used as the core distance metric for k-means clustering and route scoring.
 */

const EARTH_RADIUS_M = 6_371_000; // Earth radius in meters

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns the great-circle distance in meters between two coordinates.
 *
 * Formula from algorithm spec Section 2:
 *   a = sin(dphi/2)^2 + cos(phi1) * cos(phi2) * sin(dlambda/2)^2
 *   distance = 2 * R * asin(sqrt(a))
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dphi = toRadians(lat2 - lat1);
  const dlambda = toRadians(lng2 - lng1);

  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
