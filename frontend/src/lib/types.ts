export type Role = "brand" | "creator";
export type Platform = "instagram" | "youtube";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Session {
  token: string;
  user: User;
}

export interface Milestone {
  views: number;
  payout: number;
}

export interface Campaign {
  _id: string;
  name: string;
  platform: Platform;
  totalBudget: number;
  spent: number;
  /** Derived by the API: totalBudget - spent. */
  remaining: number;
  milestones: Milestone[];
  status: "live" | "closed";
  createdAt: string;
}

export interface Submission {
  _id: string;
  link: string;
  views: number;
  paidAmount: number;
  createdAt: string;
  /** Populated (name + platform) on the creator's list, a plain id elsewhere. */
  campaign: string | { _id: string; name: string; platform: Platform };
  /** Populated (name + email) on the brand's list. */
  creator: string | { _id: string; name: string; email: string };
}

/** Response of PATCH /submissions/:id/views. */
export interface ViewsUpdateResult {
  submission: Submission;
  /** Rupees paid by THIS update. */
  payout: number;
  entitlement: number;
  cappedByBudget: boolean;
  campaign: { id: string; totalBudget: number; spent: number; remaining: number };
}
