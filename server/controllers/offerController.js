// server/controllers/offerController.js
// -----------------------------------------------------------------------------
// TaskOffers. Submit an offer, accept or decline it, and withdraw a pending offer.
// -----------------------------------------------------------------------------
import { collections } from "../config/db.js";
import { toObjectId } from "../utils/ids.js";
import {
  ApiError,
  requireNonEmptyString,
  requireOneOf,
} from "../middleware/validation.js";

// POST /api/tasks/:id/offers — submit an offer (auth, not on your own task).
export async function submitOffer(req, res, next) {
  try {
    const taskId = toObjectId(req.params.id, "task id");
    const message = requireNonEmptyString(req.body.message, "message");

    const task = await collections.tasks().findOne({ _id: taskId });
    if (!task) throw new ApiError(404, "Task not found.");

    // Cannot offer on your own task.
    if (task.posterId.equals(req.user._id)) {
      throw new ApiError(403, "You cannot make an offer on your own task.");
    }
    // Cannot offer on a task that is no longer open.
    if (task.status !== "open") {
      throw new ApiError(409, "This task is no longer accepting offers.");
    }
    // Prevent duplicate active offers from the same helper.
    const existing = await collections.taskOffers().findOne({
      taskId,
      helperId: req.user._id,
      status: "pending",
    });
    if (existing) {
      throw new ApiError(409, "You already have a pending offer on this task.");
    }

    const doc = {
      taskId,
      helperId: req.user._id,
      message,
      status: "pending",
      createdAt: new Date(),
    };
    const result = await collections.taskOffers().insertOne(doc);
    res.status(201).json({ offer: { ...doc, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/tasks/:id/offers/:offerId — accept or decline an offer.
// Only the task poster may do this.
//
// The accept path is atomic: the open→matched flip uses a single findOneAndUpdate
// filtered on { status: 'open' }. Only one concurrent request can match that
// filter — the first wins; any later attempt returns null and gets a 409.
export async function respondToOffer(req, res, next) {
  try {
    const taskId = toObjectId(req.params.id, "task id");
    const offerId = toObjectId(req.params.offerId, "offer id");
    // Allowed target states for this endpoint.
    const status = requireOneOf(
      req.body.status,
      ["accepted", "declined"],
      "status"
    );

    const task = await collections.tasks().findOne({ _id: taskId });
    if (!task) throw new ApiError(404, "Task not found.");

    // Only the poster controls acceptance/decline.
    if (!task.posterId.equals(req.user._id)) {
      throw new ApiError(403, "Only the poster can respond to offers.");
    }

    const offer = await collections
      .taskOffers()
      .findOne({ _id: offerId, taskId });
    if (!offer) throw new ApiError(404, "Offer not found for this task.");
    // Legal transition: you can only act on a still-pending offer.
    if (offer.status !== "pending") {
      throw new ApiError(409, `Offer is already "${offer.status}".`);
    }

    // -------------------- DECLINE (no task state change) -------------------
    if (status === "declined") {
      await collections
        .taskOffers()
        .updateOne({ _id: offerId }, { $set: { status: "declined" } });
      return res.json({ ok: true, offerStatus: "declined" });
    }

    // ----------------------------- ACCEPT ----------------------------------
    // ATOMIC guard: flip open -> matched only if it is STILL open. Whoever wins
    // this update owns the match; a concurrent accept will not match the filter.
    const flip = await collections.tasks().findOneAndUpdate(
      { _id: taskId, status: "open" }, // <-- the race guard
      { $set: { status: "matched", matchedOfferId: offerId } },
      { returnDocument: "after" }
    );
    // In driver v6+, findOneAndUpdate returns the document directly (null if no
    // match). Normalise to support the legacy { value } shape too.
    const wonTask = flip?.value !== undefined ? flip.value : flip;

    if (!wonTask) {
      // Someone else already matched this task -> conflict.
      throw new ApiError(
        409,
        "This task has already been matched to another offer."
      );
    }

    // We won the race: mark THIS offer accepted and decline all other pendings.
    await collections
      .taskOffers()
      .updateOne({ _id: offerId }, { $set: { status: "accepted" } });
    await collections
      .taskOffers()
      .updateMany(
        { taskId, _id: { $ne: offerId }, status: "pending" },
        { $set: { status: "declined" } }
      );

    res.json({ ok: true, offerStatus: "accepted", taskStatus: "matched" });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tasks/:id/offers/:offerId — withdraw your OWN pending offer.
export async function withdrawOffer(req, res, next) {
  try {
    const taskId = toObjectId(req.params.id, "task id");
    const offerId = toObjectId(req.params.offerId, "offer id");

    const offer = await collections
      .taskOffers()
      .findOne({ _id: offerId, taskId });
    if (!offer) throw new ApiError(404, "Offer not found for this task.");

    // Only the helper who made the offer can withdraw it.
    if (!offer.helperId.equals(req.user._id)) {
      throw new ApiError(403, "You can only withdraw your own offer.");
    }
    // Only pending offers can be withdrawn (can't un-accept a matched task here).
    if (offer.status !== "pending") {
      throw new ApiError(
        409,
        `Cannot withdraw an offer that is "${offer.status}".`
      );
    }

    await collections
      .taskOffers()
      .updateOne({ _id: offerId }, { $set: { status: "withdrawn" } });
    res.json({ ok: true, offerStatus: "withdrawn" });
  } catch (err) {
    next(err);
  }
}

// GET /api/offers/mine — offers made by the current user (My Offers page).
export async function myOffers(req, res, next) {
  try {
    // Join minimal task info so the UI can show what each offer is for.
    const offers = await collections
      .taskOffers()
      .aggregate([
        { $match: { helperId: req.user._id } },
        {
          $lookup: {
            from: "Tasks",
            localField: "taskId",
            foreignField: "_id",
            as: "task",
          },
        },
        { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            message: 1,
            status: 1,
            createdAt: 1,
            taskId: 1,
            "task.title": 1,
            "task.status": 1,
            "task.budget": 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();
    res.json({ items: offers });
  } catch (err) {
    next(err);
  }
}
