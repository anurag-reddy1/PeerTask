// server/routes/listingRoutes.js
// SLICE 2 routes: Listings + Bookings. Every write route is auth-guarded.
import { Router } from "express";
import { authGuard } from "../middleware/authGuard.js";
import {
  browseListings,
  createListing,
  getListing,
  updateListing,
  deleteListing,
  myListings,
} from "../controllers/listingController.js";
import {
  requestBooking,
  respondToBooking,
  myBookings,
} from "../controllers/bookingController.js";

const router = Router();

// "My" collection — before "/:id".
router.get("/mine/owned", authGuard, myListings); // My Listings

// Listings
router.get("/", browseListings); // browse (aggregation) — public
router.post("/", authGuard, createListing); // create (auth)
router.get("/:id", getListing); // detail + availability — public
router.put("/:id", authGuard, updateListing); // edit (owner)
router.delete("/:id", authGuard, deleteListing); // delete (owner)

// Bookings (nested under a listing)
router.post("/:id/bookings", authGuard, requestBooking); // request booking
router.put("/:id/bookings/:bookingId", authGuard, respondToBooking); // confirm/cancel (atomic)

export default router;

// Separate router for "/api/bookings/mine" (My Bookings), mounted in server.js.
export const bookingsRouter = Router();
bookingsRouter.get("/mine", authGuard, myBookings);
