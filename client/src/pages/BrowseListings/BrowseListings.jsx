// client/src/pages/BrowseListings.jsx
// Browse available listings with filters (category, maxRate, availableAfter)
// and pagination. Hits GET /api/listings (aggregation pipeline).
import "./BrowseListings.css";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Form, Button, Badge, Spinner } from "react-bootstrap";
import { api, qs } from "../../services/api.js";
import { fmtRange } from "../../services/fmt.js";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import Pagination from "../../components/Pagination.jsx";

// Usability fix (issue: no way to compare multiple listings side by side, e.g.
// several airport-ride options). Cap comparisons at 3 so the table stays
// readable — this is a soft UX limit, not a server-enforced rule.
const MAX_COMPARE = 3;

export default function BrowseListings() {
  const [filters, setFilters] = useState({
    category: "",
    maxRate: "",
    availableAfter: "",
  });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, pages: 0, page: 1 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Compare feature state.
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  // Usability fix (issue: browsing that turned up nothing showed no
  // suggestions). When the filtered list is empty, fetch a small, unfiltered
  // set of listings as a fallback so the participant isn't stuck looking at
  // an empty page.
  const [suggested, setSuggested] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = qs({ ...applied, page, limit: 10 });
      const res = await api.get(`/api/listings${query}`);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch unfiltered suggestions only when the current (filtered) result set
  // is empty. Ignores category/maxRate/availableAfter entirely on purpose —
  // the point is to show *something* rather than nothing.
  useEffect(() => {
    if (loading) return;
    if (data.items.length > 0) {
      setSuggested([]);
      return;
    }
    let cancelled = false;
    setSuggestedLoading(true);
    api
      .get(`/api/listings${qs({ limit: 3 })}`)
      .then((res) => {
        if (!cancelled) setSuggested(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setSuggested([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, data.items.length]);

  function applyFilters(e) {
    e.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  }
  function clearFilters() {
    setFilters({ category: "", maxRate: "", availableAfter: "" });
    setApplied({});
    setPage(1);
  }

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev; // soft cap, ignore extra picks
      return [...prev, id];
    });
  }
  function clearCompare() {
    setCompareIds([]);
    setShowCompare(false);
  }

  return (
    <div>
      <h1 className="h3 mb-3">Browse Listings</h1>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Form onSubmit={applyFilters}>
            <Row className="g-3 align-items-end">
              <Col xs={12} md={3}>
                <Form.Group controlId="filter-category">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    value={filters.category}
                    onChange={set("category")}
                    placeholder="e.g. Tutoring"
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group controlId="filter-max-rate">
                  <Form.Label>Max rate ($/hr)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={filters.maxRate}
                    onChange={set("maxRate")}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group controlId="filter-available-after">
                  <Form.Label>Available after</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={filters.availableAfter}
                    onChange={set("availableAfter")}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={2} className="d-flex gap-2">
                <Button type="submit" variant="primary" size="sm">
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <ErrorMessage error={error} />

      {/* Compare bar — appears once 2+ listings are selected. */}
      {compareIds.length >= 2 && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="text-muted small">
            {compareIds.length} listing{compareIds.length > 1 ? "s" : ""}{" "}
            selected to compare{" "}
            {compareIds.length >= MAX_COMPARE && `(max ${MAX_COMPARE})`}
          </span>
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowCompare(true)}
            >
              Compare selected
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={clearCompare}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Inline comparison table. */}
      {showCompare && compareIds.length >= 2 && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <Card.Title className="h6 mb-0">
                Comparing {compareIds.length} listings
              </Card.Title>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => setShowCompare(false)}
              >
                Close
              </Button>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Rate</th>
                    <th>Category</th>
                    <th>Next availability</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items
                    .filter((l) => compareIds.includes(l._id))
                    .map((l) => (
                      <tr key={l._id}>
                        <td>
                          <Link to={`/listings/${l._id}`}>{l.title}</Link>
                        </td>
                        <td>${l.rate}/hr</td>
                        <td>{l.category}</td>
                        <td>
                          {l.availabilitySlots?.[0]
                            ? fmtRange(l.availabilitySlots[0])
                            : "—"}
                        </td>
                        <td>{l.pendingBookingCount}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : data.items.length === 0 ? (
        <div>
          <p className="text-muted">No listings match your filters.</p>
          {suggestedLoading ? (
            <div className="py-3">
              <Spinner animation="border" size="sm" />
            </div>
          ) : suggested.length > 0 ? (
            <>
              <p className="text-muted small mb-2">
                You might like these instead:
              </p>
              <Row className="g-3">
                {suggested.map((l) => (
                  <Col md={6} lg={4} key={l._id}>
                    <Card className="h-100 shadow-sm">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <Card.Title className="h6 mb-1">
                            <Link to={`/listings/${l._id}`}>{l.title}</Link>
                          </Card.Title>
                          <Badge bg="primary">${l.rate}/hr</Badge>
                        </div>
                        <Card.Text className="text-muted small clamp">
                          {l.description}
                        </Card.Text>
                        <Badge bg="light" text="dark">
                          {l.category}
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          ) : null}
        </div>
      ) : (
        <Row className="g-3">
          {data.items.map((l) => (
            <Col md={6} lg={4} key={l._id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <Card.Title className="h6 mb-1">
                      <Link to={`/listings/${l._id}`}>{l.title}</Link>
                    </Card.Title>
                    <Badge bg="primary">${l.rate}/hr</Badge>
                  </div>
                  <Card.Text className="text-muted small clamp">
                    {l.description}
                  </Card.Text>
                  <div className="d-flex flex-wrap gap-2 align-items-center small text-muted">
                    <Badge bg="light" text="dark">
                      {l.category}
                    </Badge>
                    {l.availabilitySlots?.[0] && (
                      <span>🕓 {fmtRange(l.availabilitySlots[0])}</span>
                    )}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                    <span>
                      {l.provider?.name} · {l.provider?.school}
                    </span>
                    <Badge bg="light" text="dark">
                      {l.pendingBookingCount} pending
                    </Badge>
                  </div>
                  <Form.Check
                    type="checkbox"
                    label="Compare"
                    className="small mt-2 mb-0"
                    checked={compareIds.includes(l._id)}
                    onChange={() => toggleCompare(l._id)}
                    disabled={
                      !compareIds.includes(l._id) &&
                      compareIds.length >= MAX_COMPARE
                    }
                  />
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Pagination
        page={data.page}
        pages={data.pages}
        total={data.total}
        onPage={setPage}
      />
    </div>
  );
}
