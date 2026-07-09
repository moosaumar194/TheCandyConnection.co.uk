/**
 * One-time migration: local SQLite (data/candy.db) -> Postgres, and local
 * uploaded images (public/uploads/*) -> Vercel Blob.
 *
 *   # with a local .env providing POSTGRES_URL (+ BLOB_READ_WRITE_TOKEN)
 *   npm run migrate
 *
 * Clears the Postgres tables, then copies every row (preserving ids). For each
 * products/categories image under /uploads/, uploads the file to Vercel Blob and
 * rewrites image_path to the Blob URL. Re-runnable (it truncates first).
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { put } = require('@vercel/blob');
const { run, applySchema, pool } = require('./database');

const ROOT = path.join(__dirname, '..', '..');
const SQLITE_PATH = path.join(ROOT, 'data', 'candy.db');
const PUBLIC = path.join(ROOT, 'public');
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/** Upload a local /uploads image to Blob and return its URL; passthrough otherwise. */
async function migrateImage(webpath) {
  if (!webpath || !webpath.startsWith('/uploads/')) return webpath; // URL or static SVG
  const abs = path.join(PUBLIC, webpath);
  if (!fs.existsSync(abs) || !useBlob) return webpath; // missing file or no Blob token → keep as-is
  const ext = path.extname(abs).toLowerCase();
  const key = webpath.replace(/^\/uploads\//, ''); // e.g. products/xxx.webp
  const blob = await put(key, fs.readFileSync(abs), {
    access: 'public',
    contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
    addRandomSuffix: false,
  });
  return blob.url;
}

async function copyTable(src, table, columns, imageCol) {
  const rows = src.prepare(`SELECT * FROM ${table}`).all();
  for (const row of rows) {
    if (imageCol && row[imageCol]) row[imageCol] = await migrateImage(row[imageCol]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map((c) => (row[c] === undefined ? null : row[c]));
    await run(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
  }
  // Reset the id sequence so future inserts don't collide with copied ids.
  await run(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM ${table}), 1), 1))`,
    [table]
  );
  return rows.length;
}

async function main() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`No SQLite DB at ${SQLITE_PATH} — nothing to migrate.`);
    process.exit(1);
  }
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    console.error('POSTGRES_URL (or DATABASE_URL) is not set. See .env.example.');
    process.exit(1);
  }
  if (!useBlob) {
    console.warn('⚠  BLOB_READ_WRITE_TOKEN not set — images will keep local /uploads paths (dev only).');
  }

  const src = new Database(SQLITE_PATH, { readonly: true });
  await applySchema();

  console.log('⚠  Clearing Postgres tables before import…');
  await run(
    'TRUNCATE products, categories, reviews, site_settings, admin_users, inquiries RESTART IDENTITY CASCADE'
  );

  const counts = {};
  counts.categories = await copyTable(src, 'categories', ['id', 'name', 'image_path', 'sort_order'], 'image_path');
  counts.products = await copyTable(
    src,
    'products',
    ['id', 'name', 'category', 'description', 'price', 'packaging', 'image_path', 'is_visible', 'created_at'],
    'image_path'
  );
  counts.reviews = await copyTable(
    src,
    'reviews',
    ['id', 'customer_name', 'email', 'rating', 'review_text', 'status', 'is_verified', 'created_at'],
    null
  );
  counts.site_settings = await copyTable(src, 'site_settings', ['id', 'setting_key', 'setting_value'], null);
  counts.admin_users = await copyTable(
    src,
    'admin_users',
    ['id', 'username', 'password_hash', 'must_change_password'],
    null
  );
  counts.inquiries = await copyTable(
    src,
    'inquiries',
    ['id', 'name', 'email', 'phone', 'message', 'is_read', 'created_at'],
    null
  );

  src.close();
  await pool.end();
  console.log('🍬 Migration complete:', counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
