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

  return (
    <div>
      <h1 className="h3 mb-3">Browse Listings</h1>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Form onSubmit={applyFilters}>
            <Row className="g-3 align-items-end">
              <Col xs={12} md={3}>
                <Form.Label>Category</Form.Label>
                <Form.Control
                  value={filters.category}
                  onChange={set("category")}
                  placeholder="e.g. Tutoring"
                />
              </Col>
              <Col xs={6} md={3}>
                <Form.Label>Max rate ($/hr)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={filters.maxRate}
                  onChange={set("maxRate")}
                />
              </Col>
              <Col xs={12} md={4}>
                <Form.Label>Available after</Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={filters.availableAfter}
                  onChange={set("availableAfter")}
                />
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
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="text-muted">No listings match your filters.</p>
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
