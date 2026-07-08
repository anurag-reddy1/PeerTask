// client/src/components/Nav.jsx
// Shared top navigation (React-Bootstrap Navbar). Links route to both feature
// slices; the right side shows auth state (login/register when logged out,
// name + logout when in).
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function AppNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <Navbar bg="white" expand="lg" className="border-bottom mb-4 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          Peer<span className="brand-accent">Task</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          {/* Left: browse links (+ authoring/my links when logged in). */}
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/tasks">
              Browse Tasks
            </Nav.Link>
            <Nav.Link as={NavLink} to="/listings">
              Browse Listings
            </Nav.Link>
            {user && (
              <>
                <Nav.Link as={NavLink} to="/tasks/new">
                  Post Task
                </Nav.Link>
                <Nav.Link as={NavLink} to="/listings/new">
                  New Listing
                </Nav.Link>
                <Nav.Link as={NavLink} to="/my/tasks">
                  My Tasks
                </Nav.Link>
                <Nav.Link as={NavLink} to="/my/offers">
                  My Offers
                </Nav.Link>
                <Nav.Link as={NavLink} to="/my/listings">
                  My Listings
                </Nav.Link>
                <Nav.Link as={NavLink} to="/my/bookings">
                  My Bookings
                </Nav.Link>
              </>
            )}
          </Nav>

          {/* Right: auth controls. */}
          <Nav className="align-items-lg-center">
            {user ? (
              <>
                <Navbar.Text className="me-2">{user.name}</Navbar.Text>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={NavLink} to="/login">
                  Login
                </Nav.Link>
                <Button size="sm" as={Link} to="/register" variant="primary">
                  Register
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
