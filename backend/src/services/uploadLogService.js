/**
 * uploadLogService.js — Supabase operations for the upload_logs table.
 *
 * Every file upload (success or partial failure) creates a log entry.
 * These logs give a full audit trail for debugging bad imports.
 */

const supabase = require('../config/supabase');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

const VALID_TYPES = ['senders', 'recipients'];

/**
 * Create a new upload log entry.
 *
 * @param {object} params
 * @returns {object} Created log row
 */
async function create({ upload_type, filename, total_rows, inserted, updated, skipped, error_count, errors }) {
  if (!VALID_TYPES.includes(upload_type)) {
    throw new Error(`Invalid upload_type: "${upload_type}"`);
  }

  const { data, error } = await supabase
    .from('upload_logs')
    .insert({
      upload_type,
      filename:    String(filename || 'unknown').slice(0, 255),
      total_rows:  Number(total_rows)  || 0,
      inserted:    Number(inserted)    || 0,
      updated:     Number(updated)     || 0,
      skipped:     Number(skipped)     || 0,
      error_count: Number(error_count) || 0,
      errors:      Array.isArray(errors) ? errors : [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * List upload logs, ordered newest-first.
 * Does NOT include the full errors JSONB array (only summary fields) to keep list fast.
 *
 * @param {{ page?, limit?, upload_type? }} opts
 * @returns {{ data: object[], total: number }}
 */
async function list({ page = 1, limit = DEFAULT_PAGE_SIZE, upload_type } = {}) {
  const safePage  = Math.max(1, Math.floor(Number(page)) || 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(limit)) || DEFAULT_PAGE_SIZE));
  const offset    = (safePage - 1) * safeLimit;

  let query = supabase
    .from('upload_logs')
    .select(
      'id, upload_type, filename, total_rows, inserted, updated, skipped, error_count, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (upload_type && VALID_TYPES.includes(upload_type)) {
    query = query.eq('upload_type', upload_type);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data || [], total: count ?? 0 };
}

/**
 * Get a single upload log by ID, including full error details.
 *
 * @param {string} id  UUID
 * @returns {object|null}
 */
async function getById(id) {
  const { data, error } = await supabase
    .from('upload_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

module.exports = { create, list, getById };
