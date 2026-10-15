// Manual end-to-end check that concurrent view updates never overspend the
// budget and never double-pay. Needs the API running (npm run dev) against a
// replica-set MongoDB (Atlas is fine). Usage:  node scripts/concurrency-check.mjs
// Optional: API_URL=https://your-deployed-api/api node scripts/concurrency-check.mjs

const API = process.env.API_URL || "http://localhost:5000/api";
const run = Date.now();
let failed = false;

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: expected ${expected}, got ${actual}`);
}

const ladder = [
  { views: 10000, payout: 500 },
  { views: 50000, payout: 1000 },
  { views: 100000, payout: 2000 },
];

async function main() {
  const brand = await call("POST", "/auth/signup", {
    name: "Test Brand", email: `brand${run}@test.dev`, password: "password123", role: "brand",
  });
  const creator = await call("POST", "/auth/signup", {
    name: "Test Creator", email: `creator${run}@test.dev`, password: "password123", role: "creator",
  });

  const makeCampaign = (name, totalBudget) =>
    call("POST", "/campaigns", { name, platform: "instagram", totalBudget, milestones: ladder }, brand.token);

  const makePost = (campaignId, n) =>
    call("POST", `/campaigns/${campaignId}/submissions`,
      { link: `https://www.instagram.com/p/${run}-${n}/` }, creator.token);

  const setViews = (id, views) =>
    call("PATCH", `/submissions/${id}/views`, { views });

  // Test 1: five posts each owed 2000, but the budget is only 3000.
  const c1 = (await makeCampaign(`Budget race ${run}`, 3000)).campaign;
  const posts = [];
  for (let i = 0; i < 5; i++) posts.push((await makePost(c1._id, i)).submission);
  await Promise.all(posts.map((p) => setViews(p._id, 100000)));
  const after1 = await call("GET", `/campaigns/${c1._id}/submissions`, null, brand.token);
  const paid1 = after1.submissions.reduce((s, x) => s + x.paidAmount, 0);
  check("test 1: campaign spent (never above budget)", after1.campaign.spent, 3000);
  check("test 1: sum of post payouts equals spent", paid1, 3000);
  check("test 1: remaining budget", after1.campaign.remaining, 0);

  // Test 2: the same update sent 10 times at once must pay only once.
  const c2 = (await makeCampaign(`Double pay ${run}`, 10000)).campaign;
  const post = (await makePost(c2._id, 99)).submission;
  await Promise.all(Array.from({ length: 10 }, () => setViews(post._id, 60000)));
  const after2 = await call("GET", `/campaigns/${c2._id}/submissions`, null, brand.token);
  check("test 2: post paid exactly once (60K -> 1000)", after2.submissions[0].paidAmount, 1000);
  check("test 2: campaign spent", after2.campaign.spent, 1000);

  console.log(failed ? "\nSOME CHECKS FAILED" : "\nALL CHECKS PASSED");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
