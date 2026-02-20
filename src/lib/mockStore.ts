import type { Submission } from "@/lib/algorithm/types";
import { generateMockSubmissions } from "@/lib/algorithm/mockData";

/**
 * In-memory submission store for development.
 * Seeded with mock data on first access.
 * Replaced by Supabase in production.
 */

let submissions: Submission[] | null = null;

function ensureSeeded(): Submission[] {
  if (submissions === null) {
    submissions = generateMockSubmissions({ count: 80, seed: 42 });
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
