// client/src/main.jsx
// Client-side rendering entry point. Mounts <App/> into #root inside the router
// and the auth provider. This is a purely client-rendered SPA (no SSR).
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./hooks/useAuth.jsx";
// Bootstrap's stylesheet first (light theme = Bootstrap default), then our few
// small overrides on top.
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
