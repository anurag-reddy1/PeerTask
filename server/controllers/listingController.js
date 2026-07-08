// server/controllers/listingController.js
// -----------------------------------------------------------------------------
// Listings. Browse (aggregation), create, detail (+availability), edit, delete.
// -----------------------------------------------------------------------------
import { collections } from "../config/db.js";
import { toObjectId } from "../utils/ids.js";
import {
  ApiError,
  requireNonEmptyString,
  requirePositiveNumber,
  requireSlotArray,
} from "../middleware/validation.js";

// ---------------------------------------------------------------------------
// GET /api/listings — browse AVAILABLE listings via an aggregation pipeline.
//
// Uses an aggregation pipeline: filters, joins a pending-booking count, joins
// the provider profile, hides passwordHash, sorts newest-first and paginates.
//
// Query params: category, maxRate, availableAfter, page, limit.
// A listing counts as "available" when it still has at least one availability
// slot (we treat an empty slot array as unavailable).
// ---------------------------------------------------------------------------
export async function browseListings(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (page - 1) * limit;

    // ---- Build the $match filter -------------------------------------------
    // "available" == has at least one availability slot.
    const match = { "availabilitySlots.0": { $exists: true } };

    // Exact category match (case-insensitive).
    if (req.query.category) {
      match.category = {
        $regex: `^${String(req.query.category).trim()}$`,
        $options: "i",
      };
    }
    // Max hourly rate.
    if (req.query.maxRate !== undefined && req.query.maxRate !== "") {
      match.rate = { $lte: Number(req.query.maxRate) };
    }
    // availableAfter: keep listings that have a slot starting on/after the date.
    if (req.query.availableAfter) {
      const after = new Date(req.query.availableAfter);
      if (!isNaN(after.getTime())) {
        match.availabilitySlots = { $elemMatch: { start: { $gte: after } } };
      }
    }

    const pipeline = [
      // STAGE 1: filter to available listings matching the optional filters.
      { $match: match },

      // STAGE 2: join Bookings and count the ones still pending for this listing.
      {
        $lookup: {
          from: "Bookings",
          let: { listingId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$listingId", "$$listingId"] },
                    { $eq: ["$status", "pending"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "pendingBookings",
        },
      },
      {
        $addFields: {
          pendingBookingCount: {
            $ifNull: [{ $arrayElemAt: ["$pendingBookings.count", 0] }, 0],
          },
        },
      },

      // STAGE 3: join the provider's public profile from Users.
      {
        $lookup: {
          from: "Users",
          localField: "providerId",
          foreignField: "_id",
          as: "provider",
        },
      },
      { $unwind: { path: "$provider", preserveNullAndEmptyArrays: true } },

      // STAGE 4: shape output — expose only provider name/school, drop the
      // joined arrays and the passwordHash.
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          rate: 1,
          availabilitySlots: 1,
          providerId: 1,
          createdAt: 1,
          pendingBookingCount: 1,
          "provider._id": 1,
          "provider.name": 1,
          "provider.school": 1,
        },
      },

      // STAGE 5: newest listings first.
      { $sort: { createdAt: -1 } },

      // STAGE 6: paginate + total count in one pass.
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await collections.listings().aggregate(pipeline).toArray();
    const items = result.items;
    const total = result.totalCount[0]?.count || 0;

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// POST /api/listings — create a listing (auth required).
export async function createListing(req, res, next) {
  try {
    const title = requireNonEmptyString(req.body.title, "title");
    const description = requireNonEmptyString(
      req.body.description,
      "description"
    );
    const category = requireNonEmptyString(req.body.category, "category");
    const rate = requirePositiveNumber(req.body.rate, "rate");
    const availabilitySlots = requireSlotArray(
      req.body.availabilitySlots,
      "availabilitySlots"
    );

    const doc = {
      title,
      description,
      category,
      rate,
      availabilitySlots,
      providerId: req.user._id,
      createdAt: new Date(),
      // Slots already locked by a confirmed booking (used by the atomic confirm guard).
      confirmedSlots: [],
    };
    const result = await collections.listings().insertOne(doc);
    res.status(201).json({ listing: { ...doc, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
}

// GET /api/listings/:id — listing detail + its bookings (with requester names).
export async function getListing(req, res, next) {
  try {
    const _id = toObjectId(req.params.id, "listing id");
    const listing = await collections.listings().findOne({ _id });
    if (!listing) throw new ApiError(404, "Listing not found.");

    const bookings = await collections
      .bookings()
      .aggregate([
        { $match: { listingId: _id } },
        {
          $lookup: {
            from: "Users",
            localField: "requesterId",
            foreignField: "_id",
            as: "requester",
          },
        },
        { $unwind: { path: "$requester", preserveNullAndEmptyArrays: true } },
        // Only expose requester name/school — never the passwordHash.
        {
          $project: {
            listingId: 1,
            requesterId: 1,
            requestedSlot: 1,
            status: 1,
            createdAt: 1,
            "requester._id": 1,
            "requester.name": 1,
            "requester.school": 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    res.json({ listing, bookings });
  } catch (err) {
    next(err);
  }
}

// PUT /api/listings/:id — edit a listing. Owner only.
export async function updateListing(req, res, next) {
  try {
    const _id = toObjectId(req.params.id, "listing id");
    const listing = await collections.listings().findOne({ _id });
    if (!listing) throw new ApiError(404, "Listing not found.");

    if (!listing.providerId.equals(req.user._id)) {
      throw new ApiError(403, "Only the owner can edit this listing.");
    }

    const update = {};
    if (req.body.title !== undefined)
      update.title = requireNonEmptyString(req.body.title, "title");
    if (req.body.description !== undefined)
      update.description = requireNonEmptyString(
        req.body.description,
        "description"
      );
    if (req.body.category !== undefined)
      update.category = requireNonEmptyString(req.body.category, "category");
    if (req.body.rate !== undefined)
      update.rate = requirePositiveNumber(req.body.rate, "rate");
    if (req.body.availabilitySlots !== undefined)
      update.availabilitySlots = requireSlotArray(
        req.body.availabilitySlots,
        "availabilitySlots"
      );

    if (Object.keys(update).length === 0) {
      throw new ApiError(400, "No valid fields to update.");
    }

    await collections.listings().updateOne({ _id }, { $set: update });
    const updated = await collections.listings().findOne({ _id });
    res.json({ listing: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/listings/:id — delete a listing. Owner only.
export async function deleteListing(req, res, next) {
  try {
    const _id = toObjectId(req.params.id, "listing id");
    const listing = await collections.listings().findOne({ _id });
    if (!listing) throw new ApiError(404, "Listing not found.");

    if (!listing.providerId.equals(req.user._id)) {
      throw new ApiError(403, "Only the owner can delete this listing.");
    }

    await collections.listings().deleteOne({ _id });
    // Clean up bookings attached to the removed listing.
    await collections.bookings().deleteMany({ listingId: _id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/listings/mine/owned — listings owned by the current user.
export async function myListings(req, res, next) {
  try {
    const listings = await collections
      .listings()
      .find({ providerId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ items: listings });
  } catch (err) {
    next(err);
  }
}
