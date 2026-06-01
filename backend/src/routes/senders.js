const router = require('express').Router();
const { uploadSenders, listSenders, deleteSender } = require('../controllers/senderController');
const { uploadSingle }    = require('../middlewares/uploadMiddleware');
const { uploadRateLimiter } = require('../middlewares/rateLimiter');

// GET  /api/senders
router.get('/', listSenders);

// POST /api/senders/upload
router.post('/upload', uploadRateLimiter, uploadSingle, uploadSenders);

// DELETE /api/senders/:id  (soft delete)
router.delete('/:id', deleteSender);

module.exports = router;
