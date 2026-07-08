// client/src/components/Pagination.jsx
// Simple prev/next pager driven by the { page, pages, total } the API returns.
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";

export default function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="d-flex align-items-center justify-content-center gap-3 mt-4">
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← Prev
      </Button>
      <span className="text-muted">
        Page {page} of {pages || 1} · {total} result{total === 1 ? "" : "s"}
      </span>
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Next →
      </Button>
    </div>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  pages: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPage: PropTypes.func.isRequired,
};
