import { useState, useEffect, useCallback } from 'react';
import { Send, Upload, List, RefreshCw, Download, Trash2, AlertCircle, XCircle } from 'lucide-react';
import { uploadSenders, listSenders, deleteSender } from '../api/senders.js';
import FileUploader from '../components/FileUploader.jsx';
import UploadResult from '../components/UploadResult.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';

const SENDER_TEMPLATE = `name,email,reply_to\nAlice Johnson,alice@example.com,support@example.com\nBob Smith,bob@example.com,`;

function downloadTemplate() {
  const blob = new Blob([SENDER_TEMPLATE], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'senders_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function SendersPage() {
  const [uploading, setUploading]       = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError]   = useState('');

  const [senders, setSenders]           = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading]           = useState(false);
  const [listError, setListError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [deletingId, setDeletingId]     = useState(null);

  const fetchSenders = useCallback(async (page = 1) => {
    setLoading(true);
    setListError('');
    try {
      const res = await listSenders({ page, limit: pagination.limit, status: statusFilter || undefined });
      setSenders(res.data);
      setPagination(p => ({ ...p, ...res.pagination }));
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.limit]);

  useEffect(() => { fetchSenders(1); }, [statusFilter]); // eslint-disable-line

  const handleUpload = async (file) => {
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    try {
      const result = await uploadSenders(file);
      setUploadResult(result);
      fetchSenders(1);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Deactivate sender "${email}"?`)) return;
    setDeletingId(id);
    try {
      await deleteSender(id);
      fetchSenders(pagination.page);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon">
          <Send size={20} strokeWidth={2} />
        </div>
        <div className="page-header-text">
          <h1>Senders</h1>
          <p>Import sender email addresses in bulk via CSV or Excel file.</p>
        </div>
      </div>

      {/* ── Upload Card ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon upload">
              <Upload size={15} strokeWidth={2} />
            </div>
            Upload Senders File
          </div>
        </div>

        <FileUploader
          onUpload={handleUpload}
          uploading={uploading}
          templateHint={
            <span>
              Not sure about the format?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); }}>
                <Download size={12} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                Download template CSV
              </a>
              {' '}— required: <code>name</code>, <code>email</code>; optional: <code>reply_to</code>
            </span>
          }
        />

        {uploadError && (
          <div className="alert alert-error" style={{ marginTop: 14 }}>
            <XCircle size={15} strokeWidth={2} className="alert-icon" />
            {uploadError}
          </div>
        )}

        {uploadResult && (
          <UploadResult
            result={uploadResult}
            onDismiss={() => setUploadResult(null)}
          />
        )}
      </div>

      {/* ── List Card ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon list">
              <List size={15} strokeWidth={2} />
            </div>
            Senders
            {!loading && (
              <span className="card-count">
                ({pagination.total.toLocaleString()} total)
              </span>
            )}
          </div>

          <div className="filters">
            <span className="filter-label">Status:</span>
            <select
              className="select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="sender-status-filter"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchSenders(pagination.page)}
              disabled={loading}
              id="btn-refresh-senders"
            >
              {loading
                ? <span className="spinner spinner-dark" />
                : <RefreshCw size={13} strokeWidth={2} />
              }
              Refresh
            </button>
          </div>
        </div>

        {listError && (
          <div className="alert alert-error">
            <AlertCircle size={15} strokeWidth={2} className="alert-icon" />
            {listError}
          </div>
        )}

        {!loading && senders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Send size={26} strokeWidth={1.5} />
            </div>
            <h3>No senders found</h3>
            <p>Upload a CSV or Excel file above to get started.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Reply-To</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th style={{ width: 100 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j}>
                              <span style={{ background: 'var(--n-100)', display: 'block', height: 14, borderRadius: 4 }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : senders.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.name}</strong></td>
                          <td className="email-cell">{s.email}</td>
                          <td className="email-cell text-muted">{s.reply_to || '—'}</td>
                          <td><StatusBadge status={s.status} /></td>
                          <td className="text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td>
                            {s.status === 'active' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(s.id, s.email)}
                                disabled={deletingId === s.id}
                                id={`btn-delete-sender-${s.id}`}
                              >
                                {deletingId === s.id
                                  ? <span className="spinner" style={{ borderTopColor: 'var(--error)', borderColor: '#fecaca' }} />
                                  : <Trash2 size={13} strokeWidth={2} />
                                }
                                Deactivate
                              </button>
                            )}
                          </td>
                        </tr>
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
              onPage={(p) => fetchSenders(p)}
            />
          </>
        )}
      </div>
    </>
  );
}
