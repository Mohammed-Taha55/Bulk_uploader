const multer  = require('multer');
const path    = require('path');
const ApiError = require('../utils/ApiError');
const { MAX_FILE_SIZE_BYTES, ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES } = require('../config/constants');

/**
 * Multer configuration:
 *  - memoryStorage: no temp files on disk, buffer passed directly to parser
 *  - fileFilter:    rejects by extension AND MIME type
 *  - limits:        enforced at the HTTP layer before any parsing
 */
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();

  // Extension check (primary guard)
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return cb(
      new ApiError(
        400,
        `Unsupported file type "${ext || '(none)'}". ` +
        `Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`
      )
    );
  }

  // MIME type check (secondary guard — not always reliable, but good to have)
  if (!ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    // Some valid files (especially CSV) get weird MIME types from different OS/browsers.
    // Allow if extension passed — just log the mismatch.
    if (ext === '.csv') {
      // CSV commonly sent as text/plain or application/octet-stream — let it through
      return cb(null, true);
    }
    return cb(
      new ApiError(
        400,
        `Unexpected MIME type "${file.mimetype}" for extension "${ext}". ` +
        `If you believe this is correct, try saving your file again.`
      )
    );
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,               // one file per request
    fields: 5,              // few extra form fields allowed
  },
});

/**
 * Ready-to-use middleware that expects a single file in the "file" field.
 * Propagates multer errors to the global error handler via next().
 */
function uploadSingle(req, res, next) {
  const handler = upload.single('file');
  handler(req, res, (err) => {
    if (err) return next(err); // multer errors go to global handler
    next();
  });
}

module.exports = { uploadSingle };
