/** 12000 -> "₹12,000" (Indian digit grouping). */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** 60000 -> "60,000". */
export function formatViews(n: number): string {
  return n.toLocaleString("en-IN");
}
