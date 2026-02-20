/**
 * Database query utilities
 * Provides type-safe helper functions for database operations
 */

import { getDatabase, saveDatabase } from './init';
import {
  Submission,
  ComputedRoute,
  Stop,
  SubmissionLocation,
  AddressDistribution,
} from './types';

// ============ SUBMISSIONS ============

/**
 * Get submission by google_user_id
 */
export async function getSubmissionByUserId(
  googleUserId: string
): Promise<Submission | null> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `SELECT * FROM submissions WHERE google_user_id = ? LIMIT 1`
  );
  stmt.bind([googleUserId]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as Submission;
  }

  stmt.free();
  return null;
}

/**
 * Get submission by ID
 */
export async function getSubmissionById(id: string): Promise<Submission | null> {
  const db = await getDatabase();

  const stmt = db.prepare(`SELECT * FROM submissions WHERE id = ? LIMIT 1`);
  stmt.bind([id]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as Submission;
  }

  stmt.free();
  return null;
}

/**
 * Get all submissions
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  const db = await getDatabase();

  const stmt = db.prepare(`SELECT * FROM submissions ORDER BY created_at ASC`);
  const submissions: Submission[] = [];

  while (stmt.step()) {
    submissions.push(stmt.getAsObject() as Submission);
  }

  stmt.free();
  return submissions;
}

/**
 * Get non-seed submissions only
 */
export async function getNonSeedSubmissions(): Promise<Submission[]> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `SELECT * FROM submissions WHERE is_seed = 0 ORDER BY created_at ASC`
  );
  const submissions: Submission[] = [];

  while (stmt.step()) {
    submissions.push(stmt.getAsObject() as Submission);
  }

  stmt.free();
  return submissions;
}

/**
 * Get submission count
 */
export async function getSubmissionCount(): Promise<number> {
  const db = await getDatabase();

  const stmt = db.prepare(`SELECT COUNT(*) as count FROM submissions`);
  stmt.step();
  const result = stmt.getAsObject() as { count: number };
  stmt.free();

  return result.count;
}

/**
 * Insert new submission
 */
export async function insertSubmission(
  submission: Omit<Submission, 'id' | 'created_at' | 'updated_at'>
): Promise<Submission> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `INSERT INTO submissions (google_user_id, email, display_name, address_text, lat, lng, is_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.bind([
    submission.google_user_id,
    submission.email,
    submission.display_name,
    submission.address_text,
    submission.lat,
    submission.lng,
    submission.is_seed,
  ]);

  stmt.step();
  stmt.free();

  await saveDatabase();

  // Return the created submission
  return getSubmissionByUserId(submission.google_user_id) as Promise<Submission>;
}

/**
 * Update submission
 */
export async function updateSubmission(
  googleUserId: string,
  updates: {
    address_text?: string;
    lat?: number;
    lng?: number;
    display_name?: string;
    email?: string;
  }
): Promise<Submission | null> {
  const db = await getDatabase();

  const existing = await getSubmissionByUserId(googleUserId);
  if (!existing) return null;

  const stmt = db.prepare(
    `UPDATE submissions SET
      address_text = ?,
      lat = ?,
      lng = ?,
      display_name = ?,
      email = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE google_user_id = ?`
  );

  stmt.bind([
    updates.address_text ?? existing.address_text,
    updates.lat ?? existing.lat,
    updates.lng ?? existing.lng,
    updates.display_name ?? existing.display_name,
    updates.email ?? existing.email,
    googleUserId,
  ]);

  stmt.step();
  stmt.free();

  await saveDatabase();

  return getSubmissionByUserId(googleUserId);
}

/**
 * Delete submission
 */
export async function deleteSubmission(googleUserId: string): Promise<boolean> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `DELETE FROM submissions WHERE google_user_id = ?`
  );
  stmt.bind([googleUserId]);

  stmt.step();
  stmt.free();

  await saveDatabase();

  return true;
}

/**
 * Get submission locations for heatmap
 */
export async function getSubmissionLocations(): Promise<SubmissionLocation[]> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `SELECT lat, lng FROM submissions ORDER BY created_at ASC`
  );
  const locations: SubmissionLocation[] = [];

  while (stmt.step()) {
    locations.push(stmt.getAsObject() as SubmissionLocation);
  }

  stmt.free();
  return locations;
}

// ============ COMPUTED ROUTES ============

/**
 * Get latest computed route
 */
export async function getLatestRoute(): Promise<ComputedRoute | null> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `SELECT * FROM computed_routes ORDER BY computed_at DESC LIMIT 1`
  );

  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();

    return {
      ...row,
      stops: JSON.parse(row.stops) as Stop[],
    } as ComputedRoute;
  }

  stmt.free();
  return null;
}

/**
 * Insert computed route
 */
export async function insertRoute(
  route: Omit<ComputedRoute, 'id' | 'computed_at'>
): Promise<ComputedRoute> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `INSERT INTO computed_routes (stops, polyline, avg_walk_distance_m, coverage_400m_pct, p90_walk_distance_m, num_stops, total_submissions, k_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.bind([
    JSON.stringify(route.stops),
    route.polyline || null,
    route.avg_walk_distance_m,
    route.coverage_400m_pct,
    route.p90_walk_distance_m,
    route.num_stops,
    route.total_submissions,
    route.k_value,
  ]);

  stmt.step();
  stmt.free();

  await saveDatabase();

  return getLatestRoute() as Promise<ComputedRoute>;
}

// ============ METADATA ============

/**
 * Get metadata value
 */
export async function getMetadata(key: string): Promise<string | null> {
  const db = await getDatabase();

  const stmt = db.prepare(`SELECT value FROM metadata WHERE key = ? LIMIT 1`);
  stmt.bind([key]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as { value: string };
    stmt.free();
    return row.value;
  }

  stmt.free();
  return null;
}

/**
 * Set metadata value
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `INSERT OR REPLACE INTO metadata (key, value, updated_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
  );

  stmt.bind([key, value]);
  stmt.step();
  stmt.free();

  await saveDatabase();
}

// ============ STATISTICS ============

/**
 * Get address distribution (city counts)
 */
export async function getAddressDistribution(): Promise<AddressDistribution[]> {
  const db = await getDatabase();

  // Simple heuristic: split address_text by comma and take the last part (usually city)
  const stmt = db.prepare(
    `SELECT
       TRIM(SUBSTR(address_text, INSTR(address_text, ',') + 1)) as city,
       COUNT(*) as count
     FROM submissions
     GROUP BY city
     ORDER BY count DESC`
  );

  const distribution: AddressDistribution[] = [];

  while (stmt.step()) {
    distribution.push(stmt.getAsObject() as AddressDistribution);
  }

  stmt.free();
  return distribution;
}

/**
 * Get submissions since timestamp
 */
export async function getSubmissionsSince(
  timestamp: string
): Promise<Submission[]> {
  const db = await getDatabase();

  const stmt = db.prepare(
    `SELECT * FROM submissions WHERE created_at > ? ORDER BY created_at ASC`
  );
  stmt.bind([timestamp]);

  const submissions: Submission[] = [];

  while (stmt.step()) {
    submissions.push(stmt.getAsObject() as Submission);
  }

  stmt.free();
  return submissions;
}
