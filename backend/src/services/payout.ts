/**
 * Payout rules (pure functions - no database, no Express, easy to unit test).
 *
 * The rules, in plain words:
 *  1. A post is entitled to the payout of the HIGHEST milestone its views
 *     have reached. Milestones do not add up: 60K views earns 2000, not 2500.
 *  2. We never pay the same money twice. Each update pays only
 *     (entitlement - alreadyPaid).
 *  3. We never pay more than the campaign's remaining budget. If the amount
 *     owed is bigger than what is left, we pay the partial remainder.
 *  4. Views going down never takes money back (owed is clamped at 0).
 */

export interface Milestone {
  views: number;
  payout: number;
}

export interface PayoutInput {
  /** Current view count of the post. */
  views: number;
  /** The campaign's milestone ladder. */
  milestones: Milestone[];
  /** Rupees already paid for this post. */
  paidAmount: number;
  /** Rupees left in the campaign budget (totalBudget - spent). */
  remainingBudget: number;
}

export interface PayoutResult {
  /** What the post has earned in total at these views (highest milestone). */
  entitlement: number;
  /** Rupees to pay NOW (already capped by the remaining budget). */
  payout: number;
  /** paidAmount after this payout. */
  newPaidAmount: number;
  /** True when the budget was too small to pay everything that was owed. */
  cappedByBudget: boolean;
}

/**
 * Checks a milestone ladder. Returns a list of problems (empty = valid).
 * Rules: at least one milestone; whole positive numbers; views strictly
 * increasing; payouts strictly increasing (a higher milestone must pay more).
 */
export function validateMilestones(milestones: Milestone[]): string[] {
  const errors: string[] = [];

  if (milestones.length === 0) {
    return ["At least one milestone is required"];
  }

  milestones.forEach((m, i) => {
    if (!Number.isInteger(m.views) || m.views <= 0) {
      errors.push(`Milestone ${i + 1}: views must be a positive whole number`);
    }
    if (!Number.isInteger(m.payout) || m.payout <= 0) {
      errors.push(`Milestone ${i + 1}: payout must be a positive whole number`);
    }
  });

  for (let i = 1; i < milestones.length; i++) {
    if (milestones[i].views <= milestones[i - 1].views) {
      errors.push(`Milestone ${i + 1}: views must be greater than the previous milestone`);
    }
    if (milestones[i].payout <= milestones[i - 1].payout) {
      errors.push(`Milestone ${i + 1}: payout must be greater than the previous milestone`);
    }
  }

  return errors;
}

/** Payout of the highest milestone whose views threshold has been reached. */
export function entitlementForViews(views: number, milestones: Milestone[]): number {
  let entitlement = 0;
  for (const m of milestones) {
    if (views >= m.views && m.payout > entitlement) {
      entitlement = m.payout;
    }
  }
  return entitlement;
}

/** How much to pay right now for a post, given what it has already been paid. */
export function calculatePayout(input: PayoutInput): PayoutResult {
  const { views, milestones, paidAmount, remainingBudget } = input;

  if (!Number.isInteger(views) || views < 0) {
    throw new Error("views must be a non-negative whole number");
  }
  if (paidAmount < 0 || remainingBudget < 0) {
    throw new Error("paidAmount and remainingBudget cannot be negative");
  }

  const entitlement = entitlementForViews(views, milestones);

  // Only the increment over what was already paid. Never negative, so a
  // drop in views cannot claw money back.
  const owed = Math.max(0, entitlement - paidAmount);

  // Budget cap: pay the partial remainder if the full amount does not fit.
  const payout = Math.min(owed, remainingBudget);

  return {
    entitlement,
    payout,
    newPaidAmount: paidAmount + payout,
    cappedByBudget: payout < owed,
  };
}
