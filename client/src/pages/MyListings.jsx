// client/src/pages/MyListings.jsx
// Listings owned by the current user. GET /api/listings/mine/owned.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Badge, Button, Spinner } from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtRange } from "../services/fmt.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/listings/mine/owned");
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
        <h1 className="h3 mb-0">My Listings</h1>
        <Button as={Link} to="/listings/new" variant="primary" size="sm">
          New Listing
        </Button>
      </div>
      <ErrorMessage error={error} />
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted">You haven&apos;t created any listings yet.</p>
      ) : (
        <Row className="g-3">
          {items.map((l) => (
            <Col md={6} lg={4} key={l._id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <Card.Title className="h6 mb-1">
                      <Link to={`/listings/${l._id}`}>{l.title}</Link>
                    </Card.Title>
                    <Badge bg="primary">${l.rate}/hr</Badge>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center small text-muted">
                    <Badge bg="light" text="dark">
                      {l.category}
                    </Badge>
                    {l.availabilitySlots?.[0] && (
                      <span>🕓 {fmtRange(l.availabilitySlots[0])}</span>
                    )}
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
