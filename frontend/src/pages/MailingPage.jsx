import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Upload, Users, Send, Eye, AlertCircle, CheckCircle,
  XCircle, Download, RefreshCw, X, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import FileUploader from '../components/FileUploader.jsx';
import { getFixedSender, previewRecipients, sendMail } from '../api/mailing.js';

const MAILING_TEMPLATE = `name,email\nAlice Johnson,alice@example.com\nBob Smith,bob@example.com\nCharlie Brown,charlie@example.com`;

function downloadTemplate() {
  const blob = new Blob([MAILING_TEMPLATE], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'mailing_recipients_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = [
    { num: 1, label: 'Upload Recipients' },
    { num: 2, label: 'Compose Email' },
    { num: 3, label: 'Review & Send' },
  ];
  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={s.num} className="step-item">
          <div className={`step-circle ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
            {step > s.num ? <CheckCircle size={14} strokeWidth={2.5} /> : s.num}
          </div>
          <span className={`step-label ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`step-connector ${step > s.num ? 'done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Recipient preview table ────────────────────────────────────────────────
function RecipientTable({ recipients, parseErrors, onClear }) {
  const [showErrors, setShowErrors] = useState(false);
  return (
    <div className="recipient-preview">
      {/* Summary chips */}
      <div className="preview-chips">
        <span className="chip chip-success">
          <CheckCircle size={12} strokeWidth={2.5} />
          {recipients.length} valid recipient{recipients.length !== 1 ? 's' : ''}
        </span>
        {parseErrors.length > 0 && (
          <span className="chip chip-error">
            <XCircle size={12} strokeWidth={2.5} />
            {parseErrors.length} row error{parseErrors.length !== 1 ? 's' : ''}
          </span>
        )}
        <button className="btn btn-secondary btn-xs ml-auto" onClick={onClear} id="btn-clear-recipients">
          <X size={11} strokeWidth={2.5} /> Clear
        </button>
      </div>

      {/* Recipient table */}
      <div className="table-wrap" style={{ maxHeight: 280, overflowY: 'auto', marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r, i) => (
              <tr key={r.email}>
                <td className="text-muted">{i + 1}</td>
                <td>{r.name || <span className="text-muted">—</span>}</td>
                <td className="email-cell">{r.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Parse errors toggle */}
      {parseErrors.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowErrors(v => !v)}
            id="btn-toggle-parse-errors"
          >
            {showErrors ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showErrors ? 'Hide' : 'Show'} {parseErrors.length} row error{parseErrors.length !== 1 ? 's' : ''}
          </button>
          {showErrors && (
            <div className="parse-errors-list">
              {parseErrors.map((e, i) => (
                <div key={i} className="parse-error-row">
                  <span className="parse-error-row-num">Row {e.row}</span>
                  {e.email && <span className="parse-error-email">{e.email}</span>}
                  <span className="parse-error-reason">{e.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MailingPage() {
  const [step, setStep] = useState(1);

  // Step 1 — upload / preview
  const [previewing, setPreviewing]   = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [recipients, setRecipients]   = useState([]);
  const [parseErrors, setParseErrors] = useState([]);

  // Step 2 — compose
  const [subject,  setSubject]   = useState('');
  const [body,     setBody]      = useState('');
  const [replyTo,  setReplyTo]   = useState('');
  const [composeErrors, setComposeErrors] = useState({});

  // Step 3 — send
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState(null);
  const [sendError,    setSendError]    = useState('');
  const [showResults,  setShowResults]  = useState(false);

  // Fixed sender
  const [sender, setSender] = useState(null);

  useEffect(() => {
    getFixedSender().then(setSender).catch(() => {});
  }, []);

  // ── Step 1: preview file ─────────────────────────────────────────────────
  const handlePreview = useCallback(async (file) => {
    setPreviewing(true);
    setPreviewError('');
    setRecipients([]);
    setParseErrors([]);
    try {
      const result = await previewRecipients(file);
      if (result.recipients.length === 0) {
        setPreviewError('No valid recipients found in this file. Please check the format and try again.');
        return;
      }
      setRecipients(result.recipients);
      setParseErrors(result.parseErrors || []);
      setStep(2);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewing(false);
    }
  }, []);

  const handleClearRecipients = () => {
    setRecipients([]);
    setParseErrors([]);
    setPreviewError('');
    setStep(1);
  };

  // ── Step 2: compose validation ───────────────────────────────────────────
  const validateCompose = () => {
    const errs = {};
    if (!subject.trim())  errs.subject = 'Subject is required.';
    if (!body.trim())     errs.body    = 'Email body is required.';
    if (replyTo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo.trim())) {
      errs.replyTo = 'Enter a valid reply-to email address.';
    }
    setComposeErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToReview = () => {
    if (validateCompose()) setStep(3);
  };

  // ── Step 3: send ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    setSending(true);
    setSendError('');
    setSendResult(null);
    try {
      const result = await sendMail({
        recipients,
        subject: subject.trim(),
        html:    body.trim(),
        replyTo: replyTo.trim() || undefined,
      });
      setSendResult(result);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setRecipients([]);
    setParseErrors([]);
    setSubject('');
    setBody('');
    setReplyTo('');
    setComposeErrors({});
    setSendResult(null);
    setSendError('');
    setShowResults(false);
    setPreviewError('');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon">
          <Mail size={20} strokeWidth={2} />
        </div>
        <div className="page-header-text">
          <h1>Mailing</h1>
          <p>Compose and send bulk emails to multiple recipients via CSV or Excel upload.</p>
        </div>
      </div>

      {/* Fixed sender info banner */}
      {sender && (
        <div className="sender-banner">
          <div className="sender-banner-icon">
            <Send size={13} strokeWidth={2.5} />
          </div>
          <span>
            Sending from &nbsp;
            <strong>{sender.name}</strong>
            <span className="sender-email">&lt;{sender.email}&gt;</span>
          </span>
          <span className="sender-badge">Mail Sender</span>
        </div>
      )}

      {/* Step indicator */}
      <StepIndicator step={step} />

      {/* ══════════════ STEP 1 — Upload Recipients ══════════════ */}
      <div className={`card mailing-step ${step >= 1 ? 'step-visible' : ''}`}>
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon upload">
              <Upload size={15} strokeWidth={2} />
            </div>
            Step 1 — Upload Recipients
            {recipients.length > 0 && (
              <span className="chip chip-success" style={{ marginLeft: 8 }}>
                <CheckCircle size={11} strokeWidth={2.5} />
                {recipients.length} loaded
              </span>
            )}
          </div>
        </div>

        {recipients.length === 0 ? (
          <>
            <FileUploader
              onUpload={handlePreview}
              uploading={previewing}
              templateHint={
                <span>
                  Not sure about the format?{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); }}>
                    <Download size={12} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                    Download template CSV
                  </a>
                  {' '}— required: <code>email</code>; optional: <code>name</code>
                </span>
              }
            />
            {previewError && (
              <div className="alert alert-error" style={{ marginTop: 14 }}>
                <XCircle size={15} strokeWidth={2} className="alert-icon" />
                {previewError}
              </div>
            )}
          </>
        ) : (
          <RecipientTable
            recipients={recipients}
            parseErrors={parseErrors}
            onClear={handleClearRecipients}
          />
        )}
      </div>

      {/* ══════════════ STEP 2 — Compose Email ══════════════ */}
      {step >= 2 && (
        <div className="card mailing-step step-visible compose-card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon upload">
                <Mail size={15} strokeWidth={2} />
              </div>
              Step 2 — Compose Email
            </div>
          </div>

          <div className="compose-form">
            {/* From (read-only) */}
            <div className="form-field">
              <label className="form-label" htmlFor="compose-from">From</label>
              <div className="form-input-readonly" id="compose-from">
                {sender
                  ? <><strong>{sender.name}</strong> &lt;{sender.email}&gt;</>
                  : <span className="text-muted">Loading…</span>
                }
                <span className="form-badge-fixed">Fixed</span>
              </div>
            </div>

            {/* Reply-To (optional) */}
            <div className="form-field">
              <label className="form-label" htmlFor="compose-replyto">
                Reply-To <span className="form-label-optional">(optional)</span>
              </label>
              <input
                id="compose-replyto"
                type="email"
                className={`form-input ${composeErrors.replyTo ? 'form-input-error' : ''}`}
                placeholder="replies@yourdomain.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
              {composeErrors.replyTo && (
                <span className="form-field-error">{composeErrors.replyTo}</span>
              )}
            </div>

            {/* Subject */}
            <div className="form-field">
              <label className="form-label" htmlFor="compose-subject">
                Subject <span className="form-label-required">*</span>
              </label>
              <input
                id="compose-subject"
                type="text"
                className={`form-input ${composeErrors.subject ? 'form-input-error' : ''}`}
                placeholder="e.g. Exciting news for our community"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setComposeErrors(p => ({ ...p, subject: '' })); }}
                maxLength={998}
              />
              {composeErrors.subject && (
                <span className="form-field-error">{composeErrors.subject}</span>
              )}
            </div>

            {/* Body */}
            <div className="form-field">
              <div className="form-label-row">
                <label className="form-label" htmlFor="compose-body">
                  Message Body <span className="form-label-required">*</span>
                </label>
                <span className="form-char-count">{body.length} chars</span>
              </div>
              <div className="body-hint">
                <Info size={12} strokeWidth={2} />
                HTML is supported — e.g. <code>&lt;b&gt;bold&lt;/b&gt;</code>, <code>&lt;a href="..."&gt;link&lt;/a&gt;</code>, <code>&lt;br&gt;</code>
              </div>
              <textarea
                id="compose-body"
                className={`form-textarea ${composeErrors.body ? 'form-input-error' : ''}`}
                placeholder={`Hi {name},\n\nWe have some exciting news to share with you...\n\nBest regards,\nThe Team`}
                value={body}
                rows={12}
                onChange={(e) => { setBody(e.target.value); setComposeErrors(p => ({ ...p, body: '' })); }}
              />
              {composeErrors.body && (
                <span className="form-field-error">{composeErrors.body}</span>
              )}
            </div>

            <div className="compose-actions">
              <button
                id="btn-back-to-step1"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                id="btn-proceed-to-review"
                className="btn btn-primary"
                onClick={handleProceedToReview}
              >
                Review & Send →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 3 — Review & Send ══════════════ */}
      {step >= 3 && (
        <div className="card mailing-step step-visible review-card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon upload">
                <Send size={15} strokeWidth={2} />
              </div>
              Step 3 — Review & Send
            </div>
          </div>

          {/* Summary before send */}
          {!sendResult && (
            <>
              <div className="review-summary">
                <div className="review-row">
                  <span className="review-label">From</span>
                  <span className="review-value">
                    {sender?.name} &lt;{sender?.email}&gt;
                  </span>
                </div>
                {replyTo && (
                  <div className="review-row">
                    <span className="review-label">Reply-To</span>
                    <span className="review-value">{replyTo}</span>
                  </div>
                )}
                <div className="review-row">
                  <span className="review-label">Subject</span>
                  <span className="review-value review-subject">{subject}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Recipients</span>
                  <span className="review-value">
                    <span className="chip chip-success">
                      <Users size={11} strokeWidth={2.5} />
                      {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                    </span>
                  </span>
                </div>
                <div className="review-row">
                  <span className="review-label">Body preview</span>
                  <div className="review-body-preview">
                    {body.replace(/<[^>]+>/g, ' ').trim().slice(0, 200)}
                    {body.length > 200 && '…'}
                  </div>
                </div>
              </div>

              {sendError && (
                <div className="alert alert-error" style={{ marginTop: 14 }}>
                  <XCircle size={15} strokeWidth={2} className="alert-icon" />
                  {sendError}
                </div>
              )}

              <div className="review-actions">
                <button
                  id="btn-back-to-step2"
                  className="btn btn-secondary"
                  onClick={() => setStep(2)}
                  disabled={sending}
                >
                  ← Edit
                </button>
                <button
                  id="btn-send-campaign"
                  className="btn btn-send"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <><span className="spinner" /> Sending {recipients.length} email{recipients.length !== 1 ? 's' : ''}…</>
                  ) : (
                    <><Send size={15} strokeWidth={2} /> Send to {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Send result */}
          {sendResult && (
            <div className="send-result">
              {sendResult.summary.failed === 0 ? (
                <div className="result-banner result-success">
                  <CheckCircle size={22} strokeWidth={2} />
                  <div>
                    <div className="result-banner-title">Campaign Sent Successfully!</div>
                    <div className="result-banner-sub">
                      All {sendResult.summary.sent} email{sendResult.summary.sent !== 1 ? 's' : ''} delivered.
                    </div>
                  </div>
                </div>
              ) : sendResult.summary.sent === 0 ? (
                <div className="result-banner result-error">
                  <XCircle size={22} strokeWidth={2} />
                  <div>
                    <div className="result-banner-title">Campaign Failed</div>
                    <div className="result-banner-sub">All {sendResult.summary.total} emails failed to send.</div>
                  </div>
                </div>
              ) : (
                <div className="result-banner result-partial">
                  <AlertCircle size={22} strokeWidth={2} />
                  <div>
                    <div className="result-banner-title">Partially Sent</div>
                    <div className="result-banner-sub">
                      {sendResult.summary.sent} sent, {sendResult.summary.failed} failed.
                    </div>
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div className="result-stats">
                <div className="result-stat">
                  <div className="result-stat-value result-stat-total">{sendResult.summary.total}</div>
                  <div className="result-stat-label">Total</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-value result-stat-sent">{sendResult.summary.sent}</div>
                  <div className="result-stat-label">Sent</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-value result-stat-failed">{sendResult.summary.failed}</div>
                  <div className="result-stat-label">Failed</div>
                </div>
              </div>

              {/* Per-recipient result toggle */}
              {sendResult.results?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowResults(v => !v)}
                    id="btn-toggle-send-results"
                  >
                    {showResults ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {showResults ? 'Hide' : 'Show'} delivery details
                  </button>

                  {showResults && (
                    <div className="table-wrap" style={{ marginTop: 12 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Message ID / Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sendResult.results.map((r, i) => (
                            <tr key={i} className={r.status === 'failed' ? 'error-row' : ''}>
                              <td className="email-cell">{r.email}</td>
                              <td>
                                {r.status === 'sent'
                                  ? <span className="badge badge-active">✓ Sent</span>
                                  : <span className="badge badge-bounced">✗ Failed</span>
                                }
                              </td>
                              <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                {r.messageId || r.error || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Actions after send */}
              <div className="review-actions" style={{ marginTop: 20 }}>
                <button
                  id="btn-send-another"
                  className="btn btn-primary"
                  onClick={handleReset}
                >
                  <Mail size={15} strokeWidth={2} /> Send Another Campaign
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
