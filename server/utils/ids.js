// server/utils/ids.js
// Helper to safely turn a request param into an ObjectId, throwing a clean 400
// (instead of a raw BSON error) when the string is not a valid id.
import { ObjectId } from "mongodb";
import { ApiError } from "../middleware/validation.js";

export function toObjectId(id, field = "id") {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid "${field}".`);
  }
  return new ObjectId(id);
}
