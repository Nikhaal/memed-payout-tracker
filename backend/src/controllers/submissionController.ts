import { Request, Response } from "express";
import { z } from "zod";
import { Campaign } from "../models/Campaign";
import { Submission } from "../models/Submission";
import { applyViewUpdate } from "../services/submissionService";
import { AppError } from "../utils/AppError";
import { matchesPlatform } from "../utils/platform";

const createSubmissionSchema = z.object({
  link: z
    .string()
    .trim()
    .url("Invalid link")
    .refine((l) => /^https?:\/\//i.test(l), "Link must start with http:// or https://"),
});

const updateViewsSchema = z.object({
  views: z.number().int("Views must be a whole number").min(0, "Views cannot be negative"),
});

/** Creator: submit a post link to a campaign. */
export async function createSubmission(req: Request, res: Response): Promise<void> {
  const { link } = createSubmissionSchema.parse(req.body);

  const campaign = await Campaign.findById(req.params.campaignId);
  if (!campaign) {
    throw new AppError(404, "Campaign not found");
  }
  if (campaign.status !== "live" || campaign.spent >= campaign.totalBudget) {
    throw new AppError(409, "This campaign is no longer accepting submissions");
  }
  if (!matchesPlatform(link, campaign.platform)) {
    throw new AppError(400, `Link must be a ${campaign.platform} URL`);
  }

  // A duplicate (same campaign + same link) is rejected by the unique index
  // and turned into a 409 by the error handler.
  const submission = await Submission.create({
    campaign: campaign._id,
    creator: req.user!.id,
    link,
  });
  res.status(201).json({ submission });
}

/** Creator: my submissions and total earnings. */
export async function listMySubmissions(req: Request, res: Response): Promise<void> {
  const submissions = await Submission.find({ creator: req.user!.id })
    .populate("campaign", "name platform")
    .sort({ createdAt: -1 });
  const totalEarnings = submissions.reduce((sum, s) => sum + s.paidAmount, 0);
  res.json({ submissions, totalEarnings });
}

/**
 * Simulates the platform reporting a new view count. As the brief says,
 * this needs no role check; see the README for how it would be secured
 * in production.
 */
export async function updateViews(req: Request, res: Response): Promise<void> {
  const { views } = updateViewsSchema.parse(req.body);
  const result = await applyViewUpdate(req.params.id, views);
  res.json(result);
}
