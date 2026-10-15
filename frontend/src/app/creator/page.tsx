"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import Navbar from "@/components/Navbar";
import ViewsSimulator from "@/components/ViewsSimulator";
import { api, errorMessage } from "@/lib/api";
import { formatINR, formatViews } from "@/lib/format";
import type { Campaign, Submission } from "@/lib/types";
import { useRequireRole } from "@/lib/useRequireRole";

export default function CreatorPage() {
  const session = useRequireRole("creator");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loadError, setLoadError] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [live, mine] = await Promise.all([
        api<{ campaigns: Campaign[] }>("/campaigns"),
        api<{ submissions: Submission[]; totalEarnings: number }>("/submissions/mine"),
      ]);
      setCampaigns(live.campaigns);
      setSubmissions(mine.submissions);
      setTotalEarnings(mine.totalEarnings);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [session, loadAll]);

  if (!session) return null;

  return (
    <>
      <Navbar session={session} />
      <main className="container">
        <div className="card">
          <p className="muted small">Total earnings</p>
          <p className="earnings">{formatINR(totalEarnings)}</p>
        </div>

        {loadError && <p className="error">{loadError}</p>}

        <h2>Live campaigns</h2>
        {campaigns.length === 0 && !loadError && (
          <p className="muted">No live campaigns right now.</p>
        )}
        {campaigns.map((c) => (
          <LiveCampaign key={c._id} campaign={c} onSubmitted={loadAll} />
        ))}

        <h2 style={{ marginTop: "1.5rem" }}>My submissions</h2>
        {submissions.length === 0 ? (
          <p className="muted">You have not submitted any posts yet.</p>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Post</th>
                  <th>Views</th>
                  <th>Earned</th>
                  <th>Simulate views</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s._id}>
                    <td>{typeof s.campaign === "object" ? s.campaign.name : ""}</td>
                    <td>
                      <a href={s.link} target="_blank" rel="noreferrer">
                        {s.link}
                      </a>
                    </td>
                    <td>{s.views.toLocaleString("en-IN")}</td>
                    <td>{formatINR(s.paidAmount)}</td>
                    <td>
                      <ViewsSimulator
                        submissionId={s._id}
                        currentViews={s.views}
                        onUpdated={loadAll}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function LiveCampaign({ campaign, onSubmitted }: { campaign: Campaign; onSubmitted: () => void }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    setBusy(true);
    try {
      await api(`/campaigns/${campaign._id}/submissions`, {
        method: "POST",
        body: { link },
      });
      setLink("");
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>{campaign.name}</h3>
        <span className="badge">{campaign.platform}</span>
      </div>

      <BudgetBar spent={campaign.spent} total={campaign.totalBudget} />

      <div className="ladder">
        {campaign.milestones.map((m) => (
          <span className="chip" key={m.views}>
            {formatViews(m.views)} → {formatINR(m.payout)}
          </span>
        ))}
      </div>

      <form className="row" onSubmit={onSubmit}>
        <div>
          <label htmlFor={`link-${campaign._id}`}>Your {campaign.platform} post link</label>
          <input
            id={`link-${campaign._id}`}
            type="url"
            placeholder="https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            required
          />
        </div>
        <button className="btn" disabled={busy}>
          {busy ? "Submitting..." : "Submit post"}
        </button>
      </form>
      {error && <p className="error small">{error}</p>}
      {done && <p className="success small">Post submitted.</p>}
    </div>
  );
}
