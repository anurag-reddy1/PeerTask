// client/src/pages/BrowseTasks.jsx
// Browse open tasks with filters (budget range, location, availableAfter) and
// pagination. Hits GET /api/tasks, which runs the aggregation pipeline.
import "./BrowseTasks.css";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Spinner,
  ListGroup,
} from "react-bootstrap";
import { api, qs } from "../../services/api.js";
import { fmtRange } from "../../services/fmt.js";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import Pagination from "../../components/Pagination.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";

// Usability fix (issue: the Budget badge didn't say whether it was per hour,
// per day, or a flat total). Falls back to a bare "$X" for tasks created
// before this field existed (budgetUnit undefined) so old seed data still
// renders correctly.
function formatBudget(t) {
  if (t.budgetUnit === "hourly") return `$${t.budget}/hr`;
  if (t.budgetUnit === "daily") return `$${t.budget}/day`;
  return `$${t.budget}`;
}

// How many location suggestions to show under the Search field at once.
const MAX_SUGGESTIONS = 6;

export default function BrowseTasks() {
  const { user } = useAuth();
  // Filter form state (kept separate from the "applied" filters used to query).
  const [filters, setFilters] = useState({
    search: "",
    minBudget: "",
    maxBudget: "",
    availableAfter: "",
  });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, pages: 0, page: 1 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Usability fix (asked for directly): as the participant types in Search,
  // suggest matching task LOCATIONS in a dropdown (e.g. typing "was" suggests
  // "Washington DC"), rather than making them type the whole thing blind.
  // Reuses the existing browse endpoint — no backend change needed.
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Debounced location-suggestion lookup, keyed on the typed search text.
  useEffect(() => {
    const term = filters.search.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await api.get(
          `/api/tasks${qs({ search: term, limit: 20 })}`
        );
        // The endpoint matches title OR location — narrow down to genuine
        // location matches here so the dropdown only suggests places.
        const locs = Array.from(
          new Set(
            (res.items || [])
              .map((t) => t.location)
              .filter(
                (loc) => loc && loc.toLowerCase().includes(term.toLowerCase())
              )
          )
        ).slice(0, MAX_SUGGESTIONS);
        setSuggestions(locs);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [filters.search]);

  function applyFilters(e) {
    e.preventDefault();
    setPage(1); // reset to first page when filters change
    setApplied({ ...filters });
  }

  function clearFilters() {
    setFilters({
      search: "",
      minBudget: "",
      maxBudget: "",
      availableAfter: "",
    });
    setApplied({});
    setPage(1);
    setSuggestions([]);
  }

  // Selecting a suggestion applies the filter immediately, rather than
  // requiring a separate click on Apply — that's the point of an autocomplete.
  function selectSuggestion(loc) {
    setFilters((f) => ({ ...f, search: loc }));
    setApplied((a) => ({ ...a, search: loc }));
    setPage(1);
    setShowSuggestions(false);
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Browse Tasks</h1>
        {user && (
          <Button as={Link} to="/tasks/new" variant="primary" size="sm">
            Post a Task
          </Button>
        )}
      </div>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Form onSubmit={applyFilters}>
            <Row className="g-3 align-items-end">
              <Col xs={12} md={3}>
                <Form.Group
                  controlId="filter-search"
                  className="position-relative"
                >
                  <Form.Label>Search</Form.Label>
                  <Form.Control
                    value={filters.search}
                    onChange={set("search")}
                    onFocus={() => setShowSuggestions(true)}
                    // Delay hiding so a click on a suggestion registers before
                    // the input's blur handler would otherwise hide the list.
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 150)
                    }
                    placeholder="Title or location"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ListGroup
                      className="position-absolute shadow-sm"
                      style={{ zIndex: 10, width: "100%", top: "100%" }}
                    >
                      {suggestions.map((loc) => (
                        <ListGroup.Item
                          key={loc}
                          action
                          onMouseDown={(e) => {
                            e.preventDefault(); // keep focus so onBlur doesn't race us
                            selectSuggestion(loc);
                          }}
                        >
                          📍 {loc}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Form.Group>
              </Col>
              <Col xs={6} md={2}>
                <Form.Group controlId="filter-min-budget">
                  <Form.Label>Min budget</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={filters.minBudget}
                    onChange={set("minBudget")}
                  />
                </Form.Group>
              </Col>
              <Col xs={6} md={2}>
                <Form.Group controlId="filter-max-budget">
                  <Form.Label>Max budget</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={filters.maxBudget}
                    onChange={set("maxBudget")}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={3}>
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
                    <Badge bg="primary">{formatBudget(t)}</Badge>
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
