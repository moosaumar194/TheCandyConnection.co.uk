/**
 * Image-upload middleware with automatic optimization.
 *
 * Accepts JPG/PNG/WEBP up to 5MB, then resizes (longest side <= MAX_DIM) and
 * re-encodes to WebP via sharp before writing to public/uploads/<subfolder>/.
 * This keeps stored images small and in a modern format regardless of what the
 * admin uploads. Public API is unchanged: makeUploader(sub).single('image').
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB upload cap
const MAX_DIM = 800; // longest edge after resize (px)
const WEBP_QUALITY = 80;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Resize + convert a raw image buffer to a WebP file; returns the filename. */
async function writeOptimized(buffer, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
  await sharp(buffer)
    .rotate() // honour EXIF orientation before stripping metadata
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(path.join(destDir, filename));
  return filename;
}

function makeUploader(subfolder) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(dest, { recursive: true });

  const multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.has(file.mimetype)) return cb(null, true);
      cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    },
  });

  return {
    /** Returns middleware: parses one file field then optimizes it to WebP on disk. */
    single(field) {
      const parse = multerInstance.single(field);
      return (req, res, next) => {
        parse(req, res, (err) => {
          if (err) return next(err);
          if (!req.file) return next(); // no file supplied — nothing to process
          writeOptimized(req.file.buffer, dest)
            .then((filename) => {
              // Expose the final on-disk name so routes can build the web path.
              req.file.filename = filename;
              req.file.path = path.join(dest, filename);
              next();
            })
            .catch(() => next(new Error('Could not process the uploaded image.')));
        });
      };
    },
  };
}

/** Web path (as served) for an uploaded file, or null. */
function webPath(subfolder, filename) {
  if (!filename) return null;
  return `/uploads/${subfolder}/${filename}`;
}

/** Best-effort delete of a previously-uploaded file given its web path. */
function deleteByWebPath(webpath) {
  if (!webpath || !webpath.startsWith('/uploads/')) return;
  const abs = path.join(__dirname, '..', '..', 'public', webpath);
  fs.promises.unlink(abs).catch(() => {});
}

module.exports = { makeUploader, webPath, deleteByWebPath, writeOptimized, MAX_SIZE, MAX_DIM, WEBP_QUALITY };
