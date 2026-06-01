/**
 * senderService.js — Supabase operations for the senders table.
 *
 * Upsert strategy:
 *  - Emails are stored lowercase; UNIQUE constraint on `email`
 *  - onConflict: 'email' → existing records are updated (upsert)
 *  - Rows are pre-checked to accurately report insert vs. update counts
 *  - Chunk size = DB_CHUNK_SIZE (500) to stay within Supabase request limits
 *
 * Fallback:
 *  - If a chunk upsert fails (e.g. intermittent network), we fall back to
 *    row-by-row upserts and collect individual errors — partial success preferred
 */

const supabase = require('../config/supabase');
const { chunkArray } = require('../utils/chunker');
const { DB_CHUNK_SIZE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const logger   = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitize DB error messages before returning to the client.
 * Never expose raw Postgres error strings.
 */
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a batch of validated sender rows.
 *
 * @param {object[]} rows  Already-validated rows (email lowercase)
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

    // ── Pre-check: which emails already exist? ──────────────────────────────
    const { data: existing, error: selectErr } = await supabase
      .from('senders')
      .select('email')
      .in('email', emails);

    if (selectErr) {
      logger.error('senderService.bulkUpsert pre-check failed:', selectErr.message);
      // Cannot determine insert/update split for this chunk — add all as DB errors
      for (const row of chunk) {
        dbErrors.push({ email: row.email, reason: `Pre-check failed: ${sanitizeDbError(selectErr.message)}` });
      }
      continue;
    }

    const existingSet = new Set((existing || []).map(r => r.email));

    // ── Upsert chunk ────────────────────────────────────────────────────────
    const { error: upsertErr } = await supabase
      .from('senders')
      .upsert(chunk, { onConflict: 'email', ignoreDuplicates: false });

    if (!upsertErr) {
      // Success — tally from our pre-check
      for (const row of chunk) {
        existingSet.has(row.email) ? totalUpdated++ : totalInserted++;
      }
      continue;
    }

    // ── Chunk failed → row-by-row fallback ─────────────────────────────────
    logger.warn(`senderService: chunk upsert failed (${upsertErr.message}), falling back to row-by-row`);

    for (const row of chunk) {
      const { error: rowErr } = await supabase
        .from('senders')
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
 * List senders with pagination and optional status filter.
 *
 * @param {{ page?, limit?, status? }} opts
 * @returns {{ data: object[], total: number }}
 */
async function list({ page = 1, limit = DEFAULT_PAGE_SIZE, status } = {}) {
  const safePage  = Math.max(1, Math.floor(Number(page)) || 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(limit)) || DEFAULT_PAGE_SIZE));
  const offset    = (safePage - 1) * safeLimit;

  let query = supabase
    .from('senders')
    .select('id, name, email, reply_to, status, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (status && ['active', 'inactive'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data || [], total: count ?? 0 };
}

/**
 * Soft-delete a sender (sets status → 'inactive').
 * Hard deletes are intentionally not exposed in the POC.
 *
 * @param {string} id  UUID
 * @returns {object}  Updated sender record
 */
async function softDelete(id) {
  const { data, error } = await supabase
    .from('senders')
    .update({ status: 'inactive' })
    .eq('id', id)
    .select('id, name, email, status, updated_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Sender not found');
    throw error;
  }
  if (!data) throw new Error('Sender not found');

  return data;
}

module.exports = { bulkUpsert, list, softDelete };
