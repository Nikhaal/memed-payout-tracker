import { Router } from "express";
import {
  createCampaign,
  listCampaignSubmissions,
  listLiveCampaigns,
  listMyCampaigns,
} from "../controllers/campaignController";
import { createSubmission } from "../controllers/submissionController";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Every campaign route needs a logged-in user.
router.use(authenticate);

router.post("/", requireRole("brand"), asyncHandler(createCampaign));
// "/mine" must be declared before any "/:id" route so it is not read as an id.
router.get("/mine", requireRole("brand"), asyncHandler(listMyCampaigns));
router.get("/", asyncHandler(listLiveCampaigns));
router.get("/:id/submissions", requireRole("brand"), asyncHandler(listCampaignSubmissions));
router.post("/:campaignId/submissions", requireRole("creator"), asyncHandler(createSubmission));

export default router;
