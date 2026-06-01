'use strict';
/**
 * test-mail.js — fires a real email via mailService to verify the Brevo SMTP setup.
 * Run once: node scripts/test-mail.js
 * Safe to delete afterwards.
 */
require('dotenv').config();               // load .env before requiring mailService
const mailService = require('../src/services/mailService');

const TEST_RECIPIENT = 'mdtaha5534@gmail.com';

(async () => {
  console.log('──────────────────────────────────────────');
  console.log('  Bulk Mailer — Brevo SMTP Test');
  console.log('──────────────────────────────────────────');

  // 1. Verify SMTP handshake
  process.stdout.write('1. SMTP verify … ');
  const connected = await mailService.verify();
  if (!connected) {
    console.log('FAILED ✗  — Check BREVO_SMTP_USER / BREVO_SMTP_PASS in .env');
    process.exit(1);
  }
  console.log('OK ✓');

  // 2. Send a real test email
  process.stdout.write(`2. Sending test email to ${TEST_RECIPIENT} … `);
  try {
    const result = await mailService.send({
      sender: {
        name:     'Bulk Mailer POC',
        email:    process.env.MAIL_FROM_EMAIL,
        reply_to: process.env.MAIL_FROM_EMAIL,
      },
      recipients: [{ name: 'Taha', email: TEST_RECIPIENT }],
      subject: '✅ Brevo SMTP Test — Bulk Mailer POC',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:#4f46e5;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">Bulk Mailer POC</h1>
          </div>
          <h2 style="color:#0f172a;font-size:18px;margin-bottom:8px;">SMTP Test Successful</h2>
          <p style="color:#475569;line-height:1.6;">
            This is a test email sent from your <strong>Bulk Mailer POC</strong> application
            via <strong>Brevo SMTP</strong> (smtp-relay.brevo.com:587).
          </p>
          <table style="width:100%;margin:20px 0;border-collapse:collapse;">
            <tr style="background:#fff;border:1px solid #e2e8f0;">
              <td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;width:120px;">Provider</td>
              <td style="padding:10px 14px;font-size:13px;color:#0f172a;">Brevo SMTP</td>
            </tr>
            <tr style="background:#f1f5f9;border:1px solid #e2e8f0;">
              <td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;">Host</td>
              <td style="padding:10px 14px;font-size:13px;color:#0f172a;">smtp-relay.brevo.com:587</td>
            </tr>
            <tr style="background:#fff;border:1px solid #e2e8f0;">
              <td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;">Sent at</td>
              <td style="padding:10px 14px;font-size:13px;color:#0f172a;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
            You can delete scripts/test-mail.js after confirming delivery.
          </p>
        </div>
      `,
    });

    console.log('SENT ✓');
    console.log('');
    console.log('  messageId :', result.messageId);
    console.log('  status    :', result.status);
    console.log('');
    console.log('──────────────────────────────────────────');
    console.log('  Check inbox:', TEST_RECIPIENT);
    console.log('  (also check Spam if not in inbox)');
    console.log('──────────────────────────────────────────');
  } catch (err) {
    console.log('FAILED ✗');
    console.error('  Error:', err.message);
    process.exit(1);
  }
})();
