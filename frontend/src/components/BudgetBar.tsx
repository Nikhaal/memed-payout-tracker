import { formatINR } from "@/lib/format";

export default function BudgetBar({ spent, total }: { spent: number; total: number }) {
  const percent = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  return (
    <div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="muted small">
        Spent {formatINR(spent)} · Remaining {formatINR(total - spent)} of {formatINR(total)}
      </p>
    </div>
  );
}
