/**
 * PostgreSQL connection (node-postgres) + async query helpers.
 *
 * A single module-scope pool is reused across warm serverless invocations.
 * Connection comes from POSTGRES_URL (Vercel Postgres / Neon inject this) or
 * DATABASE_URL. Schema is applied by the seed/migrate scripts, never at runtime.
 */
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
if (!connectionString) {
  console.warn('⚠  POSTGRES_URL is not set — database calls will fail. See .env.example.');
}

// Local Postgres (localhost/127.0.0.1) needs no SSL; hosted Postgres (Vercel/Neon) does.
const isLocal = /localhost|127\.0\.0\.1|\[::1\]/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: connectionString && !isLocal ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 3),
});

/** Return all rows for a parameterized query ($1, $2, …). */
async function all(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

/** Return the first row (or undefined). */
async function get(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows[0];
}

/** Run a statement; returns the pg result ({ rows, rowCount }). Use RETURNING for rows. */
async function run(text, params = []) {
  return pool.query(text, params);
}

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/** Apply schema.sql (idempotent CREATE TABLE IF NOT EXISTS). Scripts only. */
async function applySchema() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  // No params → pg uses the simple-query protocol and runs all ;-separated statements.
  await pool.query(sql);
}

module.exports = { pool, all, get, run, applySchema };
