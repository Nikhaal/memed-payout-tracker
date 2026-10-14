import { Schema, model, Types } from "mongoose";

export interface ISubmission {
  _id: Types.ObjectId;
  campaign: Types.ObjectId;
  creator: Types.ObjectId;
  link: string;
  /** Latest known view count (simulated platform data). */
  views: number;
  /**
   * Rupees paid so far for this post. Because a payout is the highest
   * milestone crossed, each update only pays (new entitlement - paidAmount).
   * This is what makes repeated updates safe: they can never double-pay.
   */
  paidAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    link: { type: String, required: true, trim: true },
    views: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// The same post link can only be submitted once per campaign.
submissionSchema.index({ campaign: 1, link: 1 }, { unique: true });

export const Submission = model<ISubmission>("Submission", submissionSchema);
