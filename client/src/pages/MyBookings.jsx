// client/src/pages/MyBookings.jsx
// Bookings requested by the current user. GET /api/bookings/mine.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Row, Col, Card, Badge, Spinner } from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtRange, fmtDate, statusVariant } from "../services/fmt.js";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function MyBookings() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/bookings/mine");
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
      <h1 className="h3 mb-3">My Bookings</h1>
      <ErrorMessage error={error} />
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted">
          You haven&apos;t requested any bookings yet.
        </p>
      ) : (
        <Row className="g-3">
          {items.map((b) => (
            <Col md={6} lg={4} key={b._id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <Card.Title className="h6 mb-1">
                      {b.listingId ? (
                        <Link to={`/listings/${b.listingId}`}>
                          {b.listing?.title || "Listing"}
                        </Link>
                      ) : (
                        b.listing?.title || "Listing"
                      )}
                    </Card.Title>
                    <Badge bg={statusVariant(b.status)}>{b.status}</Badge>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center small text-muted">
                    {b.listing?.category && (
                      <Badge bg="light" text="dark">
                        {b.listing.category}
                      </Badge>
                    )}
                    <span>🕓 {fmtRange(b.requestedSlot)}</span>
                    <span>{fmtDate(b.createdAt)}</span>
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
