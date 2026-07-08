// client/src/components/Layout.jsx
// App shell: shared navbar on top, routed page content inside a Bootstrap
// Container.
import PropTypes from "prop-types";
import { Container } from "react-bootstrap";
import Nav from "./Nav/Nav.jsx";

export default function Layout({ children }) {
  return (
    <>
      <Nav />
      <Container className="pb-5">{children}</Container>
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};
