/**
 * Preprocessing pipeline for rider submissions.
 * Steps: bounds validation → deduplication → outlier detection.
 * See algorithm.md Section 1.
 */

import { haversine } from "./distance";
import type {
  Submission,
  WeightedPoint,
  OutlierPoint,
  RejectedPoint,
  PreprocessResult,
  AlgoParams,
} from "./types";
import { DEFAULT_ALGO_PARAMS, ISRAEL_BOUNDS } from "./types";

// --- 1c. Bounding Box Validation ---

export interface BoundsValidationResult {
  valid: Submission[];
  rejected: RejectedPoint[];
}

export function validateBounds(
  submissions: Submission[],
  bounds = ISRAEL_BOUNDS
): BoundsValidationResult {
  const valid: Submission[] = [];
  const rejected: RejectedPoint[] = [];

  for (const s of submissions) {
    if (
      s.lat >= bounds.lat.min &&
      s.lat <= bounds.lat.max &&
      s.lng >= bounds.lng.min &&
      s.lng <= bounds.lng.max
    ) {
      valid.push(s);
    } else {
      rejected.push({
        lat: s.lat,
        lng: s.lng,
        id: s.id,
        reason: `Outside bounds: lat [${bounds.lat.min}, ${bounds.lat.max}], lng [${bounds.lng.min}, ${bounds.lng.max}]`,
      });
    }
  }

  return { valid, rejected };
}

// --- 1a. Deduplication ---

const DEDUP_PRECISION = 5; // decimal places (~1.1m)

function roundCoord(value: number): number {
  const factor = 10 ** DEDUP_PRECISION;
  return Math.round(value * factor) / factor;
}

export function deduplicatePoints(submissions: Submission[]): WeightedPoint[] {
  const map = new Map<string, WeightedPoint>();

  for (const s of submissions) {
    const lat = roundCoord(s.lat);
    const lng = roundCoord(s.lng);
    const key = `${lat},${lng}`;

    const existing = map.get(key);
    if (existing) {
      existing.weight++;
    } else {
      map.set(key, { lat, lng, weight: 1 });
    }
  }

  return Array.from(map.values());
}

// --- 1b. Outlier Detection (MAD) ---

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export interface OutlierDetectionResult {
  valid: WeightedPoint[];
  outliers: OutlierPoint[];
}

export function detectOutliers(
  points: WeightedPoint[],
  threshold: number = DEFAULT_ALGO_PARAMS.OUTLIER_MAD_THRESHOLD
): OutlierDetectionResult {
  if (points.length === 0) {
    return { valid: [], outliers: [] };
  }

  // Compute median center
  const medianLat = median(points.map((p) => p.lat));
  const medianLng = median(points.map((p) => p.lng));

  // Compute haversine distances from median center
  const distances = points.map((p) =>
    haversine(p.lat, p.lng, medianLat, medianLng)
  );

  // Compute MAD of distances
  const medianDist = median(distances);
  const absoluteDeviations = distances.map((d) => Math.abs(d - medianDist));
  const mad = median(absoluteDeviations);

  // Flag outliers: distance > median + threshold * MAD
  const cutoff = medianDist + threshold * mad;

  const valid: WeightedPoint[] = [];
  const outliers: OutlierPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    if (distances[i] > cutoff) {
      outliers.push({
        lat: points[i].lat,
        lng: points[i].lng,
        id: `dedup_${i}`,
      });
    } else {
      valid.push(points[i]);
    }
  }

  return { valid, outliers };
}

// --- Main Pipeline ---

export function preprocess(
  submissions: Submission[],
  params: Pick<AlgoParams, "OUTLIER_MAD_THRESHOLD"> = DEFAULT_ALGO_PARAMS
): PreprocessResult {
  // Step 1c: Validate bounds (run first to filter garbage)
  const { valid: inBounds, rejected } = validateBounds(submissions);

  // Step 1a: Deduplicate
  const deduped = deduplicatePoints(inBounds);

  // Step 1b: Detect outliers
  const { valid, outliers } = detectOutliers(
    deduped,
    params.OUTLIER_MAD_THRESHOLD
  );

  return { valid, outliers, rejected };
}
