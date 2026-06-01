import {
  CheckCircle2, XCircle, Hash, PlusCircle, RefreshCw,
  AlertTriangle, X, FileDigit
} from 'lucide-react';

/**
 * UploadResult — shows summary stats + error rows after a file upload.
 *
 * Props:
 *   result    — the API response object { success, summary, errors, logId, message }
 *   onDismiss — called when user clicks Dismiss
 */
export default function UploadResult({ result, onDismiss }) {
  if (!result) return null;

  const { summary, errors = [], message } = result;

  return (
    <div style={{ marginTop: 22 }}>
      {/* Overall message */}
      <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
        {result.success
          ? <CheckCircle2 size={15} strokeWidth={2} className="alert-icon" />
          : <XCircle      size={15} strokeWidth={2} className="alert-icon" />
        }
        <span>{message}</span>
      </div>

      {/* Summary stat cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card total">
            <div className="stat-icon">
              <Hash size={15} strokeWidth={2.5} />
            </div>
            <div className="value">{summary.total.toLocaleString()}</div>
            <div className="label">Total Rows</div>
          </div>
          <div className="summary-card inserted">
            <div className="stat-icon">
              <PlusCircle size={15} strokeWidth={2.5} />
            </div>
            <div className="value">{summary.inserted.toLocaleString()}</div>
            <div className="label">Inserted</div>
          </div>
          <div className="summary-card updated">
            <div className="stat-icon">
              <RefreshCw size={15} strokeWidth={2.5} />
            </div>
            <div className="value">{summary.updated.toLocaleString()}</div>
            <div className="label">Updated</div>
          </div>
          <div className="summary-card errors">
            <div className="stat-icon">
              <XCircle size={15} strokeWidth={2.5} />
            </div>
            <div className="value">{summary.errors.toLocaleString()}</div>
            <div className="label">Errors</div>
          </div>
        </div>
      )}

      {/* Error table */}
      {errors.length > 0 && (
        <div className="error-section">
          <div className="error-section-title">
            <AlertTriangle size={14} strokeWidth={2.5} />
            {errors.length} row{errors.length !== 1 ? 's' : ''} could not be imported
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
                {errors.map((err, i) => (
                  <tr key={i} className="error-row">
                    <td><strong>{err.row || '—'}</strong></td>
                    <td className="email-cell">{err.email || <span className="text-muted">—</span>}</td>
                    <td className="error-reason">{err.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="result-footer">
        <button className="btn btn-secondary btn-sm" onClick={onDismiss} id="btn-dismiss-result">
          <X size={13} strokeWidth={2.5} />
          Dismiss
        </button>
        {result.logId && (
          <span className="result-log-id">
            <FileDigit size={13} strokeWidth={2} />
            Log ID: <code>{result.logId}</code>
          </span>
        )}
      </div>
    </div>
  );
}
