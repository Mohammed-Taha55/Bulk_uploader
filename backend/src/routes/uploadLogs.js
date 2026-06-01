const router = require('express').Router();
const { listUploadLogs, getUploadLog } = require('../controllers/uploadLogController');

// GET /api/upload-logs
router.get('/', listUploadLogs);

// GET /api/upload-logs/:id  (includes full error details)
router.get('/:id', getUploadLog);

module.exports = router;
