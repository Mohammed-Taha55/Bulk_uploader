const router = require('express').Router();
const { uploadRecipients, listRecipients, updateRecipientStatus } = require('../controllers/recipientController');
const { uploadSingle }      = require('../middlewares/uploadMiddleware');
const { uploadRateLimiter } = require('../middlewares/rateLimiter');

// GET  /api/recipients
router.get('/', listRecipients);

// POST /api/recipients/upload
router.post('/upload', uploadRateLimiter, uploadSingle, uploadRecipients);

// PATCH /api/recipients/:id/status
router.patch('/:id/status', updateRecipientStatus);

module.exports = router;
