/**
 * Operational API error — thrown intentionally when input/state is invalid.
 * Distinguished from unexpected errors by `isOperational = true`.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status code to return
   * @param {string} message     Human-readable error message
   * @param {object} [data={}]   Extra fields merged into the error response body
   */
  constructor(statusCode, message, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true;

    // Preserve correct stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

module.exports = ApiError;
