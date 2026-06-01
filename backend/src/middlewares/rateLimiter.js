const rateLimit = require('express-rate-limit');
const { UPLOAD_RATE_LIMIT_PER_MIN } = require('../config/constants');

/**
 * Lightweight global rate limiter for all /api routes.
 * Prevents basic flooding — tune for production.
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,              // generous cap for general API use
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again in a minute.',
  },
});

/**
 * Stricter rate limiter for file upload endpoints.
 * Prevents abuse of the expensive parse + DB write path.
 */
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: UPLOAD_RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Upload limit reached. You can upload at most ${UPLOAD_RATE_LIMIT_PER_MIN} files per minute.`,
  },
});

module.exports = { globalRateLimiter, uploadRateLimiter };
