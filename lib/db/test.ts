/**
 * Database test/demo script
 * Run with: npx ts-node lib/db/test.ts
 */

import {
  initDatabase,
  closeDatabase,
  clearDatabase,
  resetDatabase,
  saveDatabase,
  getDatabase,
} from './init';
import {
  insertSubmission,
  getSubmissionByUserId,
  getSubmissionLocations,
  insertRoute,
  getLatestRoute,
  getSubmissionCount,
} from './queries';
import { Stop } from './types';

async function main() {
  console.log('🚀 Starting database test...\n');

  try {
    // Initialize
    console.log('1️⃣  Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized\n');

    // Clear previous test data
    console.log('2️⃣  Clearing previous test data...');
    await clearDatabase();
    console.log('✅ Cleared\n');

    // Insert test submission
    console.log('3️⃣  Inserting test submission...');
    const testSubmission = await insertSubmission({
      google_user_id: 'test_user_123',
      email: 'test@example.com',
      display_name: 'Test User',
      address_text: 'Dizengoff 50, Tel Aviv-Yafo, Israel',
      lat: 32.0775,
      lng: 34.7748,
      is_seed: 0,
    });
    console.log('✅ Submission inserted:', testSubmission.id);
    console.log(`   - User: ${testSubmission.display_name}`);
    console.log(`   - Address: ${testSubmission.address_text}`);
    console.log(`   - Coordinates: ${testSubmission.lat}, ${testSubmission.lng}\n`);

    // Insert another submission
    console.log('4️⃣  Inserting second submission...');
    await insertSubmission({
      google_user_id: 'test_user_456',
      email: 'test2@example.com',
      display_name: 'Another User',
      address_text: 'Rothschild 50, Tel Aviv-Yafo, Israel',
      lat: 32.0731,
      lng: 34.7925,
      is_seed: 0,
    });
    console.log('✅ Second submission inserted\n');

    // Retrieve submission
    console.log('5️⃣  Retrieving submission by user ID...');
    const retrieved = await getSubmissionByUserId('test_user_123');
    console.log('✅ Retrieved:', retrieved?.display_name);
    console.log(`   - Email: ${retrieved?.email}\n`);

    // Get submission count
    console.log('6️⃣  Counting submissions...');
    const count = await getSubmissionCount();
    console.log(`✅ Total submissions: ${count}\n`);

    // Get locations for heatmap
    console.log('7️⃣  Fetching all submission locations...');
    const locations = await getSubmissionLocations();
    console.log(`✅ Got ${locations.length} locations`);
    locations.forEach((loc, i) => {
      console.log(`   - ${i + 1}. (${loc.lat}, ${loc.lng})`);
    });
    console.log();

    // Insert test route
    console.log('8️⃣  Inserting computed route...');
    const stops: Stop[] = [
      {
        lat: 32.0853,
        lng: 34.7818,
        label: 'Dizengoff Center',
        rider_count: 12,
      },
      {
        lat: 32.0731,
        lng: 34.7925,
        label: 'Rothschild / Allenby',
        rider_count: 8,
      },
    ];

    const route = await insertRoute({
      stops,
      polyline: 'encoded_polyline_string',
      avg_walk_distance_m: 287.5,
      coverage_400m_pct: 82.3,
      p90_walk_distance_m: 550.0,
      num_stops: 2,
      total_submissions: count,
      k_value: 2,
    });
    console.log('✅ Route inserted:', route.id);
    console.log(`   - Stops: ${route.num_stops}`);
    console.log(`   - Avg walk distance: ${route.avg_walk_distance_m}m`);
    console.log(`   - Coverage (400m): ${route.coverage_400m_pct}%\n`);

    // Retrieve latest route
    console.log('9️⃣  Retrieving latest route...');
    const latest = await getLatestRoute();
    if (latest) {
      console.log('✅ Latest route retrieved');
      console.log(`   - Stops: ${latest.stops.length}`);
      latest.stops.forEach((stop, i) => {
        console.log(
          `     ${i + 1}. ${stop.label} (${stop.lat}, ${stop.lng}) - ${stop.rider_count} riders`
        );
      });
    }
    console.log();

    // Verify schema
    console.log('🔟 Verifying database schema...');
    const db = await getDatabase();

    const tableQuery = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    );
    const tables: string[] = [];
    while (tableQuery.step()) {
      const row = tableQuery.getAsObject() as { name: string };
      tables.push(row.name);
    }
    tableQuery.free();

    console.log('✅ Tables in database:');
    tables.forEach((t) => {
      console.log(`   - ${t}`);
    });
    console.log();

    console.log('✨ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    console.log('Closing database...');
    await closeDatabase();
    console.log('✅ Database closed\n');
  }
}

main();
