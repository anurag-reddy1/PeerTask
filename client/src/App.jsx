// client/src/App.jsx
// Client-side routes for both feature slices plus shared auth. Write-oriented
// pages (create/detail-with-actions) are wrapped in <ProtectedRoute>.
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// Slice 1 — Tasks & Offers
import BrowseTasks from "./pages/BrowseTasks/BrowseTasks.jsx";
import CreateTask from "./pages/CreateTask.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import MyTasks from "./pages/MyTasks.jsx";
import MyOffers from "./pages/MyOffers.jsx";

// Slice 2 — Listings & Bookings
import BrowseListings from "./pages/BrowseListings/BrowseListings.jsx";
import CreateListing from "./pages/CreateListing.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import MyListings from "./pages/MyListings.jsx";
import MyBookings from "./pages/MyBookings.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Slice 1 — Tasks */}
        <Route path="/tasks" element={<BrowseTasks />} />
        <Route
          path="/tasks/new"
          element={
            <ProtectedRoute>
              <CreateTask />
            </ProtectedRoute>
          }
        />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route
          path="/my/tasks"
          element={
            <ProtectedRoute>
              <MyTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my/offers"
          element={
            <ProtectedRoute>
              <MyOffers />
            </ProtectedRoute>
          }
        />

        {/* Slice 2 — Listings */}
        <Route path="/listings" element={<BrowseListings />} />
        <Route
          path="/listings/new"
          element={
            <ProtectedRoute>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route
          path="/my/listings"
          element={
            <ProtectedRoute>
              <MyListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my/bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
