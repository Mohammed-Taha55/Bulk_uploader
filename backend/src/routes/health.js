const router      = require('express').Router();
const supabase    = require('../config/supabase');
const mailService = require('../services/mailService');

/**
 * GET /api/health
 * Returns server uptime + DB connectivity + SMTP connectivity.
 */
router.get('/', async (req, res) => {
  const startedAt = process.uptime();
  let dbStatus    = 'ok';
  let dbLatencyMs = null;
  let smtpStatus  = 'ok';
  let smtpLatencyMs = null;

  // ── DB ping ───────────────────────────────────────────────────────────────
  try {
    const t0 = Date.now();
    const { error } = await supabase
      .from('senders')
      .select('id', { count: 'exact', head: true });
    dbLatencyMs = Date.now() - t0;
    if (error) dbStatus = `error: ${error.message}`;
  } catch (err) {
    dbStatus = `unreachable: ${err.message}`;
  }

  // ── SMTP ping ─────────────────────────────────────────────────────────────
  try {
    const t0  = Date.now();
    const ok  = await mailService.verify();
    smtpLatencyMs = Date.now() - t0;
    if (!ok) smtpStatus = 'unreachable';
  } catch (err) {
    smtpStatus = `error: ${err.message}`;
  }

  const healthy = dbStatus === 'ok' && smtpStatus === 'ok';

  res.status(healthy ? 200 : 503).json({
    success:   healthy,
    status:    healthy ? 'healthy' : 'degraded',
    uptime_s:  Math.floor(startedAt),
    timestamp: new Date().toISOString(),
    db: {
      status:     dbStatus,
      latency_ms: dbLatencyMs,
    },
    smtp: {
      status:     smtpStatus,
      latency_ms: smtpLatencyMs,
      host:       process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    },
  });
});

module.exports = router;

