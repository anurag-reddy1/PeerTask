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
// Listing-specific input validation. These build on the generic validators
// (non-empty strings, positive rate, well-formed {start,end} slots) with the
// business rules particular to listings, and always throw ApiError(400, …) so
// the central error handler returns a clear message to the client.
// ---------------------------------------------------------------------------
const MAX_TITLE_LEN = 120;
const MAX_DESCRIPTION_LEN = 2000;
const MAX_CATEGORY_LEN = 60;
const MAX_RATE = 10000; // sanity ceiling on the hourly rate

// Enforce a maximum length on an already-trimmed, non-empty string field.
function requireBoundedString(value, field, max) {
  const str = requireNonEmptyString(value, field);
  if (str.length > max) {
    throw new ApiError(400, `"${field}" must be at most ${max} characters.`);
  }
  return str;
}

// Positive rate with a sane upper bound.
function requireRate(value) {
  const rate = requirePositiveNumber(value, "rate");
  if (rate > MAX_RATE) {
    throw new ApiError(400, `"rate" must be at most ${MAX_RATE}.`);
  }
  return rate;
}

// Availability rules beyond the basic {start,end} shape (start < end is already
// enforced by requireSlotArray): every slot must end in the future, and no two
// slots may overlap one another. `slots` is the parsed [{start:Date,end:Date}].
function requireValidAvailability(value) {
  const slots = requireSlotArray(value, "availabilitySlots");
  const now = new Date();
  for (const s of slots) {
    if (s.end <= now) {
      throw new ApiError(400, "Availability slots must end in the future.");
    }
  }
  // Sort by start and check neighbours for overlap.
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      throw new ApiError(
        400,
        "Availability slots must not overlap one another."
      );
    }
  }
  return slots;
}

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
    const title = requireBoundedString(req.body.title, "title", MAX_TITLE_LEN);
    const description = requireBoundedString(
      req.body.description,
      "description",
      MAX_DESCRIPTION_LEN
    );
    const category = requireBoundedString(
      req.body.category,
      "category",
      MAX_CATEGORY_LEN
    );
    const rate = requireRate(req.body.rate);
    const availabilitySlots = requireValidAvailability(
      req.body.availabilitySlots
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
      update.title = requireBoundedString(
        req.body.title,
        "title",
        MAX_TITLE_LEN
      );
    if (req.body.description !== undefined)
      update.description = requireBoundedString(
        req.body.description,
        "description",
        MAX_DESCRIPTION_LEN
      );
    if (req.body.category !== undefined)
      update.category = requireBoundedString(
        req.body.category,
        "category",
        MAX_CATEGORY_LEN
      );
    if (req.body.rate !== undefined) update.rate = requireRate(req.body.rate);
    if (req.body.availabilitySlots !== undefined)
      update.availabilitySlots = requireValidAvailability(
        req.body.availabilitySlots
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
