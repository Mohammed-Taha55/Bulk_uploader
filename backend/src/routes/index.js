const router = require('express').Router();

router.use('/health',       require('./health'));
router.use('/upload-logs',  require('./uploadLogs'));
router.use('/mailing',      require('./mailing'));

module.exports = router;
