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

// Usability fix (issue: participants had to manually type start/end times for
// a booking, with no guarantee it fit the listing's availability). A slot is
// considered fully booked — and hidden from the picker — only when an existing
// CONFIRMED booking completely covers it (start <= slot.start && end >=
// slot.end). Partially-booked slots still show; the server remains the source
// of truth for any overlap once a request is actually submitted.
function isSlotFullyBooked(slot, confirmedSlots) {
  const s = new Date(slot.start).getTime();
  const e = new Date(slot.end).getTime();
  return (confirmedSlots || []).some((c) => {
    const cs = new Date(c.start).getTime();
    const ce = new Date(c.end).getTime();
    return cs <= s && ce >= e;
  });
}

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [bookings, setBookings] = useState([]);
  // Replaces the old free-typed { start, end } state: participants now pick
  // the index of one of the listing's own available slots.
  const [selectedSlot, setSelectedSlot] = useState("");
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

  // Only slots that aren't already fully booked are offered to the participant.
  const availableSlots = (listing.availabilitySlots || []).filter(
    (s) => !isSlotFullyBooked(s, listing.confirmedSlots)
  );

  async function requestBooking(e) {
    e.preventDefault();
    setError(null);
    if (selectedSlot === "") {
      setError({ status: 400, message: "Please choose an available time slot." });
      return;
    }
    const chosen = availableSlots[Number(selectedSlot)];
    try {
      await api.post(`/api/listings/${id}/bookings`, {
        requestedSlot: { start: chosen.start, end: chosen.end },
      });
      setSelectedSlot("");
      await load();
    } catch (err) {
      // A 409 here means the slot overlaps an already-confirmed booking. Show a
      // friendly, actionable message instead of a raw request failure.
      if (err.status === 409) {
        setError({
          status: 409,
          message:
            err.message ||
            "That time slot is already booked. Please pick a different time.",
        });
      } else {
        setError(err);
      }
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
            {availableSlots.length === 0 ? (
              <p className="text-muted mb-0">
                No open time slots right now — check back later.
              </p>
            ) : (
              <Form onSubmit={requestBooking}>
                <Row className="g-2 align-items-end">
                  <Col sm={9}>
                    <Form.Label>Choose an available time slot</Form.Label>
                    <Form.Select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select a slot…
                      </option>
                      {availableSlots.map((s, i) => (
                        <option key={i} value={i}>
                          {fmtRange(s)}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col sm={3}>
                    <Button type="submit" variant="primary">
                      Request
                    </Button>
                  </Col>
                </Row>
              </Form>
            )}
            <p className="text-muted small mt-2 mb-0">
              Only currently-open time slots are shown here — fully booked
              windows are hidden automatically.
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
                        variant="success"
                        onClick={() => respond(b._id, "confirmed")}
                      >
                        Confirm
                      </Button>
                    )}
                    {(isOwner || (user && b.requesterId === user._id)) &&
                      b.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline-danger"
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
