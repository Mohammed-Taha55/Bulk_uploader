const uploadLogService = require('../services/uploadLogService');
const ApiError         = require('../utils/ApiError');

// ─── GET /api/upload-logs ─────────────────────────────────────────────────────
async function listUploadLogs(req, res, next) {
  try {
    const { page, limit, upload_type } = req.query;

    const { data, total } = await uploadLogService.list({ page, limit, upload_type });
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

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

// ─── GET /api/upload-logs/:id ──────────────────────────────────────────────────
async function getUploadLog(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new ApiError(400, `Invalid log ID: "${id}". Must be a valid UUID.`);
    }

    const log = await uploadLogService.getById(id);
    if (!log) {
      throw new ApiError(404, `No upload log found with ID: ${id}`);
    }

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

module.exports = { listUploadLogs, getUploadLog };
