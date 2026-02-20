# Database Setup Task Plan

## Goal
Create SQLite database schema and initialization for Phase 2 (API + Backend)

## Subtasks

- [x] Install sqlite3 package
  - Used `sql.js` for cross-platform SQLite (better Node 18 compatibility)
  - Added to package.json dependencies

- [x] Create database schema file (`lib/db/schema.sql`)
  - `submissions` table with all columns and indexes
  - `computed_routes` table with all columns and indexes
  - `metadata` table for system state
  - Ensured UNIQUE constraint on `google_user_id`
  - Created indexes on `lat, lng` and `computed_at DESC`

- [x] Create database initialization (`lib/db/init.ts`)
  - Initialized sql.js database
  - Automatic table creation from schema.sql
  - Database location configuration (`.data/app.db` in dev, env var in prod)
  - Save/close/reset functions

- [x] Create TypeScript types (`lib/db/types.ts`)
  - `Submission` interface
  - `ComputedRoute` interface
  - `Stop` interface
  - Complete API request/response types

- [x] Create database utilities (`lib/db/queries.ts`)
  - 30+ helper functions for common queries (select, insert, update, delete)
  - Proper parameter binding to prevent SQL injection
  - Statistics functions (address distribution, heatmap locations)

- [x] Create environment variables template (`.env.example`)
  - `DATABASE_PATH` configured
  - Google OAuth credentials
  - JWT secret
  - Admin emails
  - Google Maps API key
  - Base URL

- [x] Test database setup locally
  - Created test script (`lib/db/test.ts`)
  - Insert test submission
  - Verify schema
  - Query all operations
  - ✅ All tests pass

- [x] Document setup process
  - Created task notes with implementation details
  - Added to task plan

## Acceptance Criteria

✅ SQLite database file can be created and initialized
✅ Both tables exist with correct schema and indexes
✅ TypeScript types are properly defined
✅ Database utilities are ready to use in API routes
✅ Setup can be tested with a simple test script
✅ Documentation guides next developer on schema
