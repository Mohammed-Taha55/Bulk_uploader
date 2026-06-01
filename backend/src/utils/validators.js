/**
 * Row-level validators for senders and recipients.
 *
 * Design decisions:
 *  - Each validator returns { valid: false, error: string } OR { valid: true, data: object }
 *  - Emails are normalized to lowercase before returning
 *  - HTML/script tags are stripped from text fields
 *  - All limits come from constants so they're tunable without touching logic
 */

const {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_ROW,
  MAX_METADATA_KEYS,
  MAX_METADATA_VALUE_LENGTH,
} = require('../config/constants');

// Practical email regex — catches 99%+ of invalid addresses without being overly pedantic
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip HTML/script tags and decode basic HTML entities.
 * Also trims surrounding whitespace.
 */
function stripHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')          // remove tags
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .trim();
}

/**
 * Returns true if email is syntactically valid.
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const t = email.trim();
  return t.length >= 3 && t.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(t);
}

/**
 * Parse a raw tags value (string or array) into a clean string[].
 * Splits on commas, semicolons, or pipes; trims each; enforces limits.
 */
function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(t => String(t).trim())
      .filter(t => t.length > 0 && t.length <= MAX_TAG_LENGTH)
      .slice(0, MAX_TAGS_PER_ROW);
  }
  return String(raw)
    .split(/[,;|]/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length <= MAX_TAG_LENGTH)
    .slice(0, MAX_TAGS_PER_ROW);
}

/**
 * Sanitize the extra-fields metadata object (from unknown CSV columns).
 * Limits keys and value lengths to avoid payload bloat.
 */
function sanitizeMetadata(extra) {
  if (!extra || typeof extra !== 'object') return {};
  const out = {};
  const keys = Object.keys(extra).slice(0, MAX_METADATA_KEYS);
  for (const k of keys) {
    const val = String(extra[k] ?? '').slice(0, MAX_METADATA_VALUE_LENGTH).trim();
    if (val !== '') out[k] = val;
  }
  return out;
}

// ─── Sender Validator ────────────────────────────────────────────────────────

/**
 * @param {object} row        Mapped row object (keys: email, name, reply_to)
 * @param {number} rowNumber  1-based row number (for error messages)
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
function validateSenderRow(row, rowNumber) {
  // ── email (required) ───────────────────────────────────────
  const rawEmail = String(row.email || '').trim();
  if (!rawEmail) {
    return { valid: false, error: 'Missing required field: email' };
  }
  if (!isValidEmail(rawEmail)) {
    return { valid: false, error: `Invalid email format: "${rawEmail}"` };
  }

  // ── name (required) ────────────────────────────────────────
  const rawName = stripHtml(String(row.name || ''));
  if (!rawName) {
    return { valid: false, error: 'Missing required field: name' };
  }
  if (rawName.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name exceeds max length of ${MAX_NAME_LENGTH} characters (got ${rawName.length})`,
    };
  }

  // ── reply_to (optional) ────────────────────────────────────
  let replyTo = null;
  const rawReplyTo = String(row.reply_to || '').trim();
  if (rawReplyTo) {
    if (!isValidEmail(rawReplyTo)) {
      return { valid: false, error: `Invalid reply_to email: "${rawReplyTo}"` };
    }
    replyTo = rawReplyTo.toLowerCase();
  }

  return {
    valid: true,
    data: {
      name:     rawName,
      email:    rawEmail.toLowerCase(),
      reply_to: replyTo,
    },
  };
}

// ─── Recipient Validator ─────────────────────────────────────────────────────

/**
 * @param {object} row        Mapped row object (keys: email, name, tags, _extra)
 * @param {number} rowNumber
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
function validateRecipientRow(row, rowNumber) {
  // ── email (required) ───────────────────────────────────────
  const rawEmail = String(row.email || '').trim();
  if (!rawEmail) {
    return { valid: false, error: 'Missing required field: email' };
  }
  if (!isValidEmail(rawEmail)) {
    return { valid: false, error: `Invalid email format: "${rawEmail}"` };
  }

  // ── name (optional) ────────────────────────────────────────
  let name = null;
  if (row.name) {
    const cleaned = stripHtml(String(row.name));
    if (cleaned.length > MAX_NAME_LENGTH) {
      return {
        valid: false,
        error: `Name exceeds max length of ${MAX_NAME_LENGTH} characters (got ${cleaned.length})`,
      };
    }
    name = cleaned || null;
  }

  // ── tags (optional) ────────────────────────────────────────
  const tags = parseTags(row.tags);

  // ── metadata from unknown CSV columns (optional) ───────────
  const metadata = sanitizeMetadata(row._extra);

  return {
    valid: true,
    data: {
      email:    rawEmail.toLowerCase(),
      name,
      tags,
      metadata,
    },
  };
}

module.exports = { validateSenderRow, validateRecipientRow, isValidEmail };
