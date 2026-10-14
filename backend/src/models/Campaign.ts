import { Schema, model, Types } from "mongoose";

export type Platform = "instagram" | "youtube";
export type CampaignStatus = "live" | "closed";

/** One rung of the payout ladder: reach `views`, earn `payout` (in rupees). */
export interface IMilestone {
  views: number;
  payout: number;
}

export interface ICampaign {
  _id: Types.ObjectId;
  brand: Types.ObjectId;
  name: string;
  platform: Platform;
  /** Total budget in whole rupees. */
  totalBudget: number;
  /** Rupees already paid out. Invariant: 0 <= spent <= totalBudget. */
  spent: number;
  milestones: IMilestone[];
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    views: { type: Number, required: true, min: 1 },
    payout: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const campaignSchema = new Schema<ICampaign>(
  {
    brand: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    platform: { type: String, enum: ["instagram", "youtube"], required: true },
    totalBudget: { type: Number, required: true, min: 1 },
    spent: { type: Number, default: 0, min: 0 },
    milestones: { type: [milestoneSchema], required: true },
    status: { type: String, enum: ["live", "closed"], default: "live" },
  },
  { timestamps: true }
);

export const Campaign = model<ICampaign>("Campaign", campaignSchema);
