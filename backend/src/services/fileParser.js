/**
 * fileParser.js — Core file parsing pipeline.
 *
 * Supports: .csv, .xls, .xlsx  (all via SheetJS/xlsx)
 *
 * Pipeline:
 *  1. Validate file metadata (extension, size, buffer presence)
 *  2. Parse buffer → workbook (xlsx)
 *  3. Extract first sheet → array of raw row objects
 *  4. Map raw column headers → normalized field names (columnMapper)
 *  5. Validate each row (validators)
 *  6. Deduplicate emails within the same file batch
 *  7. Return { rows: validRows[], parseErrors: errorItems[] }
 *
 * Error philosophy:
 *  - File-level errors throw ApiError immediately (unrecoverable)
 *  - Row-level errors are collected and returned alongside valid rows
 *    so a partially-good file still imports as much data as possible
 */

const path    = require('path');
const XLSX    = require('xlsx');
const ApiError = require('../utils/ApiError');
const { mapColumns } = require('../utils/columnMapper');
const { validateSenderRow, validateRecipientRow } = require('../utils/validators');
const { ACCEPTED_EXTENSIONS, MAX_UPLOAD_ROWS } = require('../config/constants');
const logger  = require('../utils/logger');

/**
 * Parse an uploaded file buffer into validated rows.
 *
 * @param {Express.Multer.File} file  multer file object (memoryStorage)
 * @param {'senders'|'recipients'} type
 * @returns {{ rows: object[], parseErrors: object[] }}
 * @throws {ApiError} on unrecoverable file-level errors
 */
function parse(file, type) {
  // ── 1. File-level guards ────────────────────────────────────────────────────
  if (!file) {
    throw new ApiError(400, 'No file provided.');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new ApiError(
      400,
      `Unsupported file type "${ext || '(none)'}". Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`
    );
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new ApiError(400, 'The uploaded file is empty (0 bytes).');
  }

  // ── 2. Parse workbook ───────────────────────────────────────────────────────
  let workbook;
  try {
    workbook = XLSX.read(file.buffer, {
      type:      'buffer',
      cellDates: false,    // keep dates as strings for uniform handling
      cellNF:    false,
      cellText:  false,
      raw:       false,    // format numbers to strings (avoids 1.0 vs 1 issues)
    });
  } catch (err) {
    logger.error('XLSX.read error:', err.message);
    throw new ApiError(
      400,
      'Could not parse the file. It may be corrupted, password-protected, or in an unsupported format.'
    );
  }

  // ── 3. Sheet selection ──────────────────────────────────────────────────────
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new ApiError(400, 'The file contains no sheets.');
  }

  if (workbook.SheetNames.length > 1) {
    logger.warn(
      `File "${file.originalname}" has ${workbook.SheetNames.length} sheets. ` +
      `Using first sheet: "${workbook.SheetNames[0]}"`
    );
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // ── 4. Convert sheet to row objects ─────────────────────────────────────────
  let rawRows;
  try {
    rawRows = XLSX.utils.sheet_to_json(sheet, {
      defval:    '',        // empty cells → empty string (not undefined)
      raw:       false,
      blankrows: false,     // skip fully blank rows
    });
  } catch (err) {
    throw new ApiError(400, `Could not read sheet data: ${err.message}`);
  }

  if (!rawRows || rawRows.length === 0) {
    throw new ApiError(
      400,
      'The file has no data rows. Ensure the first row contains column headers ' +
      'and at least one data row follows.'
    );
  }

  if (rawRows.length > MAX_UPLOAD_ROWS) {
    throw new ApiError(
      400,
      `File contains ${rawRows.length.toLocaleString()} rows, which exceeds the ` +
      `limit of ${MAX_UPLOAD_ROWS.toLocaleString()} rows per upload. ` +
      `Please split it into smaller files.`
    );
  }

  // ── 5. Map column headers ───────────────────────────────────────────────────
  const { mappedRows, unmappedHeaders } = mapColumns(rawRows, type);

  if (unmappedHeaders.length > 0) {
    logger.info(
      `[${type}] Unmapped headers: [${unmappedHeaders.join(', ')}]` +
      (type === 'recipients' ? ' — stored in metadata' : ' — ignored')
    );
  }

  // ── 6. Validate rows & deduplicate ──────────────────────────────────────────
  const validRows   = [];
  const parseErrors = [];
  const seenEmails  = new Set();

  const validateFn = type === 'senders' ? validateSenderRow : validateRecipientRow;

  mappedRows.forEach((row, index) => {
    const rowNumber = index + 2; // row 1 = headers, data starts at 2

    const result = validateFn(row, rowNumber);

    if (!result.valid) {
      parseErrors.push({
        row:    rowNumber,
        email:  String(row.email || '').trim().toLowerCase() || null,
        reason: result.error,
      });
      return;
    }

    // Intra-file duplicate check (after normalization to lowercase)
    if (seenEmails.has(result.data.email)) {
      parseErrors.push({
        row:    rowNumber,
        email:  result.data.email,
        reason: 'Duplicate email within this file — first occurrence was kept',
      });
      return;
    }

    seenEmails.add(result.data.email);
    validRows.push(result.data);
  });

  logger.info(
    `[${type}] Parsed "${file.originalname}": ` +
    `${validRows.length} valid, ${parseErrors.length} invalid out of ${rawRows.length} rows`
  );

  return { rows: validRows, parseErrors };
}

module.exports = { parse };
