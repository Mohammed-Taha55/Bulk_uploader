/**
 * Application-wide constants.
 * All configurable values sourced from environment variables with safe defaults.
 */

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 5;

module.exports = Object.freeze({
  // File upload
  MAX_FILE_SIZE_BYTES: MAX_FILE_SIZE_MB * 1024 * 1024,
  MAX_UPLOAD_ROWS: parseInt(process.env.MAX_UPLOAD_ROWS) || 10_000,
  ACCEPTED_EXTENSIONS: ['.csv', '.xls', '.xlsx'],
  ACCEPTED_MIME_TYPES: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',           // some systems send CSV as text/plain
    'application/octet-stream', // generic binary — extension check handles safety
  ],

  // Database
  DB_CHUNK_SIZE: 500,       // rows per Supabase upsert batch

  // Validation limits
  MAX_EMAIL_LENGTH: 254,
  MAX_NAME_LENGTH: 100,
  MAX_REPLY_TO_LENGTH: 254,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS_PER_ROW: 20,
  MAX_METADATA_KEYS: 10,
  MAX_METADATA_VALUE_LENGTH: 500,

  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,

  // Rate limiting
  UPLOAD_RATE_LIMIT_PER_MIN: parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MIN) || 10,
});
