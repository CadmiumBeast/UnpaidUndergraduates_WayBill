# Unpaid Undergraduates / Waybill

This is the Waybill monorepo. The [`frontend/`](./frontend) contains the Vite
React application and [`backend/`](./backend) contains the Next.js API,
PostgreSQL schema and authentication. Keep both applications in this one
repository; do not add either repository as a nested Git repository.

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

### Start the complete app

Use two terminal windows. Docker Desktop must be open before starting the
backend because PostgreSQL runs in Docker.

Terminal 1 — backend and database:

```bash
cd ~/rootcode/Unpaid_Undergraruates/backend
cp .env.example .env       # first time only
npm install                 # first time only
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev                 # keep this terminal open on port 3000
```

Terminal 2 — frontend:

```bash
cd ~/rootcode/Unpaid_Undergraruates/frontend
npm install                 # first time only
npm run dev                 # open http://localhost:5173/login
```

Verify the backend before opening the frontend:

```bash
curl http://localhost:3000/api/health
```

The response should contain `"database":"up"`. No external API keys are
needed for local development.

### Demo accounts

All demo accounts use PIN `1234`:

| Staff ID | Role |
| --- | --- |
| `kasun` | Dispatcher |
| `sandun` | Loader |
| `ruwan` | Driver |
| `tharindu` | Store manager |

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

## No external keys required yet

Local development only requires the PostgreSQL connection in `.env` and a local `JWT_SECRET`. A hosted PostgreSQL provider, deployment secret and domain will be needed later if the API is deployed outside Docker.
