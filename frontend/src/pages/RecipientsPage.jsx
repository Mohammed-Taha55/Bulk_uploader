import { useState, useEffect, useCallback } from 'react';
import {
  Users, Upload, List, RefreshCw, Download,
  Search, X, AlertCircle, XCircle
} from 'lucide-react';
import { uploadRecipients, listRecipients, updateRecipientStatus } from '../api/recipients.js';
import FileUploader from '../components/FileUploader.jsx';
import UploadResult from '../components/UploadResult.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';

const RECIPIENT_TEMPLATE = `name,email,tags\nAlice Johnson,alice@example.com,"newsletter,vip"\nBob Smith,bob@example.com,newsletter\nCharlie Brown,charlie@example.com,`;

function downloadTemplate() {
  const blob = new Blob([RECIPIENT_TEMPLATE], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'recipients_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function RecipientsPage() {
  const [uploading, setUploading]       = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError]   = useState('');

  const [recipients, setRecipients]     = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading]           = useState(false);
  const [listError, setListError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter]       = useState('');
  const [tagInput, setTagInput]         = useState('');

  const [updatingId, setUpdatingId]     = useState(null);

  const fetchRecipients = useCallback(async (page = 1) => {
    setLoading(true);
    setListError('');
    try {
      const res = await listRecipients({
        page,
        limit:  pagination.limit,
        status: statusFilter || undefined,
        tag:    tagFilter    || undefined,
      });
      setRecipients(res.data);
      setPagination(p => ({ ...p, ...res.pagination }));
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tagFilter, pagination.limit]);

  useEffect(() => { fetchRecipients(1); }, [statusFilter, tagFilter]); // eslint-disable-line

  const handleUpload = async (file) => {
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    try {
      const result = await uploadRecipients(file);
      setUploadResult(result);
      fetchRecipients(1);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id, email, newStatus) => {
    if (!window.confirm(`Change "${email}" status to "${newStatus}"?`)) return;
    setUpdatingId(id);
    try {
      await updateRecipientStatus(id, newStatus);
      fetchRecipients(pagination.page);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const applyTagFilter = () => { setTagFilter(tagInput.trim()); };
  const clearTagFilter = () => { setTagFilter(''); setTagInput(''); };

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-icon">
          <Users size={20} strokeWidth={2} />
        </div>
        <div className="page-header-text">
          <h1>Recipients</h1>
          <p>Import recipient email addresses in bulk via CSV or Excel file.</p>
        </div>
      </div>

      {/* ── Upload Card ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon upload">
              <Upload size={15} strokeWidth={2} />
            </div>
            Upload Recipients File
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
              {' '}— required: <code>email</code>; optional: <code>name</code>, <code>tags</code> (comma-separated), extra columns saved as metadata
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
            Recipients
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
              id="recipient-status-filter"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>

            <span className="filter-label">Tag:</span>
            <input
              className="input-sm"
              placeholder="e.g. newsletter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyTagFilter()}
              style={{ width: 130 }}
              id="recipient-tag-filter"
            />
            <button className="btn btn-secondary btn-sm" onClick={applyTagFilter}>
              <Search size={13} strokeWidth={2} />
              Filter
            </button>
            {tagFilter && (
              <button className="btn btn-secondary btn-sm" onClick={clearTagFilter}>
                <X size={13} strokeWidth={2.5} />
                Clear
              </button>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchRecipients(pagination.page)}
              disabled={loading}
              id="btn-refresh-recipients"
            >
              {loading
                ? <span className="spinner spinner-dark" />
                : <RefreshCw size={13} strokeWidth={2} />
              }
            </button>
          </div>
        </div>

        {listError && (
          <div className="alert alert-error">
            <AlertCircle size={15} strokeWidth={2} className="alert-icon" />
            {listError}
          </div>
        )}

        {!loading && recipients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={26} strokeWidth={1.5} />
            </div>
            <h3>No recipients found</h3>
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
                    <th>Tags</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th style={{ width: 150 }}>Action</th>
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
                    : recipients.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name || <span className="text-muted">—</span>}</td>
                          <td className="email-cell">{r.email}</td>
                          <td>
                            {r.tags?.length > 0 ? (
                              <div className="tag-list">
                                {r.tags.map(t => <span key={t} className="tag">{t}</span>)}
                              </div>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                          <td className="text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td>
                            <select
                              className="select-sm"
                              value={r.status}
                              disabled={updatingId === r.id}
                              onChange={(e) => handleStatusChange(r.id, r.email, e.target.value)}
                              id={`status-select-${r.id}`}
                            >
                              <option value="active">Active</option>
                              <option value="unsubscribed">Unsubscribed</option>
                              <option value="bounced">Bounced</option>
                            </select>
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
              onPage={(p) => fetchRecipients(p)}
            />
          </>
        )}
      </div>
    </>
  );
}
