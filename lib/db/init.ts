/**
 * Database initialization module
 * Creates and initializes the SQLite database
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: SqlJsDatabase | null = null;
let SQL: any = null;

// Path to the SQLite database file
const getDbPath = (): string => {
  const env = process.env.DATABASE_PATH;
  if (env) return env;

  // Default: .data/app.db relative to project root
  const projectRoot = process.cwd();
  return path.join(projectRoot, '.data', 'app.db');
};

/**
 * Initialize the SQLite database
 * Loads existing database or creates a new one
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  // Initialize sql.js
  if (!SQL) {
    SQL = await initSqlJs();
  }

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  // Create .data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema initialization
  await initSchema(db);

  return db;
}

/**
 * Initialize database schema from schema.sql
 */
async function initSchema(database: SqlJsDatabase): Promise<void> {
  // Read schema file
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = schema
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

  for (const statement of statements) {
    try {
      database.run(statement);
    } catch (error) {
      // Ignore "table already exists" errors
      if (
        error instanceof Error &&
        !error.message.includes('already exists')
      ) {
        console.error('Schema execution error:', error);
        throw error;
      }
    }
  }
}

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<SqlJsDatabase> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Save database to disk
 */
export async function saveDatabase(): Promise<void> {
  if (!db) return;

  const data = db.export();
  const buffer = Buffer.from(data);
  const dbPath = getDbPath();

  fs.writeFileSync(dbPath, buffer);
}

/**
 * Close database and save to disk
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await saveDatabase();
    db.close();
    db = null;
  }
}

/**
 * Clear all data from tables (for testing)
 */
export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  database.run('DELETE FROM submissions');
  database.run('DELETE FROM computed_routes');
  database.run('DELETE FROM metadata');
  await saveDatabase();
}

/**
 * Reset database (drop all tables and reinitialize)
 */
export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();

  try {
    database.run('DROP TABLE IF EXISTS submissions');
    database.run('DROP TABLE IF EXISTS computed_routes');
    database.run('DROP TABLE IF EXISTS metadata');
  } catch (error) {
    console.error('Error dropping tables:', error);
  }

  await initSchema(database);
  await saveDatabase();
}
