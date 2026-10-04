# Waybill backend

This is the backend API for the Waybill delivery workflow. It is a Next.js App Router application with route handlers, PostgreSQL persistence through Prisma, cookie-based JWT sessions, seeded demo accounts and an offline sync endpoint.

## Requirements

- Node.js 20+
- Docker Desktop, for local PostgreSQL

No third-party API keys are required for local development. The only local secret is `JWT_SECRET`.

## Run locally

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run db:push
npm run db:seed
npm run dev
```

The API runs at `http://localhost:3000`.

For a separately deployed frontend, set `FRONTEND_ORIGIN` in `.env` to the
frontend origin. The local Vite frontend proxies `/api` to this server, so no
frontend API URL is needed during local development.

Check it with:

```bash
curl http://localhost:3000/api/health
```

## Demo accounts

All accounts use PIN `1234`:

| Staff ID | Role | Device |
| --- | --- | --- |
| `kasun` | Dispatcher | Desktop |
| `sandun` | Loader | Tablet |
| `ruwan` | Driver | Phone |
| `tharindu` | Store manager | Phone or desktop |

## API workflow

1. `POST /api/auth/login` with `{ "username": "tharindu", "pin": "1234" }`.
2. `POST /api/orders` as the store manager.
3. `GET /api/orders` as the dispatcher.
4. `POST /api/plans` as the dispatcher with a vehicle and order assignment.
5. `POST /api/plans/:id/publish`.
6. `GET /api/trips` as the loader and update stops through `POST /api/trips/:id/loading`.
7. Seal through `POST /api/trips/:id/ready`.
8. Start the trip through `POST /api/trips/:id/start` as the driver.
9. Record a delivery through `POST /api/trips/:id/stops/:stopId/outcome`.
10. Confirm receipt through `POST /api/orders/:id/receipt` as the store manager.

Drivers can send offline events in batches to `POST /api/sync`. If an event was created against an older plan version, the API stores it as a conflict instead of silently overwriting the newer plan. Resolve it with `POST /api/sync/:id/resolve`.

## Frontend integration boundary

The current `waybill-app` frontend is local-first so its existing offline and
demo workflow remains usable. When a user is online and signed in, login is
validated by this API, each state-changing UI action persists the complete
workflow snapshot through `PUT /api/state`, and every open client polls
`GET /api/state` to receive newer changes from other roles or devices.

The explicit role-based endpoints listed below are also available for a later
endpoint-by-endpoint migration. That deeper migration would replace the
frontend's browser planner mutations with individual order, plan, loading,
delivery and receipt API calls; it is not required for the current integrated
demo flow.

## Useful commands

```bash
npm run lint
npm run build
npm run db:studio
```

Do not commit `.env` or competition datasets. Commit `.env.example` only.
