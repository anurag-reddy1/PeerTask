// client/vite.config.js
// Dev server config. During development the React app runs on port 5173 and
// proxies all /api requests to the Express backend on port 3000. This keeps the
// browser talking to a SINGLE origin (Vite), so no CORS is ever needed — the
// session cookie is sent and received transparently.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward the API and its session cookies to the Express server.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
