'use strict';
/**
 * MailService — Resend implementation.
 *
 * Interface:
 *   send({ recipients, subject, html, text?, replyTo? })
 *   → Promise<{ sent: number, failed: number, results: [] }>
 *
 * Environment variables required (set in .env):
 *   RESEND_API_KEY     re_xxxxxxxxxxxxxxxxxxxxxxxx
 *   MAIL_FROM_NAME     Mohammed Taha
 *   MAIL_FROM_EMAIL    prodev595@gmail.com   (must be verified in Resend)
 *
 * Sending strategy:
 *   Each recipient gets their own individual email call for
 *   personalization and per-recipient tracking.
 */

const { Resend } = require('resend');

class MailService {
  constructor() {
    this._resend = new Resend(process.env.RESEND_API_KEY);
    this._fromName  = process.env.MAIL_FROM_NAME  || 'Bulk Mailer';
    this._fromEmail = process.env.MAIL_FROM_EMAIL || 'onboarding@resend.dev';
    this._from      = `${this._fromName} <${this._fromEmail}>`;
  }

  /**
   * Returns the fixed sender info (name + email).
   * Used by the /api/mailing/sender endpoint.
   */
  getSender() {
    return { name: this._fromName, email: this._fromEmail };
  }

  /**
   * Send an email to multiple recipients — one individual send per recipient.
   *
   * @param {object}   opts
   * @param {object[]} opts.recipients   [{ name?, email }]
   * @param {string}   opts.subject
   * @param {string}   opts.html
   * @param {string}   [opts.text]       Plain-text fallback (auto-generated if omitted)
   * @param {string}   [opts.replyTo]    Optional reply-to address
   * @returns {Promise<{ sent: number, failed: number, results: object[] }>}
   */
  async send({ recipients, subject, html, text, replyTo }) {
    // ── Validation ──────────────────────────────────────────────────────────
    if (!recipients?.length)  throw new Error('MailService.send: at least one recipient is required');
    if (!subject?.trim())     throw new Error('MailService.send: subject is required');
    if (!html?.trim())        throw new Error('MailService.send: html body is required');

    const plainText = text || _htmlToPlainText(html);

    // ── Batched rate-limited send ─────────────────────────────────────────
    // Resend allows max 2 requests/sec on free plans.
    // We send in batches of 2 with a 600ms pause between batches (~1.6 req/sec).
    const BATCH_SIZE  = 2;
    const BATCH_DELAY = 600; // ms between batches

    const resultDetails = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Send batch concurrently (max 2 at a time)
      const batchResults = await Promise.allSettled(
        batch.map((r) => this._sendOne({ recipient: r, subject, html, text: plainText, replyTo }))
      );

      // Collect results
      batchResults.forEach((r, j) => {
        const recipient = batch[j];
        if (r.status === 'fulfilled') {
          resultDetails.push({ email: recipient.email, status: 'sent', messageId: r.value?.id });
        } else {
          resultDetails.push({ email: recipient.email, status: 'failed', error: r.reason?.message || 'Unknown error' });
        }
      });

      // Wait between batches (skip delay after the last batch)
      const isLastBatch = i + BATCH_SIZE >= recipients.length;
      if (!isLastBatch) {
        await _sleep(BATCH_DELAY);
      }
    }

    const sent   = resultDetails.filter(r => r.status === 'sent').length;
    const failed = resultDetails.filter(r => r.status === 'failed').length;

    console.log(`[MailService] Campaign done — sent: ${sent}, failed: ${failed}`);
    return { sent, failed, results: resultDetails };
  }

  /**
   * Send one email to one recipient via Resend.
   * Retries once on rate-limit (429) with a 1.2s backoff.
   * @private
   */
  async _sendOne({ recipient, subject, html, text, replyTo }, retryCount = 0) {
    const toAddress = recipient.name
      ? `${recipient.name} <${recipient.email}>`
      : recipient.email;

    const payload = {
      from:    this._from,
      to:      [toAddress],
      subject,
      html,
      text,
    };

    if (replyTo) {
      payload.reply_to = replyTo;
    }

    const { data, error } = await this._resend.emails.send(payload);

    if (error) {
      // Retry once on rate-limit errors with exponential backoff
      const isRateLimit = error.message?.toLowerCase().includes('too many') ||
                          error.name === 'rate_limit_exceeded' ||
                          error.statusCode === 429;

      if (isRateLimit && retryCount < 2) {
        const backoff = 1200 * (retryCount + 1); // 1.2s, then 2.4s
        console.warn(`[MailService] Rate limit hit for ${recipient.email} — retrying in ${backoff}ms (attempt ${retryCount + 1})`);
        await _sleep(backoff);
        return this._sendOne({ recipient, subject, html, text, replyTo }, retryCount + 1);
      }

      throw new Error(error.message || JSON.stringify(error));
    }

    return data;
  }
}

/**
 * Minimal HTML → plain-text strip for the text fallback.
 * @param {string} html
 * @returns {string}
 */
function _htmlToPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Simple promise-based sleep.
 * @param {number} ms
 */
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export singleton
module.exports = new MailService();
