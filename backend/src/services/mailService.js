'use strict';
/**
 * MailService — Brevo SMTP implementation via nodemailer.
 *
 * Interface (unchanged from stub):
 *   send({ sender, recipients, subject, html, text? })
 *   → Promise<{ messageId, status: 'sent' }>
 *
 * Environment variables required (set in .env):
 *   BREVO_SMTP_HOST   smtp-relay.brevo.com
 *   BREVO_SMTP_PORT   587
 *   BREVO_SMTP_USER   <your brevo login>
 *   BREVO_SMTP_PASS   <your brevo SMTP key>
 *
 * No other files need to change.
 */
const nodemailer = require('nodemailer');

class MailService {
  constructor() {
    // Build the transporter once and reuse it (connection pooling)
    this._transporter = nodemailer.createTransport({
      host:   process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port:   Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,          // STARTTLS on port 587
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
      pool:            true,  // keep connections alive for bulk sends
      maxConnections:  5,
      rateDelta:       1000,  // 1 second window
      rateLimit:       10,    // max 10 messages per second (well within Brevo limits)
      logger:          process.env.NODE_ENV === 'development',
      debug:           false,
    });
  }

  /**
   * Verify the SMTP connection.
   * Useful for a health-check or startup ping.
   * @returns {Promise<boolean>}
   */
  async verify() {
    try {
      await this._transporter.verify();
      return true;
    } catch (err) {
      console.error('[MailService] SMTP verify failed:', err.message);
      return false;
    }
  }

  /**
   * Send an email via Brevo SMTP.
   *
   * @param {object}   opts
   * @param {object}   opts.sender          { name, email, reply_to? }
   * @param {object[]} opts.recipients      [{ name?, email }]
   * @param {string}   opts.subject
   * @param {string}   opts.html
   * @param {string}   [opts.text]          Plain-text fallback (auto-generated if omitted)
   * @returns {Promise<{ messageId: string, status: 'sent' }>}
   */
  async send({ sender, recipients, subject, html, text }) {
    // ── Validation ────────────────────────────────────────────────────────────
    if (!sender?.email)       throw new Error('MailService.send: sender.email is required');
    if (!recipients?.length)  throw new Error('MailService.send: at least one recipient is required');
    if (!subject?.trim())     throw new Error('MailService.send: subject is required');
    if (!html?.trim())        throw new Error('MailService.send: html body is required');

    // ── Build "To" list ───────────────────────────────────────────────────────
    // nodemailer accepts comma-separated strings or an array of address objects
    const toList = recipients.map((r) =>
      r.name ? `"${r.name}" <${r.email}>` : r.email
    );

    // ── Build message ─────────────────────────────────────────────────────────
    const message = {
      from:    `"${sender.name || 'Bulk Mailer'}" <${sender.email}>`,
      to:      toList,
      subject,
      html,
      text:    text || _htmlToPlainText(html),
      // Optional reply-to header
      ...(sender.reply_to ? { replyTo: sender.reply_to } : {}),
      // Brevo specific: suppress list-unsubscribe warnings for transactional
      headers: {
        'X-Mailer': 'BulkMailer-POC/1.0',
      },
    };

    // ── Send ──────────────────────────────────────────────────────────────────
    try {
      const info = await this._transporter.sendMail(message);

      console.log(`[MailService] Sent OK — messageId: ${info.messageId} — to: ${toList.length} recipient(s)`);

      return { messageId: info.messageId, status: 'sent' };
    } catch (err) {
      console.error('[MailService] Send failed:', err.message);
      throw new Error(`MailService: failed to send email — ${err.message}`);
    }
  }
}

/**
 * Minimal HTML → plain-text strip for the text fallback.
 * Not a full HTML parser — just good enough for simple templates.
 * @param {string} html
 * @returns {string}
 */
function _htmlToPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Export singleton
module.exports = new MailService();
