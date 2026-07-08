// client/src/pages/MyOffers.jsx
// Offers the current user has made. GET /api/offers/mine.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Badge, Spinner } from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtDate, statusVariant } from "../services/fmt.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function MyOffers() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/offers/mine");
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
      <h1 className="h3 mb-3">My Offers</h1>
      <ErrorMessage error={error} />
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted">You haven&apos;t made any offers yet.</p>
      ) : (
        <Row className="g-3">
          {items.map((o) => (
            <Col md={6} lg={4} key={o._id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <Card.Title className="h6 mb-1">
                      {o.taskId ? (
                        <Link to={`/tasks/${o.taskId}`}>
                          {o.task?.title || "Task"}
                        </Link>
                      ) : (
                        o.task?.title || "Task"
                      )}
                    </Card.Title>
                    <Badge bg={statusVariant(o.status)}>{o.status}</Badge>
                  </div>
                  <Card.Text>{o.message}</Card.Text>
                  <div className="d-flex flex-wrap gap-3 small text-muted">
                    {o.task?.budget != null && <span>💵 ${o.task.budget}</span>}
                    {o.task?.status && <span>task: {o.task.status}</span>}
                    <span>{fmtDate(o.createdAt)}</span>
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
