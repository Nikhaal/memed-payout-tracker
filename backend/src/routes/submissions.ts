import { Router } from "express";
import { listMySubmissions, updateViews } from "../controllers/submissionController";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/mine", authenticate, requireRole("creator"), asyncHandler(listMySubmissions));

// Simulated platform data: intentionally no authentication or role check.
router.patch("/:id/views", asyncHandler(updateViews));

export default router;
