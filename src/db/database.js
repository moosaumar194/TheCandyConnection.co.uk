/**
 * SQLite connection (better-sqlite3).
 *
 * Opens (creating if needed) the database at data/candy.db, applies the schema
 * from schema.sql, and exports a single shared connection used by every model.
 * Synchronous API — no callbacks/promises needed anywhere in the app.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'candy.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure the data directory exists before opening the file.
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000'); // wait (not throw) if another process holds a write lock

// Apply schema (all statements are CREATE TABLE IF NOT EXISTS — safe to re-run).
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

module.exports = db;
module.exports.DB_PATH = DB_PATH;
