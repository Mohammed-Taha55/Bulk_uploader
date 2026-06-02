'use strict';
/**
 * mailingController.js
 *
 * Endpoints:
 *   GET  /api/mailing/sender          → returns fixed sender info from env
 *   GET  /api/mailing/logs            → paginated campaign history from mail_logs
 *   POST /api/mailing/preview         → parse uploaded CSV/Excel, return recipient list (no DB write, no email)
 *   POST /api/mailing/send            → send emails to provided recipients via Resend
 */

const fileParser   = require('../services/fileParser');
const mailService  = require('../services/mailService');
const ApiError     = require('../utils/ApiError');
const logger       = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase client (for logging campaigns) ────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── GET /api/mailing/sender ───────────────────────────────────────────────
async function getFixedSender(req, res, next) {
  try {
    const sender = mailService.getSender();
    res.json({ success: true, data: sender });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/mailing/preview ─────────────────────────────────────────────
/**
 * Parses an uploaded CSV/Excel file and returns a list of valid recipient
 * rows (name + email) without writing to DB or sending any emails.
 * Also returns parse errors so the user can review before sending.
 */
async function previewRecipients(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file attached. Send a multipart/form-data request with field name "file".');
    }

    logger.info(`[mailing/preview] Parsing "${req.file.originalname}" (${req.file.size} bytes)`);

    const { rows, parseErrors } = fileParser.parse(req.file, 'recipients');

    // Strip out extra metadata — only need name + email for mailing
    const recipients = rows.map((r) => ({
      name:  r.name  || null,
      email: r.email,
    }));

    logger.info(`[mailing/preview] ${recipients.length} valid recipients, ${parseErrors.length} errors`);

    res.json({
      success:    true,
      recipients,
      parseErrors,
      summary: {
        total:  recipients.length + parseErrors.length,
        valid:  recipients.length,
        errors: parseErrors.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/mailing/send ────────────────────────────────────────────────
/**
 * Sends an email campaign.
 *
 * Body (JSON):
 *   {
 *     recipients: [{ name?, email }],  // from /preview step
 *     subject:    string,
 *     html:       string,              // email body (HTML)
 *     text?:      string,              // plain-text fallback (optional)
 *     replyTo?:   string,              // optional reply-to address
 *   }
 */
async function sendMail(req, res, next) {
  try {
    const { recipients, subject, html, text, replyTo } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ApiError(400, 'recipients must be a non-empty array.');
    }
    if (!subject?.trim()) {
      throw new ApiError(400, 'subject is required.');
    }
    if (!html?.trim()) {
      throw new ApiError(400, 'html body is required.');
    }

    // Validate each recipient has an email
    const invalid = recipients.filter(r => !r.email || typeof r.email !== 'string');
    if (invalid.length > 0) {
      throw new ApiError(400, `${invalid.length} recipient(s) are missing a valid email address.`);
    }

    const sender = mailService.getSender();

    logger.info(
      `[mailing/send] Sending "${subject}" from ${sender.email} to ${recipients.length} recipient(s)`
    );

    // ── Send via Resend ─────────────────────────────────────────────────────
    const result = await mailService.send({ recipients, subject, html, text, replyTo });

    // ── Log campaign to Supabase ────────────────────────────────────────────
    try {
      await supabase.from('mail_logs').insert({
        subject,
        sender_email:  sender.email,
        total_sent:    result.sent,
        total_failed:  result.failed,
        recipients:    result.results,
      });
    } catch (logErr) {
      // Non-fatal — don't block the response if logging fails
      logger.error('[mailing/send] Failed to write mail_log:', logErr.message);
    }

    logger.info(`[mailing/send] Done — sent: ${result.sent}, failed: ${result.failed}`);

    res.json({
      success: true,
      message: `Email campaign complete: ${result.sent} sent, ${result.failed} failed.`,
      summary: {
        sent:   result.sent,
        failed: result.failed,
        total:  recipients.length,
      },
      results: result.results,
      sender,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/mailing/logs ────────────────────────────────────────────────
/**
 * Returns paginated list of mail campaigns from mail_logs, newest first.
 * Query params: page (default 1), limit (default 20)
 */
async function getMailLogs(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('mail_logs')
      .select('id, subject, sender_email, total_sent, total_failed, recipients, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new ApiError(500, 'Failed to fetch mail logs: ' + error.message);

    res.json({
      success: true,
      data:    data || [],
      pagination: {
        page,
        limit,
        total:      count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/mailing/logs/:id ──────────────────────────────────────
/** Delete a single campaign log by ID. */
async function deleteMailLog(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError(400, 'Log ID is required.');

    const { error } = await supabase.from('mail_logs').delete().eq('id', id);
    if (error) throw new ApiError(500, 'Failed to delete log: ' + error.message);

    res.json({ success: true, message: 'Campaign log deleted.' });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/mailing/logs ──────────────────────────────────────────
/** Delete ALL campaign logs. */
async function clearAllMailLogs(req, res, next) {
  try {
    // Supabase requires a filter for delete; use a truthy condition to match all rows
    const { error } = await supabase.from('mail_logs').delete().gte('total_sent', 0);
    if (error) throw new ApiError(500, 'Failed to clear logs: ' + error.message);

    res.json({ success: true, message: 'All campaign logs cleared.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFixedSender, getMailLogs, deleteMailLog, clearAllMailLogs, previewRecipients, sendMail };
