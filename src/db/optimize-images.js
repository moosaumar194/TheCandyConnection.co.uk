/**
 * One-time image optimizer for images already stored in the catalog.
 *
 *   npm run optimize
 *
 * Walks products + categories, and for every uploaded raster image under
 * public/uploads/ that isn't already an in-spec WebP, re-encodes it (resize +
 * WebP), updates the DB row, then deletes the original. Safe to re-run
 * (already-optimized images are skipped) and safe to run while the server is up.
 * SVGs (sample images / placeholder) live outside /uploads and are left alone.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const { all, run: dbRun } = require('./database');

// Local-only maintenance utility (uses the `sharp` devDependency). Never runs on
// Vercel — the upload pipeline no longer optimizes images.
const MAX_DIM = 800;
const WEBP_QUALITY = 80;

const PUBLIC = path.join(__dirname, '..', '..', 'public');

/**
 * Produce an optimized WebP next to the source (without deleting the source or
 * touching the DB). Returns { newWebPath, absOld, absNew, oldBytes, newBytes }
 * or null when nothing needs doing.
 */
async function planOptimize(webpath) {
  if (!webpath || !webpath.startsWith('/uploads/')) return null; // skip SVG samples / external
  const absOld = path.join(PUBLIC, webpath);
  if (!fs.existsSync(absOld)) return null;

  let meta;
  try {
    meta = await sharp(absOld).metadata();
  } catch {
    return null; // not a raster sharp can decode (e.g. an SVG) — leave it
  }

  const alreadyOptimized =
    meta.format === 'webp' && (meta.width || 0) <= MAX_DIM && (meta.height || 0) <= MAX_DIM;
  if (alreadyOptimized) return null;

  const dir = path.dirname(absOld);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
  const absNew = path.join(dir, filename);

  await sharp(absOld)
    .rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(absNew);

  return {
    newWebPath: path.posix.join(path.posix.dirname(webpath), filename),
    absOld,
    absNew,
    oldBytes: fs.statSync(absOld).size,
    newBytes: fs.statSync(absNew).size,
  };
}

async function run() {
  let count = 0;
  let totalOld = 0;
  let totalNew = 0;

  for (const table of ['products', 'categories']) {
    const rows = await all(
      `SELECT id, image_path FROM ${table} WHERE image_path IS NOT NULL AND image_path != ''`
    );

    for (const row of rows) {
      const plan = await planOptimize(row.image_path);
      if (!plan) continue;

      // Point the DB at the new file BEFORE deleting the old one.
      await dbRun(`UPDATE ${table} SET image_path = $1 WHERE id = $2`, [plan.newWebPath, row.id]);
      if (plan.absOld !== plan.absNew) {
        try { fs.unlinkSync(plan.absOld); } catch { /* ignore */ }
      }

      count += 1;
      totalOld += plan.oldBytes;
      totalNew += plan.newBytes;
      console.log(
        `  ${table}#${row.id}: ${(plan.oldBytes / 1024).toFixed(0)}KB -> ${(plan.newBytes / 1024).toFixed(0)}KB` +
          `  (${row.image_path} -> ${plan.newWebPath})`
      );
    }
  }

  if (count === 0) {
    console.log('✓ All images already optimized — nothing to do.');
  } else {
    const saved = (totalOld - totalNew) / 1024;
    console.log(
      `\n🍬 Optimized ${count} image(s): ${(totalOld / 1024).toFixed(0)}KB -> ${(totalNew / 1024).toFixed(0)}KB ` +
        `(saved ${saved.toFixed(0)}KB / ${((saved / (totalOld / 1024)) * 100).toFixed(0)}%)`
    );
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Image optimization failed:', e);
    process.exit(1);
  });
