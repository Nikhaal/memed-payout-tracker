import mongoose from "mongoose";
import { Campaign } from "../models/Campaign";
import { Submission } from "../models/Submission";
import { AppError } from "../utils/AppError";
import { calculatePayout } from "./payout";

/**
 * Record a new view count for a post and pay out whatever is newly owed.
 *
 * Everything happens inside ONE database transaction, so the campaign's
 * `spent` and the submission's `paidAmount` always change together or not
 * at all. This is what makes concurrent updates safe:
 *
 *  - Two updates racing on the same campaign: MongoDB detects the write
 *    conflict, aborts one transaction and retries it with fresh data, so
 *    `spent` can never pass `totalBudget`.
 *  - Two updates racing on the same post (or the same update sent twice):
 *    the retry re-reads `paidAmount`, sees it was already paid, and pays 0.
 *
 * Two extra guards make the invariants explicit even if the transaction
 * logic is ever changed:
 *  - the campaign update only matches while spent + payout <= totalBudget
 *  - the submission update only matches while paidAmount is unchanged
 *
 * Note: transactions need a replica set. MongoDB Atlas (including the free
 * tier) is one; a plain local `mongod` is not (see README).
 */
export async function applyViewUpdate(submissionId: string, views: number) {
  return mongoose.connection.transaction(async (session) => {
    const submission = await Submission.findById(submissionId).session(session);
    if (!submission) {
      throw new AppError(404, "Submission not found");
    }

    const campaign = await Campaign.findById(submission.campaign).session(session);
    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    const result = calculatePayout({
      views,
      milestones: campaign.milestones.map((m) => ({ views: m.views, payout: m.payout })),
      paidAmount: submission.paidAmount,
      remainingBudget: campaign.totalBudget - campaign.spent,
    });

    // 1. Take the money out of the campaign budget (only if it still fits).
    if (result.payout > 0) {
      const updatedCampaign = await Campaign.findOneAndUpdate(
        {
          _id: campaign._id,
          $expr: { $lte: [{ $add: ["$spent", result.payout] }, "$totalBudget"] },
        },
        { $inc: { spent: result.payout } },
        { session }
      );
      if (!updatedCampaign) {
        throw new AppError(409, "Campaign budget changed, please retry");
      }
    }

    // 2. Record the new views and what has now been paid for this post.
    const updatedSubmission = await Submission.findOneAndUpdate(
      { _id: submission._id, paidAmount: submission.paidAmount },
      { $set: { views, paidAmount: result.newPaidAmount } },
      { session, new: true }
    );
    if (!updatedSubmission) {
      throw new AppError(409, "Submission was updated concurrently, please retry");
    }

    const spent = campaign.spent + result.payout;
    return {
      submission: updatedSubmission,
      payout: result.payout,
      entitlement: result.entitlement,
      cappedByBudget: result.cappedByBudget,
      campaign: {
        id: campaign._id,
        totalBudget: campaign.totalBudget,
        spent,
        remaining: campaign.totalBudget - spent,
      },
    };
  });
}
