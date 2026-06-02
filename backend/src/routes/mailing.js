'use strict';

const router = require('express').Router();
const {
  getFixedSender, getMailLogs, deleteMailLog, clearAllMailLogs,
  previewRecipients, sendMail,
} = require('../controllers/mailingController');
const { uploadSingle }      = require('../middlewares/uploadMiddleware');
const { uploadRateLimiter } = require('../middlewares/rateLimiter');

// GET    /api/mailing/sender   — return fixed sender (name + email from env)
router.get('/sender', getFixedSender);

// GET    /api/mailing/logs     — paginated campaign history from mail_logs
router.get('/logs', getMailLogs);

// DELETE /api/mailing/logs     — delete ALL campaign logs
router.delete('/logs', clearAllMailLogs);

// DELETE /api/mailing/logs/:id — delete one campaign log by ID
router.delete('/logs/:id', deleteMailLog);

// POST   /api/mailing/preview  — parse CSV/Excel, return recipient list (no send)
router.post('/preview', uploadRateLimiter, uploadSingle, previewRecipients);

// POST   /api/mailing/send     — send email campaign via Resend
router.post('/send', sendMail);

module.exports = router;

