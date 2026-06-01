const fileParser      = require('../services/fileParser');
const senderService   = require('../services/senderService');
const uploadLogService = require('../services/uploadLogService');
const ApiError        = require('../utils/ApiError');
const logger          = require('../utils/logger');

// ─── POST /api/senders/upload ──────────────────────────────────────────────────
async function uploadSenders(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file attached. Send a multipart/form-data request with field name "file".');
    }

    logger.info(`[uploadSenders] Processing: "${req.file.originalname}" (${req.file.size} bytes)`);

    // Parse + validate file
    const { rows, parseErrors } = fileParser.parse(req.file, 'senders');

    if (rows.length === 0 && parseErrors.length === 0) {
      throw new ApiError(400, 'File appears to have no data after header row.');
    }

    // Upsert valid rows to DB
    const { inserted, updated, dbErrors } = await senderService.bulkUpsert(rows);
    const allErrors = [...parseErrors, ...dbErrors];

    // Persist upload log
    const log = await uploadLogService.create({
      upload_type: 'senders',
      filename:    req.file.originalname,
      total_rows:  rows.length + parseErrors.length,
      inserted,
      updated,
      skipped:     0,
      error_count: allErrors.length,
      errors:      allErrors,
    });

    logger.info(`[uploadSenders] Done: ${inserted} inserted, ${updated} updated, ${allErrors.length} errors. logId=${log.id}`);

    res.status(200).json({
      success: true,
      message: buildSummaryMessage(inserted, updated, allErrors.length),
      summary: {
        total:    rows.length + parseErrors.length,
        inserted,
        updated,
        skipped:  0,
        errors:   allErrors.length,
      },
      errors: allErrors,
      logId:  log.id,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/senders ──────────────────────────────────────────────────────────
async function listSenders(req, res, next) {
  try {
    const page   = req.query.page;
    const limit  = req.query.limit;
    const status = req.query.status;

    const { data, total } = await senderService.list({ page, limit, status });
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));

    res.json({
      success: true,
      data,
      pagination: {
        page:       Math.max(1, parseInt(page) || 1),
        limit:      safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/senders/:id ──────────────────────────────────────────────────
async function deleteSender(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, `Invalid sender ID: "${id}". Must be a valid UUID.`);
    }

    const sender = await senderService.softDelete(id);

    res.json({
      success: true,
      message: `Sender "${sender.email}" has been deactivated.`,
      data:    sender,
    });
  } catch (err) {
    if (err.message === 'Sender not found') {
      return next(new ApiError(404, `No sender found with ID: ${req.params.id}`));
    }
    next(err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildSummaryMessage(inserted, updated, errors) {
  const parts = [];
  if (inserted > 0) parts.push(`${inserted} inserted`);
  if (updated  > 0) parts.push(`${updated} updated`);
  if (errors   > 0) parts.push(`${errors} error(s)`);
  return parts.length > 0 ? `Upload complete: ${parts.join(', ')}.` : 'No records were processed.';
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

module.exports = { uploadSenders, listSenders, deleteSender };
