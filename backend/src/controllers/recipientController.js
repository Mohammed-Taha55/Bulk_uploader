const fileParser        = require('../services/fileParser');
const recipientService  = require('../services/recipientService');
const uploadLogService  = require('../services/uploadLogService');
const ApiError          = require('../utils/ApiError');
const logger            = require('../utils/logger');

// ─── POST /api/recipients/upload ──────────────────────────────────────────────
async function uploadRecipients(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file attached. Send a multipart/form-data request with field name "file".');
    }

    logger.info(`[uploadRecipients] Processing: "${req.file.originalname}" (${req.file.size} bytes)`);

    const { rows, parseErrors } = fileParser.parse(req.file, 'recipients');

    if (rows.length === 0 && parseErrors.length === 0) {
      throw new ApiError(400, 'File appears to have no data after header row.');
    }

    const { inserted, updated, dbErrors } = await recipientService.bulkUpsert(rows);
    const allErrors = [...parseErrors, ...dbErrors];

    const log = await uploadLogService.create({
      upload_type: 'recipients',
      filename:    req.file.originalname,
      total_rows:  rows.length + parseErrors.length,
      inserted,
      updated,
      skipped:     0,
      error_count: allErrors.length,
      errors:      allErrors,
    });

    logger.info(`[uploadRecipients] Done: ${inserted} inserted, ${updated} updated, ${allErrors.length} errors. logId=${log.id}`);

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

// ─── GET /api/recipients ───────────────────────────────────────────────────────
async function listRecipients(req, res, next) {
  try {
    const { page, limit, status, tag } = req.query;

    const { data, total } = await recipientService.list({ page, limit, status, tag });
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

// ─── PATCH /api/recipients/:id/status ─────────────────────────────────────────
async function updateRecipientStatus(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, `Invalid recipient ID: "${id}". Must be a valid UUID.`);
    }

    const { status } = req.body;
    if (!status) {
      throw new ApiError(400, 'Request body must include a "status" field.');
    }

    const recipient = await recipientService.updateStatus(id, status);

    res.json({
      success: true,
      message: `Recipient "${recipient.email}" status updated to "${recipient.status}".`,
      data:    recipient,
    });
  } catch (err) {
    if (err.statusCode) {
      return next(new ApiError(err.statusCode, err.message));
    }
    next(err);
  }
}

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

module.exports = { uploadRecipients, listRecipients, updateRecipientStatus };
