// server/server.js
// -----------------------------------------------------------------------------
// PeerTask HTTP server. Wires up express-session -> passport -> API routes ->
// static client -> central error handler. Frontend and backend are served
// SAME-ORIGIN: frontend and backend are served from the same origin, so no CORS is needed.
// -----------------------------------------------------------------------------
import express from "express";
import passport from "passport";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { connectDb } from "./config/db.js";
import { buildSession } from "./config/session.js";
import { configurePassport } from "./config/passport.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import taskRoutes, { offersRouter } from "./routes/taskRoutes.js";
import listingRoutes, { bookingsRouter } from "./routes/listingRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

async function start() {
  // 1) Connect to MongoDB before accepting traffic.
  await connectDb();

  const app = express();

  // 2) Parse JSON bodies (the frontend sends application/json via fetch).
  app.use(express.json());

  // 3) Sessions must be initialised BEFORE passport so passport can read/write
  //    the session. Order matters: session -> passport.initialize -> passport.session.
  app.use(buildSession());
  configurePassport(passport);
  app.use(passport.initialize());
  app.use(passport.session());

  // 4) API routes.
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/offers", offersRouter); // GET /api/offers/mine
  app.use("/api/listings", listingRoutes);
  app.use("/api/bookings", bookingsRouter); // GET /api/bookings/mine

  // Unknown /api/* -> JSON 404 (so the SPA fallback below doesn't swallow it).
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  // 5) In production, serve the built React client (same-origin). During dev the
  //    client runs on Vite (port 5173) and proxies /api here, so this block is
  //    simply skipped when the build output doesn't exist yet.
  const clientDist = path.resolve(__dirname, "../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback: any non-API GET returns index.html so client-side routing
    // works on refresh/deep-links. (RegExp avoids Express path-string parsing.)
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  // 6) Central error handler — must be registered LAST.
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`[server] PeerTask listening on http://localhost:${PORT}`);
    if (!fs.existsSync(clientDist)) {
      console.log(
        "[server] client/dist not found — run the Vite dev server (npm run client) or build (npm run build)."
      );
    }
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
