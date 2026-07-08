// client/src/pages/BrowseTasks.jsx
// Browse open tasks with filters (budget range, location, availableAfter) and
// pagination. Hits GET /api/tasks, which runs the aggregation pipeline.
import "./BrowseTasks.css";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Form, Button, Badge, Spinner } from "react-bootstrap";
import { api, qs } from "../../services/api.js";
import { fmtRange } from "../../services/fmt.js";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import Pagination from "../../components/Pagination.jsx";

export default function BrowseTasks() {
  // Filter form state (kept separate from the "applied" filters used to query).
  const [filters, setFilters] = useState({
    minBudget: "",
    maxBudget: "",
    location: "",
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
      const res = await api.get(`/api/tasks${query}`);
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
    setPage(1); // reset to first page when filters change
    setApplied({ ...filters });
  }

  function clearFilters() {
    setFilters({
      minBudget: "",
      maxBudget: "",
      location: "",
      availableAfter: "",
    });
    setApplied({});
    setPage(1);
  }

  return (
    <div>
      <h1 className="h3 mb-3">Browse Tasks</h1>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Form onSubmit={applyFilters}>
            <Row className="g-3 align-items-end">
              <Col xs={6} md={2}>
                <Form.Label>Min budget</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={filters.minBudget}
                  onChange={set("minBudget")}
                />
              </Col>
              <Col xs={6} md={2}>
                <Form.Label>Max budget</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={filters.maxBudget}
                  onChange={set("maxBudget")}
                />
              </Col>
              <Col xs={12} md={3}>
                <Form.Label>Location</Form.Label>
                <Form.Control
                  value={filters.location}
                  onChange={set("location")}
                  placeholder="e.g. Snell"
                />
              </Col>
              <Col xs={12} md={3}>
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
        <p className="text-muted">No open tasks match your filters.</p>
      ) : (
        <Row className="g-3">
          {data.items.map((t) => (
            <Col md={6} lg={4} key={t._id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <Card.Title className="h6 mb-1">
                      <Link to={`/tasks/${t._id}`}>{t.title}</Link>
                    </Card.Title>
                    <Badge bg="primary">${t.budget}</Badge>
                  </div>
                  <Card.Text className="text-muted small clamp">
                    {t.description}
                  </Card.Text>
                  <div className="small text-muted">📍 {t.location}</div>
                  <div className="small text-muted">
                    🕓 {fmtRange(t.timeWindow)}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                    <span>
                      {t.poster?.name} · {t.poster?.school}
                    </span>
                    <Badge bg="light" text="dark">
                      {t.pendingOfferCount} pending
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
