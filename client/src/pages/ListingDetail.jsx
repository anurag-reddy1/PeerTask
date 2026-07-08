// client/src/pages/ListingDetail.jsx
// Listing detail: availability, a booking-request form (non-owners), and
// confirm/cancel controls. A double-booked slot surfaces as a 409 banner.
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  Form,
  Button,
  Badge,
  ListGroup,
  Row,
  Col,
  Spinner,
} from "react-bootstrap";
import { api } from "../services/api.js";
import { fmtRange, fmtDate, statusVariant } from "../services/fmt.js";
import { useAuth } from "../hooks/useAuth.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [slot, setSlot] = useState({ start: "", end: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/listings/${id}`);
      setListing(res.listing);
      setBookings(res.bookings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }
  if (!listing) return <ErrorMessage error={error} />;

  const isOwner = user && listing.providerId === user._id;

  async function requestBooking(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/api/listings/${id}/bookings`, { requestedSlot: slot });
      setSlot({ start: "", end: "" });
      await load();
    } catch (err) {
      setError(err);
    }
  }

  // Confirm/cancel a booking.
  async function respond(bookingId, status) {
    setError(null);
    try {
      await api.put(`/api/listings/${id}/bookings/${bookingId}`, { status });
      await load();
    } catch (err) {
      setError(err); // 409 if the slot was already confirmed for someone else
    }
  }

  async function deleteListing() {
    setError(null);
    try {
      await api.del(`/api/listings/${id}`);
      navigate("/my/listings");
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div>
      <Link to="/listings" className="d-inline-block mb-3 text-muted">
        ← Back to listings
      </Link>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start gap-2">
            <Card.Title as="h1" className="h3">
              {listing.title}
            </Card.Title>
            <Badge bg="primary">${listing.rate}/hr</Badge>
          </div>
          <Card.Text>{listing.description}</Card.Text>
          <Badge bg="light" text="dark" className="mb-2">
            {listing.category}
          </Badge>
          <h3 className="h6 mt-2">Availability</h3>
          <ul className="text-muted mb-0">
            {listing.availabilitySlots?.map((s, i) => (
              <li key={i}>🕓 {fmtRange(s)}</li>
            ))}
          </ul>
          {isOwner && (
            <div className="mt-3">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={deleteListing}
              >
                Delete listing
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Booking request form — logged-in non-owners. */}
      {user && !isOwner && (
        <Card className="shadow-sm mb-3">
          <Card.Body>
            <Card.Title as="h2" className="h5">
              Request a booking
            </Card.Title>
            <ErrorMessage error={error} />
            <Form onSubmit={requestBooking}>
              <Row className="g-2 align-items-end">
                <Col sm={5}>
                  <Form.Label>Start</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={slot.start}
                    onChange={(e) =>
                      setSlot({ ...slot, start: e.target.value })
                    }
                    required
                  />
                </Col>
                <Col sm={5}>
                  <Form.Label>End</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={slot.end}
                    onChange={(e) => setSlot({ ...slot, end: e.target.value })}
                    required
                  />
                </Col>
                <Col sm={2}>
                  <Button type="submit" variant="primary">
                    Request
                  </Button>
                </Col>
              </Row>
            </Form>
            <p className="text-muted small mt-2 mb-0">
              Your slot must fall inside one of the availability windows above.
            </p>
          </Card.Body>
        </Card>
      )}

      {!user && (
        <p className="text-muted">
          <Link to="/login">Log in</Link> to request a booking.
        </p>
      )}

      {/* Bookings list — owner sees confirm/cancel; requesters can cancel theirs. */}
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title as="h2" className="h5">
            Bookings ({bookings.length})
          </Card.Title>
          {(isOwner || user) && <ErrorMessage error={error} />}
          {bookings.length === 0 ? (
            <p className="text-muted mb-0">No bookings yet.</p>
          ) : (
            <ListGroup variant="flush">
              {bookings.map((b) => (
                <ListGroup.Item
                  key={b._id}
                  className="d-flex justify-content-between align-items-start gap-2"
                >
                  <div>
                    <strong>{b.requester?.name || "Unknown"}</strong>{" "}
                    <Badge bg={statusVariant(b.status)}>{b.status}</Badge>
                    <p className="mb-1">🕓 {fmtRange(b.requestedSlot)}</p>
                    <span className="text-muted small">
                      {fmtDate(b.createdAt)}
                    </span>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    {isOwner && b.status === "pending" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => respond(b._id, "confirmed")}
                      >
                        Confirm
                      </Button>
                    )}
                    {(isOwner || (user && b.requesterId === user._id)) &&
                      b.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => respond(b._id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
