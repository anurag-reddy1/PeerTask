// client/src/pages/MyTasks.jsx
// Tasks posted by the current user. GET /api/tasks/mine/posted.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Badge, Button, Spinner } from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtRange, statusVariant } from "../services/fmt.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function MyTasks() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/tasks/mine/posted");
        setItems(res.items);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">My Tasks</h1>
        <Button as={Link} to="/tasks/new" variant="primary" size="sm">
          Post Task
        </Button>
      </div>
      <ErrorMessage error={error} />
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted">You haven&apos;t posted any tasks yet.</p>
      ) : (
        <Row className="g-3">
          {items.map((t) => (
            <Col md={6} lg={4} key={t._id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <Card.Title className="h6 mb-1">
                      <Link to={`/tasks/${t._id}`}>{t.title}</Link>
                    </Card.Title>
                    <Badge bg={statusVariant(t.status)}>{t.status}</Badge>
                  </div>
                  <div className="small text-muted">💵 ${t.budget}</div>
                  <div className="small text-muted">📍 {t.location}</div>
                  <div className="small text-muted">
                    🕓 {fmtRange(t.timeWindow)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
