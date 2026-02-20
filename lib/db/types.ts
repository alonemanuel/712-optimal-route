/**
 * Database types for 712 Optimal Route
 * Corresponds to schema.sql and api-data.md
 */

export interface Stop {
  lat: number;
  lng: number;
  label: string;
  rider_count: number;
}

export interface Submission {
  id: string;
  google_user_id: string;
  email: string;
  display_name: string;
  address_text: string;
  lat: number;
  lng: number;
  is_seed: number; // 0 or 1
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface ComputedRoute {
  id: string;
  stops: Stop[]; // Stored as JSON string in DB, parsed here
  polyline: string | null;
  avg_walk_distance_m: number;
  coverage_400m_pct: number;
  p90_walk_distance_m: number;
  num_stops: number;
  total_submissions: number;
  k_value: number;
  computed_at: string; // ISO 8601
}

export interface RouteStats {
  total_submissions: number;
  avg_walk_distance_m: number | null;
  coverage_400m_pct: number | null;
  p90_walk_distance_m: number | null;
  num_stops: number | null;
  k_value: number | null;
  route_computed_at: string | null;
  submissions_since_last_compute: number;
}

export interface AddressDistribution {
  city: string;
  count: number;
}

export interface SubmissionLocation {
  lat: number;
  lng: number;
}

// Request/Response types for API
export interface CreateSubmissionRequest {
  address_text: string;
  lat: number;
  lng: number;
}

export interface UpdateSubmissionRequest {
  address_text: string;
  lat: number;
  lng: number;
}

export interface SubmissionResponse {
  submission: Omit<Submission, 'is_seed'>;
}

export interface RouteResponse {
  route: RouteData | null;
}

export interface RouteData extends Omit<ComputedRoute, 'stops'> {
  stops: Stop[];
  current_avg_walk_distance_m: number;
  current_coverage_400m_pct: number;
  current_stop_count: number;
}

export interface StatsResponse {
  stats: {
    total_submissions: number;
    avg_walk_distance_m: number | null;
    coverage_400m_pct: number | null;
    num_stops: number | null;
    k_value: number | null;
    route_computed_at: string | null;
    submissions_since_last_compute: number;
    address_distribution: AddressDistribution[];
  };
}

export interface LocationsResponse {
  locations: SubmissionLocation[];
}

export interface ImportResponse {
  imported: number;
  skipped: number;
  errors: ImportError[];
  total_rows: number;
}

export interface ImportError {
  row: number;
  address: string;
  reason: string;
}

// Error response types
export interface ValidationDetail {
  field: string;
  message: string;
  message_he: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    message_he: string;
    details?: ValidationDetail[];
  };
}
