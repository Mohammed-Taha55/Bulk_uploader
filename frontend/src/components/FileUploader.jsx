import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';

const ACCEPTED = '.csv,.xls,.xlsx';
const MAX_MB   = 5;

/**
 * FileUploader
 * Props:
 *   onUpload(file) → Promise<result>  — called when user clicks Upload
 *   uploading      — bool, disables the button while in flight
 *   templateHint   — optional JSX/string shown below the zone
 */
export default function FileUploader({ onUpload, uploading = false, templateHint }) {
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setSizeError('');

    if (f.size > MAX_MB * 1024 * 1024) {
      setSizeError(`File too large. Maximum size is ${MAX_MB} MB.`);
      setFile(null);
      return;
    }

    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      setSizeError('Unsupported file type. Please use .csv, .xls, or .xlsx');
      setFile(null);
      return;
    }

    setFile(f);
  }, []);

  const handleInputChange = (e) => handleFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    await onUpload(file);
    // reset after upload
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClear = () => {
    setFile(null);
    setSizeError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        className={`uploader-zone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleInputChange}
          disabled={uploading}
          style={{ display: 'none' }}
          id="file-upload-input"
        />

        <div className="uploader-icon-wrap">
          <UploadCloud size={26} strokeWidth={1.5} />
        </div>

        <div className="uploader-title">
          {dragging ? 'Drop your file here' : 'Drag & drop or click to select'}
        </div>
        <div className="uploader-subtitle">
          Supports .csv, .xls, .xlsx — max {MAX_MB} MB
        </div>

        {file && (
          <div className="uploader-filename">
            <FileText size={13} strokeWidth={2} />
            {file.name}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}
      </div>

      {/* Client-side size/type error */}
      {sizeError && (
        <div className="alert alert-error" style={{ marginTop: 12 }}>
          <AlertCircle size={15} strokeWidth={2} className="alert-icon" />
          {sizeError}
        </div>
      )}

      {templateHint && <div className="template-hint">{templateHint}</div>}

      {/* Actions */}
      <div className="uploader-actions">
        <button
          id="btn-upload-file"
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <><span className="spinner" /> Uploading…</>
          ) : (
            <><UploadCloud size={15} strokeWidth={2} /> Upload File</>
          )}
        </button>

        {file && !uploading && (
          <button className="btn btn-secondary btn-sm" onClick={handleClear}>
            <X size={13} strokeWidth={2.5} />
            Clear
          </button>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="progress-wrap" style={{ marginTop: 14 }}>
          <div className="progress-bar" />
        </div>
      )}
    </div>
  );
}
