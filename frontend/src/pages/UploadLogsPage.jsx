import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, RefreshCw, AlertCircle, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, PlusCircle, RotateCcw, XCircle,
  FileText
} from 'lucide-react';
import { listUploadLogs, getUploadLog } from '../api/uploadLogs.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';

export default function UploadLogsPage() {
  const [logs, setLogs]               = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [typeFilter, setTypeFilter]   = useState('');

  const [expandedId, setExpandedId]       = useState(null);
  const [expandedLog, setExpandedLog]     = useState(null);
  const [expandLoading, setExpandLoading] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await listUploadLogs({ page, limit: pagination.limit, upload_type: typeFilter || undefined });
      setLogs(res.data);
      setPagination(p => ({ ...p, ...res.pagination }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, pagination.limit]);

  useEffect(() => { fetchLogs(1); }, [typeFilter]); // eslint-disable-line

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedLog(null);
      return;
    }
    setExpandedId(id);
    setExpandedLog(null);
    setExpandLoading(true);
    try {
      const res = await getUploadLog(id);
      setExpandedLog(res.data);
    } catch (err) {
      setExpandedLog({ _error: err.message });
    } finally {
      setExpandLoading(false);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon">
          <ClipboardList size={20} strokeWidth={2} />
        </div>
        <div className="page-header-text">
          <h1>Upload Logs</h1>
          <p>Full audit trail of every file import — including per-row error details.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon log">
              <FileText size={15} strokeWidth={2} />
            </div>
            Import History
            {!loading && (
              <span className="card-count">
                ({pagination.total.toLocaleString()} uploads)
              </span>
            )}
          </div>

          <div className="filters">
            <span className="filter-label">Type:</span>
            <select
              className="select-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              id="log-type-filter"
            >
              <option value="">All</option>
              <option value="senders">Senders</option>
              <option value="recipients">Recipients</option>
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
              id="btn-refresh-logs"
            >
              {loading
                ? <span className="spinner spinner-dark" />
                : <RefreshCw size={13} strokeWidth={2} />
              }
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={15} strokeWidth={2} className="alert-icon" />
            {error}
          </div>
        )}

        {!loading && logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ClipboardList size={26} strokeWidth={1.5} />
            </div>
            <h3>No uploads yet</h3>
            <p>Import a CSV or Excel file on the Senders or Recipients page.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Stats</th>
                    <th style={{ width: 90 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j}>
                              <span style={{ background: 'var(--n-100)', display: 'block', height: 14, borderRadius: 4 }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : logs.map((log) => (
                        <>
                          <tr
                            key={log.id}
                            style={{ cursor: 'pointer' }}
                            className={expandedId === log.id ? 'log-row-expanded' : ''}
                            onClick={() => toggleExpand(log.id)}
                          >
                            <td>
                              <strong style={{ fontSize: '0.875rem' }}>{log.filename}</strong>
                              <div className="text-muted">{log.total_rows.toLocaleString()} rows</div>
                            </td>
                            <td><StatusBadge status={log.upload_type} /></td>
                            <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                            <td>
                              <div className="log-stats">
                                <span className="log-stat ins">
                                  <PlusCircle size={11} strokeWidth={2.5} />
                                  {log.inserted}
                                </span>
                                <span className="log-stat upd">
                                  <RotateCcw size={11} strokeWidth={2.5} />
                                  {log.updated}
                                </span>
                                {log.error_count > 0 && (
                                  <span className="log-stat err">
                                    <XCircle size={11} strokeWidth={2.5} />
                                    {log.error_count}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => { e.stopPropagation(); toggleExpand(log.id); }}
                                id={`btn-expand-log-${log.id}`}
                              >
                                {expandedId === log.id
                                  ? <><ChevronUp size={13} strokeWidth={2} /> Hide</>
                                  : <><ChevronDown size={13} strokeWidth={2} /> View</>
                                }
                              </button>
                            </td>
                          </tr>

                          {expandedId === log.id && (
                            <tr key={`${log.id}-detail`} className="log-detail-row">
                              <td colSpan={5}>
                                <div className="log-detail-inner">
                                  {expandLoading ? (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                      <span className="spinner spinner-dark" />
                                      Loading error details…
                                    </div>
                                  ) : expandedLog?._error ? (
                                    <div className="alert alert-error" style={{ margin: 0 }}>
                                      <AlertCircle size={15} strokeWidth={2} className="alert-icon" />
                                      {expandedLog._error}
                                    </div>
                                  ) : expandedLog?.errors?.length === 0 ? (
                                    <div className="alert alert-success" style={{ margin: 0 }}>
                                      <CheckCircle2 size={15} strokeWidth={2} className="alert-icon" />
                                      All rows imported successfully — no errors.
                                    </div>
                                  ) : expandedLog?.errors?.length > 0 ? (
                                    <div>
                                      <div className="error-section-title" style={{ marginBottom: 12 }}>
                                        <AlertTriangle size={14} strokeWidth={2.5} />
                                        {expandedLog.errors.length} error{expandedLog.errors.length !== 1 ? 's' : ''}
                                      </div>
                                      <div className="table-wrap">
                                        <table>
                                          <thead>
                                            <tr>
                                              <th style={{ width: 70 }}>Row #</th>
                                              <th>Email</th>
                                              <th>Reason</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {expandedLog.errors.map((err, i) => (
                                              <tr key={i} className="error-row">
                                                <td><strong>{err.row || '—'}</strong></td>
                                                <td className="email-cell">{err.email || '—'}</td>
                                                <td className="error-reason">{err.reason}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                  }
                </tbody>
              </table>
            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPage={(p) => fetchLogs(p)}
            />
          </>
        )}
      </div>
    </>
  );
}
