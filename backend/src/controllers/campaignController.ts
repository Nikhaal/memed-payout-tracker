import { Request, Response } from "express";
import { HydratedDocument } from "mongoose";
import { z } from "zod";
import { Campaign, ICampaign } from "../models/Campaign";
import { Submission } from "../models/Submission";
import { validateMilestones } from "../services/payout";
import { AppError } from "../utils/AppError";

const createCampaignSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    platform: z.enum(["instagram", "youtube"]),
    totalBudget: z.number().int("Budget must be a whole number").positive("Budget must be positive"),
    milestones: z.array(
      z.object({
        views: z.number(),
        payout: z.number(),
      })
    ),
  })
  .superRefine((data, ctx) => {
    // Ladder rules (sorted, positive, whole numbers) live in the payout service.
    for (const message of validateMilestones(data.milestones)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["milestones"], message });
    }
    // A campaign must be able to fund at least one full top-milestone payout.
    const top = Math.max(0, ...data.milestones.map((m) => m.payout));
    if (top > data.totalBudget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestones"],
        message: "The highest milestone payout cannot exceed the total budget",
      });
    }
  });

/** Add the derived `remaining` field so clients do not have to compute it. */
function withRemaining(campaign: HydratedDocument<ICampaign>) {
  return { ...campaign.toJSON(), remaining: campaign.totalBudget - campaign.spent };
}

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const data = createCampaignSchema.parse(req.body);
  const campaign = await Campaign.create({ ...data, brand: req.user!.id });
  res.status(201).json({ campaign: withRemaining(campaign) });
}

/** Brand: my campaigns, with budget spent vs remaining. */
export async function listMyCampaigns(req: Request, res: Response): Promise<void> {
  const campaigns = await Campaign.find({ brand: req.user!.id }).sort({ createdAt: -1 });
  res.json({ campaigns: campaigns.map(withRemaining) });
}

/** Creator: campaigns that are live and still have budget left. */
export async function listLiveCampaigns(_req: Request, res: Response): Promise<void> {
  const campaigns = await Campaign.find({
    status: "live",
    $expr: { $lt: ["$spent", "$totalBudget"] },
  }).sort({ createdAt: -1 });
  res.json({ campaigns: campaigns.map(withRemaining) });
}

/** Brand: the posts submitted to one of MY campaigns. */
export async function listCampaignSubmissions(req: Request, res: Response): Promise<void> {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    throw new AppError(404, "Campaign not found");
  }
  if (campaign.brand.toString() !== req.user!.id) {
    throw new AppError(403, "You can only view submissions for your own campaigns");
  }

  const submissions = await Submission.find({ campaign: campaign._id })
    .populate("creator", "name email")
    .sort({ createdAt: -1 });
  res.json({ campaign: withRemaining(campaign), submissions });
}
