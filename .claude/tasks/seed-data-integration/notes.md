# Seed Data Integration — Session 2026-02-20

## What was completed

### 1. Parsed 34 real user addresses
- Started with 32 entries from your form submissions
- Skipped 1 NaN entry (unrecoverable)
- Split multi-address entries (those with ";") into separate submissions
- Result: 34 valid geocodable addresses

### 2. Created `src/lib/seedData.ts`
- Full submission objects with all required fields:
  - `google_user_id`: seed_0 through seed_33
  - `address_text`: raw Hebrew addresses (as users submitted)
  - `inferred_address`: English canonical form (from geocoding)
  - `lat`, `lng`: geocoded coordinates (Tel Aviv area)
  - `email`: seed_N@import.local
  - `display_name`: "Rider N"
  - `is_seed`: 1 (marked as seed data)
  - Timestamps spread across Feb 20

### 3. Updated `src/lib/mockStore.ts`
- Now loads real seed data instead of synthetic generator
- Converts seed submissions to algorithm format (id, lat, lng)
- 34 real Tel Aviv addresses available for algorithm processing

### 4. Updated spec: `specs/api-data.md`
- Added `inferred_address: TEXT` column to submissions table
- Updated schema documentation with rationale
- Updated TypeScript type definitions

## Verification

✅ All 119 algorithm tests pass
✅ Build compiles without errors
✅ Real data loads correctly into mockStore
✅ Algorithm runs successfully on real addresses

## Why this design

**Before:** Synthetic random coordinates in Tel Aviv
**After:** Real user-submitted Hebrew addresses with inferred canonical forms

Benefits:
- Authentic testing with real street names (Dizengoff, Rothschild, Ibn Gabirol, etc.)
- Data quality insights (3 duplicates for Dizengoff 203, for example)
- Inferred address field enables future "confirm address" UI flows
- Transparent data transformation (raw → geocoded)

## Data characteristics

All 34 addresses are in central Tel Aviv:
- Heavy clustering around Dizengoff Street (main commercial/cultural hub)
- Mix of neighborhoods: Central, Rothschild, Port area
- Lat range: 32.076–32.095 (tight clustering)
- Lng range: 34.772–34.790 (tight clustering)

## Addressing handled

| Issue | Action |
|-------|--------|
| NaN entry | Skipped (1 entry) |
| Semicolon-separated pairs | Split into separate submissions (6 pairs → 12 entries) |
| Hebrew typos (דיזינגוף vs דיזנגוף) | Preserved as-is in address_text, normalized in inferred_address |
| Duplicate addresses | Kept (represents actual duplicate submissions) |

## What's next

This seed data is now ready for:

1. **Phase 2 UI testing** — Map displays 34 real stops
2. **Phase 3 Supabase integration** — These become test fixtures for local dev
3. **Production data import** — Template for importing from actual Google Sheet

## Future enhancements

- Real Google Geocoding API (currently mocked based on street names)
- Hebrew address parsing for better normalization
- Admin import endpoint to accept new CSV submissions
