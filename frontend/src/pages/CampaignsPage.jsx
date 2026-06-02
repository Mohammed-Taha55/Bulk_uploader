import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, RefreshCw, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Mail, Send, Clock, Inbox, Trash2, AlertTriangle,
} from 'lucide-react';
import { getMailLogs, deleteMailLog, clearAllMailLogs } from '../api/mailing.js';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function SuccessRate({ sent, failed }) {
  const total = sent + failed;
  if (total === 0) return <span className="text-muted">—</span>;
  const pct = Math.round((sent / total) * 100);
  return (
    <div className="rate-bar-wrap">
      <div className="rate-bar-track">
        <div
          className={`rate-bar-fill ${pct === 100 ? 'fill-success' : pct === 0 ? 'fill-error' : 'fill-partial'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`rate-label ${pct === 100 ? 'label-success' : pct === 0 ? 'label-error' : 'label-partial'}`}>
        {pct}%
      </span>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={loading}>
            {loading ? <><span className="spinner spinner-dark" /> Deleting…</> : <><Trash2 size={13} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Expandable row ─────────────────────────────────────────────────────────
function CampaignRow({ log, onDelete }) {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const total   = log.total_sent + log.total_failed;
  const allOk   = log.total_failed === 0;
  const allFail = log.total_sent   === 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMailLog(log.id);
      onDelete(log.id);
    } catch {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={`Delete campaign "${log.subject}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
          loading={deleting}
        />
      )}

      <tr
        className={`campaign-row ${open ? 'campaign-row-expanded' : ''}`}
        onClick={() => setOpen(v => !v)}
        style={{ cursor: 'pointer' }}
      >
        {/* Status icon */}
        <td style={{ width: 40, textAlign: 'center' }}>
          {allOk
            ? <CheckCircle size={16} strokeWidth={2} color="var(--success)" />
            : allFail
              ? <XCircle    size={16} strokeWidth={2} color="var(--error)" />
              : <AlertCircle size={16} strokeWidth={2} color="var(--warning)" />
          }
        </td>

        {/* Subject */}
        <td>
          <div className="campaign-subject">{log.subject}</div>
          <div className="campaign-from">
            <Mail size={11} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
            {log.sender_email}
          </div>
        </td>

        {/* Stats */}
        <td style={{ whiteSpace: 'nowrap' }}>
          <div className="send-stats">
            <span className="stat-chip stat-sent">
              <CheckCircle size={11} strokeWidth={2.5} />
              {log.total_sent}
            </span>
            {log.total_failed > 0 && (
              <span className="stat-chip stat-failed">
                <XCircle size={11} strokeWidth={2.5} />
                {log.total_failed}
              </span>
            )}
          </div>
        </td>

        {/* Success rate */}
        <td style={{ minWidth: 120 }}>
          <SuccessRate sent={log.total_sent} failed={log.total_failed} />
        </td>

        {/* Date */}
        <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
          <Clock size={11} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {formatDate(log.created_at)}
        </td>

        {/* Delete button */}
        <td style={{ width: 40, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <button
            className="btn-icon-delete"
            title="Delete this campaign"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        </td>

        {/* Expand toggle */}
        <td style={{ width: 36, textAlign: 'center' }}>
          {open
            ? <ChevronUp   size={15} strokeWidth={2} color="var(--text-muted)" />
            : <ChevronDown size={15} strokeWidth={2} color="var(--text-muted)" />
          }
        </td>
      </tr>

      {/* Expanded delivery details */}
      {open && Array.isArray(log.recipients) && log.recipients.length > 0 && (
        <tr className="campaign-detail-row">
          <td colSpan={7} style={{ padding: 0, borderBottom: 'none' }}>
            <div className="campaign-detail-inner">
              <div className="campaign-detail-title">
                Delivery details — {total} recipient{total !== 1 ? 's' : ''}
              </div>
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Message ID / Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.recipients.map((r, i) => (
                      <tr key={i} className={r.status === 'failed' ? 'error-row' : ''}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="email-cell">{r.email}</td>
                        <td>
                          {r.status === 'sent'
                            ? <span className="badge badge-active">✓ Sent</span>
                            : <span className="badge badge-bounced">✗ Failed</span>
                          }
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {r.messageId || r.error || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [logs,       setLogs]       = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing,     setClearing]    = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getMailLogs({ page, limit: pagination.limit });
      setLogs(res.data || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => { fetchLogs(1); }, []);

  // Remove a deleted row from local state
  const handleRowDeleted = (id) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  };

  // Clear all
  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAllMailLogs();
      setLogs([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 1, page: 1 }));
      setClearConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  const totalSentAll   = logs.reduce((s, l) => s + l.total_sent,   0);
  const totalFailedAll = logs.reduce((s, l) => s + l.total_failed, 0);
  const totalEmailsAll = totalSentAll + totalFailedAll;

  return (
    <>
      {/* Clear-all confirm dialog */}
      {clearConfirm && (
        <ConfirmDialog
          message="Delete ALL campaign history? This cannot be undone."
          onConfirm={handleClearAll}
          onCancel={() => setClearConfirm(false)}
          loading={clearing}
        />
      )}

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon">
          <ClipboardList size={20} strokeWidth={2} />
        </div>
        <div className="page-header-text">
          <h1>Campaigns</h1>
          <p>History of all email campaigns sent through the Mailing module.</p>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && !error && pagination.total > 0 && (
        <div className="campaigns-summary">
          <div className="csum-card">
            <div className="csum-value">{pagination.total}</div>
            <div className="csum-label">Campaigns</div>
          </div>
          <div className="csum-card">
            <div className="csum-value csum-sent">{totalSentAll}</div>
            <div className="csum-label">Emails Sent</div>
          </div>
          <div className="csum-card">
            <div className="csum-value csum-failed">{totalFailedAll}</div>
            <div className="csum-label">Emails Failed</div>
          </div>
          <div className="csum-card">
            <div className="csum-value csum-rate">
              {totalEmailsAll > 0 ? Math.round((totalSentAll / totalEmailsAll) * 100) : 0}%
            </div>
            <div className="csum-label">Success Rate</div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon log">
              <Send size={15} strokeWidth={2} />
            </div>
            Sent Campaigns
            {pagination.total > 0 && (
              <span className="card-count">({pagination.total})</span>
            )}
          </div>
          <div className="card-header-actions">
            <button
              id="btn-refresh-campaigns"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
            >
              <RefreshCw size={13} strokeWidth={2} className={loading ? 'spin-icon' : ''} />
              Refresh
            </button>
            {logs.length > 0 && (
              <button
                id="btn-clear-all-campaigns"
                className="btn btn-danger btn-sm"
                onClick={() => setClearConfirm(true)}
                disabled={loading}
              >
                <Trash2 size={13} strokeWidth={2} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <XCircle size={15} strokeWidth={2} className="alert-icon" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="campaigns-loading">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton skeleton-icon" />
                <div className="skeleton-text">
                  <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '30%', height: 10, marginTop: 6 }} />
                </div>
                <div className="skeleton skeleton-line" style={{ width: 80 }} />
                <div className="skeleton skeleton-line" style={{ width: 120 }} />
                <div className="skeleton skeleton-line" style={{ width: 100 }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Inbox size={28} strokeWidth={1.5} />
            </div>
            <h3>No campaigns yet</h3>
            <p>Once you send your first email campaign from the Mailing tab, it will appear here.</p>
          </div>
        )}

        {/* Table */}
        {!loading && logs.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }} />
                    <th>Subject / Sender</th>
                    <th>Sent / Failed</th>
                    <th>Success Rate</th>
                    <th>Date &amp; Time</th>
                    <th style={{ width: 40 }} />
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <CampaignRow key={log.id} log={log} onDelete={handleRowDeleted} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    ‹
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i}
                      className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                      onClick={() => fetchLogs(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
