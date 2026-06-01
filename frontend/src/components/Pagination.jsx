import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination component.
 *
 * Props:
 *   page        — current page (1-based)
 *   totalPages  — total page count
 *   total       — total record count (for display)
 *   limit       — page size (for display)
 *   onPage(n)   — callback when user navigates
 */
export default function Pagination({ page, totalPages, total, limit, onPage }) {
  if (!totalPages || totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span>
        Showing <strong>{start.toLocaleString()}–{end.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong>
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPage(1)}
          disabled={page <= 1}
          title="First page"
        >
          <ChevronsLeft size={14} strokeWidth={2} />
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          title="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>

        <span className="pagination-btn active" style={{ minWidth: 80, textAlign: 'center', cursor: 'default' }}>
          {page} / {totalPages}
        </span>

        <button
          className="pagination-btn"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          title="Next page"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPage(totalPages)}
          disabled={page >= totalPages}
          title="Last page"
        >
          <ChevronsRight size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
