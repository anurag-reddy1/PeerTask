// server/controllers/taskController.js
// -----------------------------------------------------------------------------
// SLICE 1 — Tasks. Browse (aggregation), create, detail (+offers), edit, delete.
// -----------------------------------------------------------------------------
import { collections } from "../config/db.js";
import { toObjectId } from "../utils/ids.js";
import {
  ApiError,
  requireNonEmptyString,
  requirePositiveNumber,
  requireTimeRange,
} from "../middleware/validation.js";

// ---------------------------------------------------------------------------
// GET /api/tasks — browse OPEN tasks via an aggregation pipeline.
// The pipeline filters, joins a pending-offer count, joins the poster's public
// profile, hides passwordHash, sorts newest-first and paginates — all in one
// round trip.
//
// Query params: minBudget, maxBudget, location, availableAfter, page, limit.
// ---------------------------------------------------------------------------
export async function browseTasks(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (page - 1) * limit;

    // ---- Build the $match filter from optional query params ----------------
    const match = { status: "open" }; // only browse open tasks

    // Budget range filter (numbers arrive as strings on the query string).
    const budget = {};
    if (req.query.minBudget !== undefined && req.query.minBudget !== "") {
      budget.$gte = Number(req.query.minBudget);
    }
    if (req.query.maxBudget !== undefined && req.query.maxBudget !== "") {
      budget.$lte = Number(req.query.maxBudget);
    }
    if (Object.keys(budget).length) match.budget = budget;

    // Case-insensitive partial location match.
    if (req.query.location) {
      match.location = {
        $regex: String(req.query.location).trim(),
        $options: "i",
      };
    }

    // availableAfter: only tasks whose time window starts on/after the date.
    if (req.query.availableAfter) {
      const after = new Date(req.query.availableAfter);
      if (!isNaN(after.getTime())) {
        match["timeWindow.start"] = { $gte: after };
      }
    }

    const pipeline = [
      // STAGE 1: filter to open tasks matching the optional query filters.
      { $match: match },

      // STAGE 2: join TaskOffers and compute how many offers are still pending.
      // We use a sub-pipeline $lookup so we can filter to pending inside the join.
      {
        $lookup: {
          from: "TaskOffers",
          let: { taskId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$taskId", "$$taskId"] },
                    { $eq: ["$status", "pending"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "pendingOffers",
        },
      },
      // Flatten the count sub-array into a single number (0 when no offers).
      {
        $addFields: {
          pendingOfferCount: {
            $ifNull: [{ $arrayElemAt: ["$pendingOffers.count", 0] }, 0],
          },
        },
      },

      // STAGE 3: join the poster's public profile from Users.
      {
        $lookup: {
          from: "Users",
          localField: "posterId",
          foreignField: "_id",
          as: "poster",
        },
      },
      { $unwind: { path: "$poster", preserveNullAndEmptyArrays: true } },

      // STAGE 4: shape the output — expose only poster name/school, and DROP
      // both the joined arrays and (critically) the passwordHash.
      {
        $project: {
          title: 1,
          description: 1,
          budget: 1,
          timeWindow: 1,
          location: 1,
          status: 1,
          posterId: 1,
          createdAt: 1,
          pendingOfferCount: 1,
          "poster._id": 1,
          "poster.name": 1,
          "poster.school": 1,
        },
      },

      // STAGE 5: newest tasks first.
      { $sort: { createdAt: -1 } },

      // STAGE 6: paginate AND return the total count in one pass via $facet.
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await collections.tasks().aggregate(pipeline).toArray();
    const items = result.items;
    const total = result.totalCount[0]?.count || 0;

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// POST /api/tasks — create a task (auth required).
export async function createTask(req, res, next) {
  try {
    const title = requireNonEmptyString(req.body.title, "title");
    const description = requireNonEmptyString(
      req.body.description,
      "description"
    );
    const budget = requirePositiveNumber(req.body.budget, "budget");
    const timeWindow = requireTimeRange(req.body.timeWindow, "timeWindow");
    const location = requireNonEmptyString(req.body.location, "location");

    const doc = {
      title,
      description,
      budget,
      timeWindow,
      location,
      status: "open",
      posterId: req.user._id, // owner is the logged-in user
      createdAt: new Date(),
    };
    const result = await collections.tasks().insertOne(doc);
    res.status(201).json({ task: { ...doc, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
}

// GET /api/tasks/:id — task detail plus its offers (with helper names).
export async function getTask(req, res, next) {
  try {
    const _id = toObjectId(req.params.id, "task id");

    const task = await collections.tasks().findOne({ _id });
    if (!task) throw new ApiError(404, "Task not found.");

    // Join helper name onto each offer so the UI can show who offered.
    const offers = await collections
      .taskOffers()
      .aggregate([
        { $match: { taskId: _id } },
        {
          $lookup: {
            from: "Users",
            localField: "helperId",
            foreignField: "_id",
            as: "helper",
          },
        },
        { $unwind: { path: "$helper", preserveNullAndEmptyArrays: true } },
        // Only expose helper name/school — never the passwordHash.
        {
          $project: {
            taskId: 1,
            helperId: 1,
            message: 1,
            status: 1,
            createdAt: 1,
            "helper._id": 1,
            "helper.name": 1,
            "helper.school": 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    res.json({ task, offers });
  } catch (err) {
    next(err);
  }
}

// PUT /api/tasks/:id — edit a task. Poster only, and only while it is 'open'.
export async function updateTask(req, res, next) {
  try {
    const _id = toObjectId(req.params.id, "task id");
    const task = await collections.tasks().findOne({ _id });
    if (!task) throw new ApiError(404, "Task not found.");

    // Ownership check (403 = authenticated but not allowed).
    if (!task.posterId.equals(req.user._id)) {
      throw new ApiError(403, "Only the poster can edit this task.");
    }
    // Business rule: locked once it has been matched/completed.
    if (task.status !== "open") {
      throw new ApiError(409, "Only open tasks can be edited.");
    }

    // Build a partial update from whatever valid fields were provided.
    const update = {};
    if (req.body.title !== undefined)
      update.title = requireNonEmptyString(req.body.title, "title");
    if (req.body.description !== undefined)
      update.description = requireNonEmptyString(
        req.body.description,
        "description"
      );
    if (req.body.budget !== undefined)
      update.budget = requirePositiveNumber(req.body.budget, "budget");
    if (req.body.location !== undefined)
      update.location = requireNonEmptyString(req.body.location, "location");
    if (req.body.timeWindow !== undefined)
      update.timeWindow = requireTimeRange(req.body.timeWindow, "timeWindow");

    if (Object.keys(update).length === 0) {
      throw new ApiError(400, "No valid fields to update.");
    }

    await collections.tasks().updateOne({ _id }, { $set: update });
    const updated = await collections.tasks().findOne({ _id });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tasks/:id — delete a task. Poster only, and only while 'open'.
export async function deleteTask(req, res, next) {
  try {
    const _id = toObjectId(req.params.id, "task id");
    const task = await collections.tasks().findOne({ _id });
    if (!task) throw new ApiError(404, "Task not found.");

    if (!task.posterId.equals(req.user._id)) {
      throw new ApiError(403, "Only the poster can delete this task.");
    }
    if (task.status !== "open") {
      throw new ApiError(409, "Only open tasks can be deleted.");
    }

    await collections.tasks().deleteOne({ _id });
    // Clean up any offers attached to the removed task.
    await collections.taskOffers().deleteMany({ taskId: _id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/tasks/mine/posted — tasks posted by the current user (My Tasks page).
export async function myTasks(req, res, next) {
  try {
    const tasks = await collections
      .tasks()
      .find({ posterId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ items: tasks });
  } catch (err) {
    next(err);
  }
}
