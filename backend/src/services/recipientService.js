/**
 * recipientService.js — Supabase operations for the recipients table.
 *
 * Same upsert strategy as senderService:
 *  - Pre-check existing emails → accurate insert/update counts
 *  - Chunk batching (DB_CHUNK_SIZE = 500)
 *  - Row-by-row fallback on chunk failure
 *  - Sanitized error messages
 */

const supabase = require('../config/supabase');
const { chunkArray } = require('../utils/chunker');
const { DB_CHUNK_SIZE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const logger   = require('../utils/logger');

const VALID_STATUSES = Object.freeze(['active', 'unsubscribed', 'bounced']);

function sanitizeDbError(message = '') {
  if (message.includes('unique') || message.includes('duplicate')) {
    return 'Email conflict during save (possible race condition)';
  }
  if (message.includes('check') || message.includes('constraint')) {
    return 'Value violates a database constraint (likely too long)';
  }
  if (message.includes('connection') || message.includes('timeout')) {
    return 'Database connection issue — please retry';
  }
  return 'Database error while saving record';
}

/**
 * Upsert a batch of validated recipient rows.
 *
 * @param {object[]} rows
 * @returns {{ inserted: number, updated: number, dbErrors: object[] }}
 */
async function bulkUpsert(rows) {
  if (!rows || rows.length === 0) {
    return { inserted: 0, updated: 0, dbErrors: [] };
  }

  let totalInserted = 0;
  let totalUpdated  = 0;
  const dbErrors    = [];

  for (const chunk of chunkArray(rows, DB_CHUNK_SIZE)) {
    const emails = chunk.map(r => r.email);

    // Pre-check existing
    const { data: existing, error: selectErr } = await supabase
      .from('recipients')
      .select('email')
      .in('email', emails);

    if (selectErr) {
      logger.error('recipientService.bulkUpsert pre-check failed:', selectErr.message);
      for (const row of chunk) {
        dbErrors.push({ email: row.email, reason: `Pre-check failed: ${sanitizeDbError(selectErr.message)}` });
      }
      continue;
    }

    const existingSet = new Set((existing || []).map(r => r.email));

    // Upsert chunk
    const { error: upsertErr } = await supabase
      .from('recipients')
      .upsert(chunk, { onConflict: 'email', ignoreDuplicates: false });

    if (!upsertErr) {
      for (const row of chunk) {
        existingSet.has(row.email) ? totalUpdated++ : totalInserted++;
      }
      continue;
    }

    // Row-by-row fallback
    logger.warn(`recipientService: chunk upsert failed (${upsertErr.message}), falling back to row-by-row`);

    for (const row of chunk) {
      const { error: rowErr } = await supabase
        .from('recipients')
        .upsert([row], { onConflict: 'email', ignoreDuplicates: false });

      if (rowErr) {
        dbErrors.push({ email: row.email, reason: sanitizeDbError(rowErr.message) });
      } else {
        existingSet.has(row.email) ? totalUpdated++ : totalInserted++;
      }
    }
  }

  return { inserted: totalInserted, updated: totalUpdated, dbErrors };
}

/**
 * List recipients with pagination, status filter, and tag filter.
 *
 * @param {{ page?, limit?, status?, tag? }} opts
 * @returns {{ data: object[], total: number }}
 */
async function list({ page = 1, limit = DEFAULT_PAGE_SIZE, status, tag } = {}) {
  const safePage  = Math.max(1, Math.floor(Number(page)) || 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(limit)) || DEFAULT_PAGE_SIZE));
  const offset    = (safePage - 1) * safeLimit;

  let query = supabase
    .from('recipients')
    .select('id, name, email, tags, status, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }

  if (tag && typeof tag === 'string' && tag.trim()) {
    // `cs` = contains (for array columns)
    query = query.contains('tags', [tag.trim()]);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data || [], total: count ?? 0 };
}

/**
 * Update a single recipient's status.
 *
 * @param {string} id
 * @param {'active'|'unsubscribed'|'bounced'} status
 * @returns {object} Updated recipient
 */
async function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from('recipients')
    .update({ status })
    .eq('id', id)
    .select('id, name, email, status, tags, updated_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const notFound = new Error('Recipient not found');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }
  if (!data) {
    const notFound = new Error('Recipient not found');
    notFound.statusCode = 404;
    throw notFound;
  }

  return data;
}

module.exports = { bulkUpsert, list, updateStatus };
