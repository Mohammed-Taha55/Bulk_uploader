const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

/**
 * Global Express error handler.
 * Must be registered last (after all routes) with exactly 4 parameters.
 *
 * Error categories:
 *  1. ApiError (isOperational) — expected failures, return structured JSON
 *  2. Multer errors            — file size / field errors, map to 400
 *  3. SyntaxError              — bad JSON body, map to 400
 *  4. Everything else          — log details server-side, return generic 500
 */
function errorHandler(err, req, res, next) {          // eslint-disable-line no-unused-vars
  // ── Operational API errors ────────────────────────────────
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error:   err.message,
      ...err.data,
    });
  }

  // ── Multer-specific errors ─────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: `File too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 5} MB.`,
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected field name in multipart upload. Use field name "file".',
    });
  }

  // ── Malformed JSON body ────────────────────────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Malformed JSON request body.' });
  }

  // ── Supabase / PostgREST errors ─────────────────────────────────────────────
  // PostgREST codes: PGRST*, also catch table-not-found (PGRST205) specifically
  if (err.code && (err.code.startsWith('PGRST') || err.code === 'PGRST205')) {
    const isTableMissing = err.message?.includes('schema cache') || err.code === 'PGRST205';
    const msg = isTableMissing
      ? 'Database tables not found. Please run the SQL migration first (see backend/migrations/001_initial.sql).'
      : 'Database request failed. Please try again.';
    logger.error('PostgREST error:', err.code, err.message);
    return res.status(isTableMissing ? 503 : 502).json({ success: false, error: msg });
  }

  // ── Unexpected errors — log full stack, hide details ─────
  logger.error('Unhandled error:', err.stack || err.message || err);
  return res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again or contact support.',
  });
}

/**
 * 404 handler — catches any unmatched routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
