// client/src/components/Layout.jsx
// App shell: shared navbar on top, routed page content inside a Bootstrap
// Container.
import PropTypes from "prop-types";
import { Container } from "react-bootstrap";
import Nav from "./Nav/Nav.jsx";

export default function Layout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header>
        <Nav />
      </header>
      <main id="main-content">
        <Container className="pb-5">{children}</Container>
      </main>
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};
