/**
 * Mock data generator for algorithm testing.
 * Produces realistic Tel Aviv area submissions with configurable clusters,
 * outliers, and invalid points. Uses seeded PRNG for reproducibility.
 */

export interface Submission {
  id: string;
  lat: number;
  lng: number;
}

// --- Seeded PRNG (mulberry32) ---

type RNG = () => number;

function mulberry32(seed: number): RNG {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample from a normal distribution using Box-Muller transform. */
function normalRandom(rng: RNG, mean: number, stddev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

// --- Neighborhood definitions ---

interface Neighborhood {
  name: string;
  centerLat: number;
  centerLng: number;
  stdLat: number;
  stdLng: number;
  weight: number; // relative probability of sampling from this cluster
}

const TEL_AVIV_NEIGHBORHOODS: Neighborhood[] = [
  {
    name: "central",
    centerLat: 32.07,
    centerLng: 34.78,
    stdLat: 0.01,
    stdLng: 0.008,
    weight: 0.45,
  },
  {
    name: "north",
    centerLat: 32.11,
    centerLng: 34.79,
    stdLat: 0.008,
    stdLng: 0.007,
    weight: 0.30,
  },
  {
    name: "south",
    centerLat: 31.98,
    centerLng: 34.78,
    stdLat: 0.012,
    stdLng: 0.008,
    weight: 0.25,
  },
];

// --- Outlier definitions (far suburbs / neighboring cities) ---

interface OutlierZone {
  name: string;
  lat: number;
  lng: number;
  spread: number; // small jitter around the point
}

const OUTLIER_ZONES: OutlierZone[] = [
  { name: "Rishon LeZion", lat: 31.97, lng: 34.80, spread: 0.005 },
  { name: "Herzliya", lat: 32.16, lng: 34.79, spread: 0.005 },
  { name: "Bat Yam", lat: 32.02, lng: 34.74, spread: 0.003 },
  { name: "Petah Tikva", lat: 32.09, lng: 34.88, spread: 0.005 },
  { name: "Holon", lat: 32.01, lng: 34.77, spread: 0.004 },
];

// --- Invalid points (outside Israel bounding box [31.0-33.5, 34.0-35.5]) ---

const INVALID_POINTS: Array<{ lat: number; lng: number; reason: string }> = [
  { lat: 40.7128, lng: -74.006, reason: "New York City" },
  { lat: 30.5, lng: 33.5, reason: "Sinai desert, outside Israel bbox" },
  { lat: 34.0, lng: 35.0, reason: "latitude/longitude swapped" },
];

// --- Main generator ---

export interface MockDataOptions {
  count?: number;
  outlierCount?: number;
  invalidCount?: number;
  seed?: number;
}

export function generateMockSubmissions(options: MockDataOptions = {}): Submission[] {
  const {
    count = 100,
    outlierCount = 7,
    invalidCount = 3,
    seed = 42,
  } = options;

  const rng = mulberry32(seed);
  const submissions: Submission[] = [];
  let idx = 0;

  // Compute cumulative weights for neighborhood selection
  const totalWeight = TEL_AVIV_NEIGHBORHOODS.reduce((s, n) => s + n.weight, 0);
  const cumulativeWeights: number[] = [];
  let cumulative = 0;
  for (const n of TEL_AVIV_NEIGHBORHOODS) {
    cumulative += n.weight / totalWeight;
    cumulativeWeights.push(cumulative);
  }

  // Generate main cluster points
  const mainCount = count - outlierCount - invalidCount;
  for (let i = 0; i < mainCount; i++) {
    const r = rng();
    let neighborhood = TEL_AVIV_NEIGHBORHOODS[0];
    for (let j = 0; j < cumulativeWeights.length; j++) {
      if (r <= cumulativeWeights[j]) {
        neighborhood = TEL_AVIV_NEIGHBORHOODS[j];
        break;
      }
    }

    submissions.push({
      id: `mock_${idx++}`,
      lat: normalRandom(rng, neighborhood.centerLat, neighborhood.stdLat),
      lng: normalRandom(rng, neighborhood.centerLng, neighborhood.stdLng),
    });
  }

  // Generate outliers
  for (let i = 0; i < outlierCount; i++) {
    const zone = OUTLIER_ZONES[i % OUTLIER_ZONES.length];
    submissions.push({
      id: `mock_outlier_${idx++}`,
      lat: normalRandom(rng, zone.lat, zone.spread),
      lng: normalRandom(rng, zone.lng, zone.spread),
    });
  }

  // Generate invalid points
  for (let i = 0; i < invalidCount; i++) {
    const pt = INVALID_POINTS[i % INVALID_POINTS.length];
    submissions.push({
      id: `mock_invalid_${idx++}`,
      lat: pt.lat,
      lng: pt.lng,
    });
  }

  return submissions;
}
