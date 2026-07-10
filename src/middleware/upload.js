/**
 * Image-upload middleware.
 *
 * Accepts JPG/PNG/WEBP up to 5MB and stores the file AS-IS (no processing) —
 * to Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production), otherwise to
 * public/uploads/ on disk (local dev). The uploader sets req.file.url to the
 * resulting public URL / path.
 *
 * Note: image optimization was intentionally removed — `sharp`'s native binary
 * fails to load in Vercel's serverless runtime, which broke uploads.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { put, del } = require('@vercel/blob');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB upload cap
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/** Store an uploaded image as-is; returns its public URL (Blob) or web path (disk). */
async function storeImage(buffer, subfolder, mimetype) {
  const ext = EXT_BY_MIME[mimetype] || '.img';
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  if (useBlob()) {
    const blob = await put(`${subfolder}/${filename}`, buffer, {
      access: 'public',
      contentType: mimetype,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const destDir = path.join(UPLOAD_ROOT, subfolder);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, filename), buffer);
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
    /** Middleware: parse one file field, store the original buffer, set req.file.url. */
    single(field) {
      const parse = multerInstance.single(field);
      return (req, res, next) => {
        parse(req, res, (err) => {
          if (err) return next(err);
          if (!req.file) return next(); // no file supplied — nothing to store
          storeImage(req.file.buffer, subfolder, req.file.mimetype)
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

module.exports = { makeUploader, storeImage, deleteImage, MAX_SIZE };
