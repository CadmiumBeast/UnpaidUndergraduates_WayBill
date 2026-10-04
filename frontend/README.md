# Waybill frontend: delivery planning for Waypoint Group

A clickable front end for the Tech-Triathlon 2026 challenge. Four roles (dispatcher, loader, driver, store manager) work on one delivery day, on the devices they actually use. It keeps the offline-first browser workflow and connects to the Waybill backend when online.

## Monorepo

```bash
cd ~/rootcode/Unpaid_Undergraruates/frontend
npm install
```

The backend is in the sibling directory `../backend`. Follow the root
repository README for complete setup and team workflow instructions.

Create a branch for each task instead of committing directly to `main`:

```bash
git checkout main
git pull origin main
git checkout -b feat/short-description
```

After testing your change:

```bash
git add path/to/changed/files
git commit -m "feat: describe the change"
git push -u origin feat/short-description
```

Open a pull request into `main`. Keep commits focused and never commit `.env`
files, credentials, `node_modules`, or build output.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 27 unit tests: the rules, the planner, offline sync and failure scenarios
npm run typecheck
npm run build && npm run preview   # production build, needed to test installing it as a PWA
npm run dev:lan      # open on a real phone on the same Wi-Fi
```

Node 20 or newer.

## Run with the backend

Start the backend first in a separate terminal:

```bash
cd ~/rootcode/Unpaid_Undergraruates/backend
cp .env.example .env       # first time only
npm install                 # first time only
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3000
```

Then start this frontend:

```bash
cd ~/rootcode/Unpaid_Undergraruates/frontend
npm run dev                 # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:3000` during development. No frontend
API key is required. Verify the backend with:

```bash
curl http://localhost:3000/api/health
```

Use `Ctrl-C`, not `Ctrl-Z`, to stop development servers. If ports are already
occupied, find the process with `lsof -nP -iTCP:3000 -sTCP:LISTEN` or
`lsof -nP -iTCP:5173 -sTCP:LISTEN`, then stop that PID with `kill <PID>`.

The frontend keeps the current offline-first UI actions, persists shared state to the backend while online, and polls the backend so changes made by another role appear in the current browser. Set `VITE_API_BASE_URL` when the API is hosted separately.

## Demo accounts (PIN 1234 for all)

| Role | Staff ID | Best device |
|---|---|---|
| Dispatcher | `kasun` | Desktop |
| Loader | `sandun` | Tablet, landscape |
| Driver | `ruwan` (vehicle VEH001) | Phone |
| Store manager | `tharindu` (Waypoint Fresh Kadawatha) | Phone or desktop |

The **Demo tools** button (bottom right of every screen) lets you jump to any point in the day, simulate no signal, and trigger failures. Open a second browser window to watch two roles at once: data syncs between windows of the same browser, and the "no signal" switch only affects the window you flip it in.

## Judge walkthrough

1. **Store manager** `tharindu`: Place an order (chilled, 30 units). Note the confirmation reference.
2. **Dispatcher** `kasun`: Today > Close orders now. Open **Planning board** > Suggest a plan. Try **Move** on a chilled order and pick an ambient truck: the board explains which rule blocks it. Defer an order and read the reason and the skip warning.
3. Publish the plan. The store manager now sees an arrival window and a receiving code.
4. **Loader** `sandun`: open a trip, tick each order as loaded (last stop first), then Seal and mark ready.
5. **Driver** `ruwan`: open the trip, do the pre-trip check, Start trip. On the first stop, turn on **Simulate no signal** in Demo tools, enter the store's code and confirm. The delivery is saved on the phone.
6. **Dispatcher**: Live runs > Reschedule stop on that same stop. Then the driver switches signal back on: Sync shows two changes clashing, and the driver chooses.
7. **Store manager**: confirm what arrived, or report a shortfall. The dispatcher sees it under End of day.

## What is built

**Core (from the brief and the BA's use cases):** order queue with a 4 PM cutoff; allocation to vehicles and trips with every rule checked (weight, volume, refrigeration, van-only, depot, one brand and district per trip, two trips a day, 270 and 480-minute budgets, mall windows); deferral with a recorded reason and history; live run monitor; loading list in stop order with shortfall flags; digital route sheet with proof of delivery; offline mode with sync; expected arrival, deferral notices and receipt confirmation for stores.

**Additions:** "why not here?" explainer (A2), plan versions with a change summary (A3), deferral playbook and skip-streak warning (A4), Fresh clock (A5), receiving-code proof of delivery that works offline (A6), stops-away tracker with arrival window (A7), failure reason codes (A8), pre-trip check (A9), end-of-day summary (A10), fuel quota meter and fuel-limited capacity (A1), capacity outlook preview (A16), and a roles matrix (A13, design only).

**Failure scenarios:** offline sync conflict, vehicle breakdown mid-route, loading shortfall, fuel quota exhausted, after-cutoff order, wrong receiving code, refused or partial delivery. Steps to trigger each are in [docs/TESTING.md](docs/TESTING.md).

## Change the style

Every colour, font and radius lives in [src/styles/tokens.css](src/styles/tokens.css). Edit it and the whole app follows. `/design` shows the live style guide. See [docs/FIGMA.md](docs/FIGMA.md) for getting the design into Figma.

## Deploy

`vercel.json` is already set up for a Vite single-page app. See the deploy steps in the chat, or import the repo at vercel.com/new.

## Structure

```
src/domain/     rules.ts (feasibility checks), planner.ts (suggested plan), engine.ts (workflow and sync), seed.ts, presets.ts
src/store/      one zustand store, shared across browser windows through localStorage
src/components/ ui/ (buttons, cards, modals), domain/ (chips, budget bars, route line)
src/pages/      dispatcher/ loader/ driver/ manager/ shared/
src/styles/     tokens.css (the style guide)
```

## Known limits

- All data is mock and lives in the browser. Reference numbers (district travel times, outlet windows) are placeholders, except the Fresh handling times and Colombo and Gampaha travel times, which match the brief's worked examples. Load the real CSVs when you build the backend. Do not commit the competition datasets to a public repository.
- Language switching is implemented for English, Sinhala and Tamil on login and shared role navigation; page-specific content is being expanded through the same translation dictionary. Photos are simulated with a button. There is no real GPS or push notification.
- Service-worker offline loading only works on the production build (`npm run build && npm run preview`, or the deployed site).
