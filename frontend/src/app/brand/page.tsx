"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import Navbar from "@/components/Navbar";
import ViewsSimulator from "@/components/ViewsSimulator";
import { api, errorMessage } from "@/lib/api";
import { formatINR, formatViews } from "@/lib/format";
import type { Campaign, Platform, Submission } from "@/lib/types";
import { useRequireRole } from "@/lib/useRequireRole";

interface MilestoneRow {
  views: string;
  payout: string;
}

const DEFAULT_LADDER: MilestoneRow[] = [
  { views: "10000", payout: "500" },
  { views: "50000", payout: "2000" },
  { views: "100000", payout: "5000" },
];

export default function BrandPage() {
  const session = useRequireRole("brand");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadError, setLoadError] = useState("");

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await api<{ campaigns: Campaign[] }>("/campaigns/mine");
      setCampaigns(data.campaigns);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (session) loadCampaigns();
  }, [session, loadCampaigns]);

  if (!session) return null;

  return (
    <>
      <Navbar session={session} />
      <main className="container">
        <CreateCampaignForm onCreated={loadCampaigns} />

        <h2>Your campaigns</h2>
        {loadError && <p className="error">{loadError}</p>}
        {campaigns.length === 0 && !loadError && (
          <p className="muted">No campaigns yet. Create your first one above.</p>
        )}
        {campaigns.map((c) => (
          <CampaignCard key={c._id} campaign={c} onChanged={loadCampaigns} />
        ))}
      </main>
    </>
  );
}

function CreateCampaignForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [budget, setBudget] = useState("");
  const [rows, setRows] = useState<MilestoneRow[]>(DEFAULT_LADDER);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateRow(index: number, field: keyof MilestoneRow, value: string) {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/campaigns", {
        method: "POST",
        body: {
          name,
          platform,
          totalBudget: Number(budget),
          milestones: rows.map((r) => ({ views: Number(r.views), payout: Number(r.payout) })),
        },
      });
      setName("");
      setBudget("");
      setRows(DEFAULT_LADDER);
      onCreated();
    } catch (err) {
      // The API explains what is wrong (e.g. milestones not in increasing order).
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Create a campaign</h2>

      <label htmlFor="c-name">Campaign name</label>
      <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />

      <div className="row">
        <div>
          <label htmlFor="c-platform">Platform</label>
          <select
            id="c-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
          >
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <div>
          <label htmlFor="c-budget">Total budget (₹)</label>
          <input
            id="c-budget"
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
          />
        </div>
      </div>

      <label>Milestone ladder (views → payout, highest milestone crossed is paid)</label>
      {rows.map((row, i) => (
        <div className="milestone-row" key={i}>
          <input
            type="number"
            min={1}
            placeholder="Views"
            value={row.views}
            onChange={(e) => updateRow(i, "views", e.target.value)}
            aria-label={`Milestone ${i + 1} views`}
          />
          <input
            type="number"
            min={1}
            placeholder="Payout (₹)"
            value={row.payout}
            onChange={(e) => updateRow(i, "payout", e.target.value)}
            aria-label={`Milestone ${i + 1} payout`}
          />
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost btn-small"
        onClick={() => setRows([...rows, { views: "", payout: "" }])}
      >
        + Add milestone
      </button>

      {error && <p className="error small" style={{ marginTop: "0.6rem" }}>{error}</p>}

      <div style={{ marginTop: "1rem" }}>
        <button className="btn" disabled={busy}>
          {busy ? "Creating..." : "Create campaign"}
        </button>
      </div>
    </form>
  );
}

function CampaignCard({ campaign, onChanged }: { campaign: Campaign; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await api<{ submissions: Submission[] }>(
        `/campaigns/${campaign._id}/submissions`
      );
      setSubmissions(data.submissions);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [campaign._id]);

  function toggle() {
    if (!open) loadSubmissions();
    setOpen(!open);
  }

  // After a views update the payout changes both the post and the campaign budget.
  function refreshAll() {
    loadSubmissions();
    onChanged();
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

      <button className="link-btn small" onClick={toggle}>
        {open ? "Hide submissions" : "View submissions"}
      </button>

      {open && (
        <div style={{ marginTop: "0.6rem" }}>
          {error && <p className="error small">{error}</p>}
          {submissions.length === 0 && !error && (
            <p className="muted small">No submissions yet.</p>
          )}
          {submissions.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Post</th>
                  <th>Views</th>
                  <th>Paid</th>
                  <th>Simulate views</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s._id}>
                    <td>{typeof s.creator === "object" ? s.creator.name : ""}</td>
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
                        onUpdated={refreshAll}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
