// server/controllers/bookingController.js
// -----------------------------------------------------------------------------
// Bookings. Request a booking, confirm or cancel it.
// -----------------------------------------------------------------------------
import { collections } from "../config/db.js";
import { toObjectId } from "../utils/ids.js";
import {
  ApiError,
  requireTimeRange,
  requireOneOf,
} from "../middleware/validation.js";

// POST /api/listings/:id/bookings — request a booking (auth, not own listing).
export async function requestBooking(req, res, next) {
  try {
    const listingId = toObjectId(req.params.id, "listing id");
    const requestedSlot = requireTimeRange(
      req.body.requestedSlot,
      "requestedSlot"
    );

    const listing = await collections.listings().findOne({ _id: listingId });
    if (!listing) throw new ApiError(404, "Listing not found.");

    // Cannot book your own listing.
    if (listing.providerId.equals(req.user._id)) {
      throw new ApiError(403, "You cannot book your own listing.");
    }

    // The requested slot must fall within one of the listing's availability
    // slots (start >= slot.start && end <= slot.end).
    const fitsAvailability = (listing.availabilitySlots || []).some((slot) => {
      const s = new Date(slot.start);
      const e = new Date(slot.end);
      return requestedSlot.start >= s && requestedSlot.end <= e;
    });
    if (!fitsAvailability) {
      throw new ApiError(
        400,
        "Requested slot is outside the listing availability."
      );
    }

    const doc = {
      listingId,
      requesterId: req.user._id,
      requestedSlot,
      status: "pending",
      createdAt: new Date(),
    };
    const result = await collections.bookings().insertOne(doc);
    res.status(201).json({ booking: { ...doc, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/listings/:id/bookings/:bookingId — confirm or cancel a booking.
//
// The confirm path is atomic: the slot is claimed with a single findOneAndUpdate
// whose filter includes a $not/$elemMatch overlap guard on listing.confirmedSlots.
// The first request pushes the slot; a concurrent request no longer matches the
// guard and receives a 409 — preventing double-booking.
export async function respondToBooking(req, res, next) {
  try {
    const listingId = toObjectId(req.params.id, "listing id");
    const bookingId = toObjectId(req.params.bookingId, "booking id");
    const status = requireOneOf(
      req.body.status,
      ["confirmed", "cancelled"],
      "status"
    );

    const listing = await collections.listings().findOne({ _id: listingId });
    if (!listing) throw new ApiError(404, "Listing not found.");

    const booking = await collections
      .bookings()
      .findOne({ _id: bookingId, listingId });
    if (!booking)
      throw new ApiError(404, "Booking not found for this listing.");

    const isOwner = listing.providerId.equals(req.user._id);
    const isRequester = booking.requesterId.equals(req.user._id);

    // -------------------------- CANCEL -------------------------------------
    // The listing owner OR the requester who made the booking may cancel it.
    if (status === "cancelled") {
      if (!isOwner && !isRequester) {
        throw new ApiError(
          403,
          "Only the owner or requester can cancel this booking."
        );
      }
      if (booking.status === "cancelled") {
        throw new ApiError(409, "Booking is already cancelled.");
      }

      // If this booking was confirmed, free its slot back up on the listing so
      // the slot can be booked again.
      if (booking.status === "confirmed") {
        await collections
          .listings()
          .updateOne(
            { _id: listingId },
            { $pull: { confirmedSlots: { bookingId } } }
          );
      }
      await collections
        .bookings()
        .updateOne({ _id: bookingId }, { $set: { status: "cancelled" } });
      return res.json({ ok: true, bookingStatus: "cancelled" });
    }

    // -------------------------- CONFIRM ------------------------------------
    // Only the listing owner may confirm a booking.
    if (!isOwner) {
      throw new ApiError(403, "Only the listing owner can confirm a booking.");
    }
    // Legal transition: only a pending booking can be confirmed.
    if (booking.status !== "pending") {
      throw new ApiError(409, `Booking is already "${booking.status}".`);
    }

    const start = new Date(booking.requestedSlot.start);
    const end = new Date(booking.requestedSlot.end);

    // ATOMIC slot claim: match this listing ONLY IF it has no confirmed slot
    // overlapping [start, end); then push our slot. The overlap guard is:
    //   NOT EXISTS a confirmed slot where slot.start < end AND slot.end > start
    const claim = await collections.listings().findOneAndUpdate(
      {
        _id: listingId,
        confirmedSlots: {
          $not: {
            $elemMatch: {
              start: { $lt: end }, // existing starts before ours ends
              end: { $gt: start }, // and ends after ours starts  => overlap
            },
          },
        },
      },
      { $push: { confirmedSlots: { bookingId, start, end } } },
      { returnDocument: "after" }
    );
    const wonSlot = claim?.value !== undefined ? claim.value : claim;

    if (!wonSlot) {
      // Another booking already holds an overlapping confirmed slot.
      throw new ApiError(
        409,
        "That time slot has already been confirmed for this listing."
      );
    }

    // We claimed the slot on the listing — now mark the booking confirmed.
    await collections
      .bookings()
      .updateOne({ _id: bookingId }, { $set: { status: "confirmed" } });

    res.json({ ok: true, bookingStatus: "confirmed" });
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/mine — bookings requested by the current user (My Bookings).
export async function myBookings(req, res, next) {
  try {
    const bookings = await collections
      .bookings()
      .aggregate([
        { $match: { requesterId: req.user._id } },
        {
          $lookup: {
            from: "Listings",
            localField: "listingId",
            foreignField: "_id",
            as: "listing",
          },
        },
        { $unwind: { path: "$listing", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            requestedSlot: 1,
            status: 1,
            createdAt: 1,
            listingId: 1,
            "listing.title": 1,
            "listing.category": 1,
            "listing.rate": 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();
    res.json({ items: bookings });
  } catch (err) {
    next(err);
  }
}
