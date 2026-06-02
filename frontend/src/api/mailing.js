import apiClient from './client.js';

/**
 * Fetch the fixed sender (name + email from server env).
 * @returns {Promise<{ name: string, email: string }>}
 */
export async function getFixedSender() {
  const res = await apiClient.get('/mailing/sender');
  return res.data.data;
}

/**
 * Parse an uploaded CSV/Excel file and return a preview of recipients.
 * No emails are sent. No DB writes.
 *
 * @param {File} file
 * @returns {Promise<{ recipients: object[], parseErrors: object[], summary: object }>}
 */
export async function previewRecipients(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post('/mailing/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Send an email campaign to the given recipients via Resend.
 *
 * @param {{ recipients: object[], subject: string, html: string, replyTo?: string }} opts
 * @returns {Promise<{ summary: object, results: object[], sender: object }>}
 */
export async function sendMail({ recipients, subject, html, replyTo }) {
  const res = await apiClient.post('/mailing/send', {
    recipients,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
  return res.data;
}

/**
 * Fetch paginated campaign history from mail_logs.
 * @param {{ page?: number, limit?: number }} opts
 * @returns {Promise<{ data: object[], pagination: object }>}
 */
export async function getMailLogs({ page = 1, limit = 20 } = {}) {
  const res = await apiClient.get('/mailing/logs', { params: { page, limit } });
  return res.data;
}

/**
 * Delete a single campaign log by ID.
 * @param {string} id
 */
export async function deleteMailLog(id) {
  const res = await apiClient.delete(`/mailing/logs/${id}`);
  return res.data;
}

/**
 * Delete ALL campaign logs.
 */
export async function clearAllMailLogs() {
  const res = await apiClient.delete('/mailing/logs');
  return res.data;
}
