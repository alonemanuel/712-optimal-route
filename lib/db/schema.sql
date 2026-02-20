-- 712 Optimal Route Database Schema
-- SQLite implementation
-- Based on api-data.md specification

-- Submissions table: stores rider address submissions
CREATE TABLE IF NOT EXISTS submissions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    google_user_id  TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    address_text    TEXT NOT NULL,
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    is_seed         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Indexes for submissions table
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_google_user_id
    ON submissions(google_user_id);

CREATE INDEX IF NOT EXISTS idx_submissions_coords
    ON submissions(lat, lng);

CREATE INDEX IF NOT EXISTS idx_submissions_is_seed
    ON submissions(is_seed);

CREATE INDEX IF NOT EXISTS idx_submissions_created_at
    ON submissions(created_at DESC);

-- Computed routes table: stores latest route computations
CREATE TABLE IF NOT EXISTS computed_routes (
    id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    stops               TEXT NOT NULL,
    polyline            TEXT,
    avg_walk_distance_m REAL NOT NULL,
    coverage_400m_pct   REAL NOT NULL,
    p90_walk_distance_m REAL NOT NULL DEFAULT 0,
    num_stops           INTEGER NOT NULL,
    total_submissions   INTEGER NOT NULL,
    k_value             INTEGER NOT NULL,
    computed_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Indexes for computed_routes table
CREATE INDEX IF NOT EXISTS idx_computed_routes_computed_at
    ON computed_routes(computed_at DESC);

-- Metadata table: stores system state like recalculation flags
CREATE TABLE IF NOT EXISTS metadata (
    key                 TEXT PRIMARY KEY,
    value               TEXT NOT NULL,
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Insert default metadata values
INSERT OR IGNORE INTO metadata (key, value) VALUES
    ('recalculate_pending', '0'),
    ('last_recalc_trigger', '');
