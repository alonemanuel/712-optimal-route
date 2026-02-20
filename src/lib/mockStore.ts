import type { Submission } from "@/lib/algorithm/types";
import { SEED_SUBMISSIONS } from "@/lib/seedData";

/**
 * In-memory submission store for development.
 * Seeded with real user data from Tel Aviv on first access.
 * Replaced by Supabase in production.
 */

let submissions: Submission[] | null = null;

function ensureSeeded(): Submission[] {
  if (submissions === null) {
    // Convert seed submissions to algorithm format (id, lat, lng)
    submissions = SEED_SUBMISSIONS.map(s => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
    }));
  }
  return submissions;
}

export function getSubmissions(): Submission[] {
  return ensureSeeded();
}

export function addSubmission(sub: Submission): void {
  ensureSeeded();
  submissions!.push(sub);
}
