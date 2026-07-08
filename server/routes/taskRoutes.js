// server/routes/taskRoutes.js
// SLICE 1 routes: Tasks + TaskOffers. Every write route is auth-guarded.
import { Router } from "express";
import { authGuard } from "../middleware/authGuard.js";
import {
  browseTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  myTasks,
} from "../controllers/taskController.js";
import {
  submitOffer,
  respondToOffer,
  withdrawOffer,
  myOffers,
} from "../controllers/offerController.js";

const router = Router();

// "My" collections — must come before "/:id" so they aren't captured as ids.
router.get("/mine/posted", authGuard, myTasks); // My Tasks

// Tasks
router.get("/", browseTasks); // browse (aggregation) — public
router.post("/", authGuard, createTask); // create (auth)
router.get("/:id", getTask); // detail + offers — public
router.put("/:id", authGuard, updateTask); // edit (poster, open only)
router.delete("/:id", authGuard, deleteTask); // delete (poster, open only)

// Offers (nested under a task)
router.post("/:id/offers", authGuard, submitOffer); // submit offer
router.put("/:id/offers/:offerId", authGuard, respondToOffer); // accept/decline (atomic)
router.delete("/:id/offers/:offerId", authGuard, withdrawOffer); // withdraw own pending

export default router;

// Separate router for "/api/offers/mine" (My Offers), mounted in server.js.
export const offersRouter = Router();
offersRouter.get("/mine", authGuard, myOffers);
