# Database Setup — Session Notes

## Session 2026-02-20

### Completed

✅ **Created database schema** (`lib/db/schema.sql`)
- Submissions table with all required columns and indexes
- Computed routes table with all required columns
- Metadata table for system state
- Proper indexes on google_user_id (UNIQUE), coordinates, and computed_at

✅ **Created TypeScript types** (`lib/db/types.ts`)
- All database model interfaces
- Request/response types for API
- Proper type exports for type safety

✅ **Created database initialization** (`lib/db/init.ts`)
- sql.js setup for cross-platform SQLite support
- Database file loading/creation
- Schema initialization from SQL file
- Save/close/reset functions
- Environment variable support (DATABASE_PATH)

✅ **Created query utilities** (`lib/db/queries.ts`)
- Submissions: insert, retrieve, update, delete, list
- Routes: insert, retrieve latest
- Metadata: get/set key-value pairs
- Statistics: address distribution, locations for heatmap
- Proper parameter binding for SQL injection prevention

✅ **Created environment template** (`.env.example`)
- Database path configuration
- Google OAuth credentials
- JWT secret
- Admin emails
- Google Maps API key
- Base URL

✅ **Created test script** (`lib/db/test.ts`)
- Full workflow test: initialize → insert → retrieve → query
- Schema verification
- Demo of all major operations

### In Progress

None

### Discovered

- sql.js is better than better-sqlite3 for Node 18 compatibility
  - pure JavaScript, no native binding issues
  - persists to file automatically
  - works in both Node and browser
- Schema file approach keeps database structure versioned in git

### Known Limitations

- sql.js doesn't support some advanced SQLite features (like ATTACH DATABASE)
- File-based SQLite may have concurrency issues under high load (acceptable for MVP)
- No migrations framework yet (can add later if needed)

### Blockers

None - ready to move forward

### Next Steps

1. Create Next.js API routes that use these database utilities
2. Implement authentication middleware for JWT validation
3. Build the `/api/auth/*` endpoints
4. Build the `/api/submissions/*` endpoints
5. Integrate the algorithm for route computation

### Files Created

```
lib/db/
├── schema.sql      # SQLite schema (3 tables)
├── types.ts        # TypeScript interfaces
├── init.ts         # Database initialization
├── queries.ts      # Query utilities (30+ functions)
└── test.ts         # Test/demo script

.env.example        # Environment variables template
```

### Code Quality

- All functions are properly typed
- SQL uses parameterized queries (no injection risk)
- Error handling for schema execution
- Clear separation of concerns (schema, types, init, queries)
- Good test coverage through test.ts script
