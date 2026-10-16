# Meme'd – Creator Campaign Payout Tracker

Brands create campaigns with a budget and a milestone payout ladder. Creators submit post links. As views grow, creators are paid automatically, and the campaign budget can never be overspent.

- **Live app:** https://memed-payout-tracker-two.vercel.app
- **Live API (health check):** https://memed-api-fn7h.onrender.com/health
- **Code:** https://github.com/Nikhaal/memed-payout-tracker

> The API runs on a free instance that sleeps when idle. The first request after a quiet period can take about 50 seconds.

## Stack

| Part | Tech |
|---|---|
| Backend | Node, TypeScript, Express 4, Mongoose 8, Zod, JWT, bcryptjs |
| Database | MongoDB Atlas |
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Tests | Jest (payout calculation, platform link check) |
| Hosting | Render (backend), Vercel (frontend) |

## Repository layout

```
backend/    Express API  (src/models, controllers, services, routes, middleware)
frontend/   Next.js app  (src/app pages, components, lib)
```

## Running locally

Requirements: Node 18+ and a MongoDB database that is a **replica set** (a free MongoDB Atlas cluster works; a plain local `mongod` does not, see "Atomic payouts" below).

### Backend

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env and fill in the values
npm run dev               # http://localhost:5000
npm test                  # unit tests
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev                  # http://localhost:3000
```

## Environment variables

**backend/.env**

| Name | Purpose | Example |
|---|---|---|
| `PORT` | API port | `5000` |
| `MONGODB_URI` | MongoDB connection string (include the database name) | `mongodb://localhost:27017/memed` |
| `JWT_SECRET` | Secret used to sign tokens. Use a long random value | `change-me-to-a-long-random-string` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CORS_ORIGIN` | Allowed frontend origin, no trailing slash | `http://localhost:3000` |

**frontend/.env.local**

| Name | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API, ending in `/api` | `http://localhost:5000/api` |

The backend refuses to start if a required variable is missing. Real `.env` files are git-ignored; only `.env.example` files are committed.

## How payouts work

A campaign has a `totalBudget` and a list of milestones, for example `10,000 views -> ₹500` and `50,000 views -> ₹2,000`. The payout for a milestone is a **total** for that milestone, not an extra amount on top.

When a submission's views are updated:

1. **Entitlement** = the payout of the highest milestone the views have reached.
2. **Owed** = `max(0, entitlement - alreadyPaid)`. Only the increase is paid.
3. **Payout** = `min(owed, remainingBudget)`, where `remainingBudget = totalBudget - spent`.

Example: at 55,000 views the creator is entitled to ₹2,000. If ₹500 was already paid at 10,000 views, this update pays ₹1,500 and the total is ₹2,000.

The calculation is a pure function in `backend/src/services/payout.ts`, covered by tests in `payout.test.ts`.

### Assumptions

- **Budget runs out mid-payout:** the creator receives the partial remainder, and the response flags `cappedByBudget`. Money not paid because of the cap is not paid later.
- Milestone views and payouts must be positive integers and strictly increasing. The top payout cannot exceed the campaign budget. Validation is enforced on campaign creation.
- Each campaign targets one platform (`instagram` or `youtube`). A submitted link must be on that platform's domain.
- The same link cannot be submitted twice to the same campaign.
- Payouts are simulated: the app records amounts earned, it does not move real money.
- Updating views to a lower number never reduces what was already paid.
- `PATCH /api/submissions/:id/views` is **intentionally open (no login)**, as in the brief, so views can be simulated. In production this would only be callable by a trusted view-tracking service.
- Currency is INR.

### Atomic payouts (no overspending)

Two creators can hit a campaign with their last rupees at the same moment. `applyViewUpdate` in `backend/src/services/submissionService.ts` handles this with a MongoDB transaction and two guarded writes:

1. The campaign update only matches if `spent + payout <= totalBudget` (checked inside the database). If it doesn't match, the request fails with 409.
2. The submission update only matches if `paidAmount` is still the value we read (compare-and-set). A duplicate or concurrent update for the same submission fails with 409 instead of paying twice.

Both writes commit together or not at all. MongoDB transactions require a replica set, which is why Atlas is used.

`backend/scripts/concurrency-check.mjs` verifies this end to end against a running API (five concurrent submissions against a ₹3,000 budget must leave `spent = 3000`, and ten concurrent identical view updates must pay exactly once):

```bash
cd backend
node scripts/concurrency-check.mjs        # optional: API_URL=https://<render-url>/api
```

## API

All routes are under `/api`. Send `Authorization: Bearer <token>` except where noted.

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/auth/signup` | public | Create a `brand` or `creator` account |
| POST | `/auth/login` | public | Returns `{ token, user }` |
| GET | `/auth/me` | any user | Current user |
| POST | `/campaigns` | brand | Create a campaign with budget and milestones |
| GET | `/campaigns/mine` | brand | The brand's campaigns, with remaining budget |
| GET | `/campaigns` | any user | Live campaigns that still have budget |
| GET | `/campaigns/:id/submissions` | brand (owner) | Submissions for a campaign |
| POST | `/campaigns/:campaignId/submissions` | creator | Submit a post link |
| GET | `/submissions/mine` | creator | The creator's submissions and total earnings |
| PATCH | `/submissions/:id/views` | **public (simulation)** | Set views and trigger payout |
| GET | `/health` | public | Health check (outside `/api`) |

Errors return JSON `{ error, details? }` with a suitable status code (400 validation, 401/403 auth, 404, 409 conflict).

## Scaling to ~10,000 creators

Not implemented, but this is how I would grow it:

- **Indexes:** `brand`, `campaign` and `creator` are already indexed, plus a unique `campaign + link` index. At scale I would add a compound index for the live-campaigns query (`status` plus budget left).
- **Pagination:** the list endpoints return everything today. Add cursor pagination.
- **Hot campaigns:** one popular campaign means many writes to one budget document. Under load I would reserve budget in chunks per worker, or serialise payouts per campaign through a queue.
- **View updates:** move payout processing to a background queue so a burst of view updates doesn't hold HTTP requests open, and make it retry-safe (the compare-and-set already makes retries safe).
- **Caching and limits:** cache the live-campaign list for a few seconds, and add rate limiting on auth and write routes.
- **Security:** lock the views endpoint to a trusted service, and store tokens in httpOnly cookies instead of localStorage.
- **Operations:** structured logging and monitoring, and an audit log of every payout.
