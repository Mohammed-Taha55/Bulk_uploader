const router      = require('express').Router();
const supabase    = require('../config/supabase');
const mailService = require('../services/mailService');

/**
 * GET /api/health
 * Returns server uptime + DB connectivity + mail service status.
 */
router.get('/', async (req, res) => {
  const startedAt = process.uptime();
  let dbStatus    = 'ok';
  let dbLatencyMs = null;
  let mailStatus  = 'ok';
  let mailDetail  = null;

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

  // ── Resend API key check ──────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY || '';
  if (!resendKey || resendKey === 're_your_api_key_here') {
    mailStatus = 'warning: RESEND_API_KEY not configured';
    mailDetail = 'Add your Resend API key to .env to enable sending';
  } else {
    mailDetail = `Resend configured — sender: ${process.env.MAIL_FROM_EMAIL}`;
  }

  const healthy = dbStatus === 'ok' && mailStatus === 'ok';

  res.status(healthy ? 200 : 200).json({
    success:   healthy,
    status:    healthy ? 'healthy' : 'degraded',
    uptime_s:  Math.floor(startedAt),
    timestamp: new Date().toISOString(),
    db: {
      status:     dbStatus,
      latency_ms: dbLatencyMs,
    },
    mail: {
      provider:  'resend',
      status:    mailStatus,
      detail:    mailDetail,
      sender:    mailService.getSender(),
    },
  });
});

module.exports = router;
