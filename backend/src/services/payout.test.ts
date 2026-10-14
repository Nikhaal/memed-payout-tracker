import { calculatePayout, entitlementForViews, Milestone, validateMilestones } from "./payout";

const ladder: Milestone[] = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2000 },
  { views: 100_000, payout: 5000 },
];

/** Helper: first update of a fresh post with plenty of budget. */
const pay = (views: number, paidAmount = 0, remainingBudget = 1_000_000) =>
  calculatePayout({ views, milestones: ladder, paidAmount, remainingBudget });

describe("entitlementForViews (highest milestone crossed)", () => {
  it("pays nothing below the first milestone", () => {
    expect(entitlementForViews(0, ladder)).toBe(0);
    expect(entitlementForViews(9_999, ladder)).toBe(0);
  });

  it("pays a milestone when views are exactly on the threshold", () => {
    expect(entitlementForViews(10_000, ladder)).toBe(500);
    expect(entitlementForViews(50_000, ladder)).toBe(2000);
    expect(entitlementForViews(100_000, ladder)).toBe(5000);
  });

  it("pays only the highest milestone, not the sum (60K -> 2000, not 2500)", () => {
    expect(entitlementForViews(60_000, ladder)).toBe(2000);
  });

  it("keeps paying the top milestone beyond the last threshold", () => {
    expect(entitlementForViews(5_000_000, ladder)).toBe(5000);
  });

  it("does not depend on the order the milestones are listed in", () => {
    const shuffled = [ladder[2], ladder[0], ladder[1]];
    expect(entitlementForViews(60_000, shuffled)).toBe(2000);
  });
});

describe("calculatePayout (increments, never double-pay)", () => {
  it("pays the full entitlement on the first update", () => {
    const r = pay(60_000);
    expect(r.payout).toBe(2000);
    expect(r.newPaidAmount).toBe(2000);
    expect(r.cappedByBudget).toBe(false);
  });

  it("pays only the highest milestone when a post jumps two milestones at once (5K -> 60K)", () => {
    const first = pay(5_000);
    expect(first.payout).toBe(0);
    const second = pay(60_000, first.newPaidAmount);
    expect(second.payout).toBe(2000);
  });

  it("pays only the difference on a later milestone (60K -> 120K pays 3000)", () => {
    const first = pay(60_000);
    const second = pay(120_000, first.newPaidAmount);
    expect(second.payout).toBe(3000);
    expect(second.newPaidAmount).toBe(5000);
  });

  it("pays nothing when the same views are submitted again (idempotent)", () => {
    const first = pay(60_000);
    const again = pay(60_000, first.newPaidAmount);
    expect(again.payout).toBe(0);
    expect(again.newPaidAmount).toBe(2000);
  });

  it("never claws money back when views decrease", () => {
    const first = pay(120_000);
    const lower = pay(20_000, first.newPaidAmount);
    expect(lower.payout).toBe(0);
    expect(lower.newPaidAmount).toBe(5000);
  });
});

describe("calculatePayout (budget cap)", () => {
  it("pays the partial remainder when the budget is smaller than the amount owed", () => {
    const r = pay(100_000, 0, 1200);
    expect(r.entitlement).toBe(5000);
    expect(r.payout).toBe(1200);
    expect(r.newPaidAmount).toBe(1200);
    expect(r.cappedByBudget).toBe(true);
  });

  it("pays nothing when the budget is exhausted", () => {
    const r = pay(100_000, 0, 0);
    expect(r.payout).toBe(0);
    expect(r.cappedByBudget).toBe(true);
  });

  it("pays in full when the budget exactly matches the amount owed", () => {
    const r = pay(50_000, 0, 2000);
    expect(r.payout).toBe(2000);
    expect(r.cappedByBudget).toBe(false);
  });

  it("caps only the increment, not the whole entitlement", () => {
    // Already paid 500, now owed 1500 more, but only 700 left.
    const r = pay(50_000, 500, 700);
    expect(r.payout).toBe(700);
    expect(r.newPaidAmount).toBe(1200);
    expect(r.cappedByBudget).toBe(true);
  });

  it("never lets total payouts across many posts exceed the budget", () => {
    let remaining = 3000;
    let totalPaid = 0;
    for (let i = 0; i < 5; i++) {
      const r = pay(100_000, 0, remaining); // five posts, each owed 5000
      remaining -= r.payout;
      totalPaid += r.payout;
    }
    expect(totalPaid).toBe(3000);
    expect(remaining).toBe(0);
  });
});

describe("calculatePayout (input checks)", () => {
  it("rejects negative or fractional views", () => {
    expect(() => pay(-1)).toThrow();
    expect(() => pay(1.5)).toThrow();
  });
});

describe("validateMilestones", () => {
  it("accepts a valid ladder", () => {
    expect(validateMilestones(ladder)).toEqual([]);
  });

  it("rejects an empty ladder", () => {
    expect(validateMilestones([])).toHaveLength(1);
  });

  it("rejects zero, negative and fractional values", () => {
    expect(validateMilestones([{ views: 0, payout: 100 }]).length).toBeGreaterThan(0);
    expect(validateMilestones([{ views: 100, payout: -5 }]).length).toBeGreaterThan(0);
    expect(validateMilestones([{ views: 100.5, payout: 5 }]).length).toBeGreaterThan(0);
  });

  it("rejects views that are not strictly increasing", () => {
    const bad = [
      { views: 50_000, payout: 2000 },
      { views: 10_000, payout: 3000 },
    ];
    expect(validateMilestones(bad).length).toBeGreaterThan(0);
  });

  it("rejects payouts that do not increase with the milestone", () => {
    const bad = [
      { views: 10_000, payout: 2000 },
      { views: 50_000, payout: 500 },
    ];
    expect(validateMilestones(bad).length).toBeGreaterThan(0);
  });
});
