"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { ViewsUpdateResult } from "@/lib/types";

interface Props {
  submissionId: string;
  currentViews: number;
  /** Called after a successful update so the parent can reload its data. */
  onUpdated: () => void;
}

/**
 * Stand-in for real Instagram/YouTube data: type a view count and send it to
 * PATCH /api/submissions/:id/views, which calculates and records the payout.
 */
export default function ViewsSimulator({ submissionId, currentViews, onUpdated }: Props) {
  const [views, setViews] = useState(String(currentViews));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const result = await api<ViewsUpdateResult>(`/submissions/${submissionId}/views`, {
        method: "PATCH",
        body: { views: Number(views) },
      });
      setIsError(false);
      setMessage(
        `Paid ${formatINR(result.payout)}${result.cappedByBudget ? " (budget ran out: partial payout)" : ""}`
      );
      onUpdated();
    } catch (err) {
      setIsError(true);
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="simulator">
      <input
        type="number"
        min={0}
        value={views}
        onChange={(e) => setViews(e.target.value)}
        aria-label="Simulated view count"
      />
      <button className="btn btn-small" onClick={submit} disabled={busy}>
        Set views
      </button>
      {message && <span className={isError ? "error small" : "success small"}>{message}</span>}
    </div>
  );
}
