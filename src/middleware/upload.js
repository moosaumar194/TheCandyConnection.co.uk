/**
 * Image-upload middleware with automatic optimization.
 *
 * Accepts JPG/PNG/WEBP up to 5MB, resizes (longest side <= MAX_DIM) and
 * re-encodes to WebP via sharp. Stored in Vercel Blob when BLOB_READ_WRITE_TOKEN
 * is set (production), otherwise written to public/uploads/ on disk (local dev).
 * The uploader sets req.file.url to the resulting public URL / path.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { put, del } = require('@vercel/blob');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB upload cap
const MAX_DIM = 800; // longest edge after resize (px)
const WEBP_QUALITY = 80;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Resize + convert a raw image buffer to an optimized WebP buffer. */
function optimizeToWebpBuffer(buffer) {
  return sharp(buffer)
    .rotate() // honour EXIF orientation before stripping metadata
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** Optimize + store an image; returns its public URL (Blob) or web path (disk). */
async function storeImage(buffer, subfolder) {
  const webp = await optimizeToWebpBuffer(buffer);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;

  if (useBlob()) {
    const blob = await put(`${subfolder}/${filename}`, webp, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const destDir = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, filename), webp);
  return `/uploads/${subfolder}/${filename}`;
}

function makeUploader(subfolder) {
  const multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.has(file.mimetype)) return cb(null, true);
      cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    },
  });

  return {
    /** Middleware: parse one file field, optimize + store it, set req.file.url. */
    single(field) {
      const parse = multerInstance.single(field);
      return (req, res, next) => {
        parse(req, res, (err) => {
          if (err) return next(err);
          if (!req.file) return next(); // no file supplied — nothing to store
          storeImage(req.file.buffer, subfolder)
            .then((url) => {
              req.file.url = url;
              next();
            })
            .catch(() => next(new Error('Could not process the uploaded image.')));
        });
      };
    },
  };
}

/** Delete a stored image by its URL/path (Vercel Blob URL or local /uploads path). */
async function deleteImage(url) {
  if (!url) return;
  if (/^https?:\/\//i.test(url)) {
    if (useBlob()) {
      try {
        await del(url);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (url.startsWith('/uploads/')) {
    const abs = path.join(__dirname, '..', '..', 'public', url);
    fs.promises.unlink(abs).catch(() => {});
  }
}

module.exports = {
  makeUploader,
  storeImage,
  optimizeToWebpBuffer,
  deleteImage,
  MAX_SIZE,
  MAX_DIM,
  WEBP_QUALITY,
};
