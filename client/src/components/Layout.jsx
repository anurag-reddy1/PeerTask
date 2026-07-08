// client/src/components/Layout.jsx
// App shell: shared navbar on top, routed page content inside a Bootstrap
// Container.
import { Container } from "react-bootstrap";
import Nav from "./Nav.jsx";

export default function Layout({ children }) {
  return (
    <>
      <Nav />
      <Container className="pb-5">{children}</Container>
    </>
  );
}
