const router = require('express').Router();

router.use('/health',       require('./health'));
router.use('/senders',      require('./senders'));
router.use('/recipients',   require('./recipients'));
router.use('/upload-logs',  require('./uploadLogs'));

module.exports = router;
