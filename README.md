# Unpaid Undergraduates / Waybill

This is the Waybill monorepo. The [`frontend/`](./frontend) contains the Vite
React application and [`backend/`](./backend) contains the Next.js API,
PostgreSQL schema and authentication. Keep both applications in this one
repository; do not add either repository as a nested Git repository.

The separate Datathon work is in [`datathon/`](./datathon). It is intentionally
kept separate from the Hackathon application because the competition treats
the Datathon as an independent submission.

## Submission details

Use these links in the submission form:

| Item | Value |
| --- | --- |
| Deployed frontend | https://unpaid-undergraduates-rbbx-32mfqav51.vercel.app |
| Backend health check | https://unpaid-undergraduates-zjl4.vercel.app/api/health |
| Demo video | https://youtu.be/wKHwqwFwyNc |
| Repository | `https://github.com/CadmiumBeast/Unpaid_Undergraruates` |

The four seeded demo accounts are listed below and all use PIN `1234`.

## Team setup

Each developer should clone this repository once:

```bash
cd ~/rootcode
git clone https://github.com/CadmiumBeast/Unpaid_Undergraruates.git
cd Unpaid_Undergraruates
```

The repository should contain this structure:

```text
Unpaid_Undergraruates/
├── frontend/
└── backend/
```

If your team uses a different GitHub fork, replace the clone URL. Configure
Git once if needed:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### Start the complete stack with Docker

Docker Desktop must be open. From the repository root:

```bash
cp .env.example .env       # first time only
docker compose up --build
```

This starts PostgreSQL, runs backend migrations and seed data, starts the
backend API on port `3000`, and serves the frontend on port `5173`.

Open:

```text
http://localhost:5173/login
```

Verify the backend before opening the frontend:

```bash
curl http://localhost:3000/api/health
```

The response should contain `"database":"up"`. No external API keys are
needed for local development.

To stop the complete stack:

```bash
docker compose down
```

To remove the local database volume and start with a clean database:

```bash
docker compose down -v
```

The separate `backend/` and `frontend/` development commands remain useful for
fast local iteration; see their individual READMEs.

### Demo accounts

All demo accounts use PIN `1234`:

| Staff ID | Role |
| --- | --- |
| `kasun` | Dispatcher |
| `sandun` | Loader |
| `ruwan` | Driver |
| `tharindu` | Store manager |

## Judge walkthrough

Use the deployed frontend URL above. All four accounts use PIN `1234`.

1. Sign in as `tharindu` and place a chilled store order. Keep the order
   reference visible for the next step.
2. Sign in as `kasun`, close the order window and open Planning. Generate a
   suggested allocation, inspect a rejected vehicle assignment to see the
   plain-language constraint explanation, then publish the valid plan. If
   demand exceeds capacity, confirm that the remaining order is explicitly
   deferred with a reason.
3. Sign in as `sandun` using a tablet-sized viewport. Open the assigned trip,
   load the stops in sequence, then seal the vehicle and mark it ready. The
   loading flow can record a shortfall before sealing.
4. Sign in as `ruwan` using a phone-sized viewport. Complete the pre-trip
   checks, start the trip and open the next stop.
5. Use Demo tools to simulate no signal. Enter the receiving code and record
   the delivery. The driver can continue working and the delivery is saved on
   the device for later synchronization.
6. While the driver is offline, use the dispatcher window to change or defer
   the same stop. Reconnect the driver, open Sync and resolve the displayed
   conflict instead of silently overwriting either change.
7. Return to `tharindu` and confirm what arrived. Demonstrate a partial,
   refused or discrepant receipt if time permits; the dispatcher can review it
   in End of day.

The full timed presentation script and the failure-state test matrix are in
[`docs/DEMO-SCRIPT.md`](./docs/DEMO-SCRIPT.md) and
[`frontend/docs/TESTING.md`](./frontend/docs/TESTING.md).

### Team workflow

Create a branch before changing code:

```bash
git checkout main
git pull origin main
git checkout -b feat/short-description
```

Make focused commits, then push your branch:

```bash
git add path/to/changed/files
git commit -m "feat: describe the change"
git push -u origin feat/short-description
```

Open a pull request into `main`. Before opening it, run the checks for the
repository you changed:

```bash
# frontend
cd frontend
npm run typecheck
npm test
npm run build

# backend
cd ../backend
npm run lint
npm run build
```

Do not commit `.env`, credentials, `node_modules`, `.next`, or competition
datasets. Commit `.env.example` when environment variables change.

### Common local problems

If Next.js says port `3000` is already in use, stop the old process and start
again:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
```

If Vite says port `5173` is already in use, do the same:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
kill <PID>
```

Use `Ctrl-C` to stop a dev server. `Ctrl-Z` only suspends it and can leave the
port occupied. In Terminal, use a plain URL for curl, not Markdown link syntax:

```bash
curl http://localhost:3000/api/health
```

## Start the backend

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

The API is available at `http://localhost:3000`. Health check:

```bash
curl http://localhost:3000/api/health
```

All four seeded demo accounts use PIN `1234`: `kasun`, `sandun`, `ruwan` and `tharindu`.

See [`backend/README.md`](./backend/README.md) for the endpoint workflow and offline sync contract.

## Significant departures from the Designathon

- The Designathon prototype was browser-only; the Hackathon build adds a
  Next.js API, Prisma schema, PostgreSQL persistence, cookie sessions and
  seeded accounts.
- The responsive role screens and visual language remain aligned with the
  Designathon direction, while the frontend now persists online shared state
  and polls for changes from other roles/devices.
- The current frontend keeps its local-first workflow engine for reliable
  offline demonstrations. Explicit backend endpoints exist for the domain
  workflow, but the UI still uses a shared-state compatibility bridge for some
  mutations.
- The Hackathon build adds executable degradation paths: offline delivery,
  sync conflicts, vehicle breakdown, loading shortfall, fuel exhaustion,
  wrong receiving code and partial/refused delivery.

## Submission documentation

The required submission documentation is in [`docs/`](./docs):

- [Architecture](./docs/ARCHITECTURE.md) — components, request flow,
  synchronization and security boundaries.
- [Data model](./docs/DATA-MODEL.md) — Prisma entities and relationships.
- [AI disclosure](./docs/AI-DISCLOSURE.md) — how AI assistance was used and
  how the team reviewed the result.
- [Demo script](./docs/DEMO-SCRIPT.md) — a natural 5–8 minute judge walkthrough
  across all four roles.
- [Submission checklist](./docs/SUBMISSION-CHECKLIST.md) — requirements,
  degradation cases and evidence to verify before submission.

## No external keys required yet

Local development only requires the PostgreSQL connection in `.env` and a local `JWT_SECRET`. A hosted PostgreSQL provider, deployment secret and domain will be needed later if the API is deployed outside Docker.
