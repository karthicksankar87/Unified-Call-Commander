# Unified Call Commander

An end-to-end call management and routing system with:

- Intelligent call routing using Redis with DB-only fallback
- Real-time intake via Kafka consumer (topic: `incomingCalls`)
- REST APIs for call lifecycle, analytics, and auth
- React dashboard to view, answer, and end calls

This repo is a simple monorepo:

- `backend/` — Node.js + Express + TypeScript + Prisma (PostgreSQL)
- `frontend/` — React (Create React App)
- `docs/` — BRD, HLD, LLD and implementation plan

---

## Quick Start

Follow these steps to run locally.

### 1) Prerequisites

- Node.js 18+
- npm 8+
- PostgreSQL 13+ (running and accessible)
- Optional: Redis (for advanced routing; can be disabled)
- Optional: Apache Kafka (for ingesting incoming calls)

### 2) Configure environment variables

Create `backend/.env` with at least the following:

```env
# Backend server
PORT=3001

# Database (adjust to your local Postgres settings)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ucc?schema=public"

# Auth
JWT_SECRET="dev-secret"

# Routing via Redis (set to false if you don't have Redis)
USE_REDIS=false
# If using Redis, set the URL (default is redis://localhost:6379)
# REDIS_URL=redis://localhost:6379

# Optional tokens used by example automation module
# SHOPIFY_TOKEN=your_shopify_token
# CALENDAR_TOKEN=your_calendar_token
```

Create `frontend/.env` to point the UI to the backend API:

```env
REACT_APP_API_URL=http://localhost:3001
```

Notes:
- The backend defaults to `PORT=3001` and the frontend dev server runs on `3000`, avoiding port clashes.
- If you change the backend port, update `REACT_APP_API_URL` accordingly. The frontend also falls back to `http://localhost:3001` if no env is set.

### 3) Install dependencies

From the repository root, run the following in each package:

```bash
# Backend
echo "Installing backend deps..." && npm install --prefix backend

# Frontend
echo "Installing frontend deps..." && npm install --prefix frontend
```

Alternatively, run them manually inside each folder: `cd backend && npm install`, `cd frontend && npm install`.

### 4) Initialize the database (Prisma)

From the `backend/` directory:

```bash
# Generate Prisma client (optional if using db:push)
npm run db:generate

# Apply the schema to your DB
npm run db:push

# Optional: open Prisma Studio to inspect data
npm run db:studio

# Optional: seed demo data if you have a seed script set up
npm run seed
```

Prisma models live in `backend/prisma/schema.prisma`.

### 5) Start services

- Ensure PostgreSQL is running and reachable via `DATABASE_URL`.
- Optional: Start Redis if `USE_REDIS=true`.
- Optional: Start Kafka if you plan to ingest calls from the `incomingCalls` topic.

### 6) Run the apps

Backend (from `backend/`):

```bash
npm run dev
```

- Express server listens on `PORT` (default `3001`) — see `backend/src/index.ts`.
- Kafka consumer connects and consumes the `incomingCalls` topic — see `backend/src/services/kafkaConsumer.ts`.

Frontend (from `frontend/`):

```bash
npm start
```

- CRA dev server starts on `http://localhost:3000` by default.

### 7) Verify

- API health: `GET http://localhost:3001/health` should return `{ status: "OK", ... }`.
- Open the UI at `http://localhost:3000`.

---

## Simulating Calls

You can generate calls via Kafka or via REST.

### Option A: Produce to Kafka (recommended)

- Topic: `incomingCalls`
- Group ID: `call-processing-group`
- Broker: `localhost:9092` (hard-coded in `backend/src/services/kafkaConsumer.ts`)

A test producer script is available at `backend/src/test/routingTestProducer.ts`.
Run it with:

```bash
npx ts-node backend/src/test/routingTestProducer.ts
```

The consumer will store the call as `incoming`, then attempt routing (Redis if enabled, otherwise DB-only fallback).

### Option B: Use REST endpoints

Create a call:

```bash
curl -X POST http://localhost:3001/calls \
  -H 'Content-Type: application/json' \
  -d '{
    "phoneNumber": "+15555550100",
    "callerName": "Jane Doe",
    "callType": "INCOMING",
    "location": "Downtown"
  }'
```

Get active calls:

```bash
curl http://localhost:3001/calls/active
```

Answer a call (auto-assigns if not preassigned, using Redis routing when enabled):

```bash
curl -X PUT http://localhost:3001/calls/123/answer \
  -H 'Content-Type: application/json' \
  -d '{"userId": 2}'   # omit body to auto-assign
```

End a call:

```bash
curl -X PUT http://localhost:3001/calls/123/end
```

Stats:

```bash
curl http://localhost:3001/calls/stats
```

---

## Redis Routing (optional but powerful)

When `USE_REDIS=true`, advanced routing and real-time load tracking are enabled via `backend/src/services/redisRouting.ts`.

Initialize Redis caches and availability:

```bash
curl -X POST http://localhost:3001/routing/initialize-redis
```

Useful scripts:

```bash
# Live dashboard for routing & load (prints to console)
npx ts-node backend/src/scripts/monitorRouting.ts

# Validate Redis + Prisma routing setup
npx ts-node backend/src/scripts/validateRouting.ts
```

If Redis is disabled, the system uses a DB-only routing algorithm that prefers:
- Matching agent location when available
- Least-loaded agents (based on active calls in DB)
- Role priority (manager > senior > others)

---

## Available Scripts

Backend (`backend/package.json`):

- `npm run dev` — run Express server with ts-node
- `npm run build` — compile TypeScript
- `npm start` — run compiled server from `dist/`
- `npm run seed` — seed data (if `src/seed.ts` is implemented)
- `npm run db:generate` — generate Prisma client
- `npm run db:push` — apply schema to DB
- `npm run db:migrate` — create/apply migrations
- `npm run db:studio` — open Prisma Studio

Frontend (`frontend/package.json`):

- `npm start` — start CRA dev server
- `npm run build` — build production bundle
- `npm test` — run tests

---

## Project Docs

See the `docs/` folder for:
- `BRD.md` — Business Requirements
- `HLD.md` — High-Level Design
- `LLD.md` — Low-Level Design
- `Implementation_Plan.md`

---

## Troubleshooting

- Backend/Frontend ports:
  - Backend defaults to `3001`; frontend dev server uses `3000`.
  - Update `frontend/.env` `REACT_APP_API_URL` if you change the backend port.

- Kafka not running:
  - The server will still start; `/health` shows Kafka `connected: false`.
  - Start a local Kafka broker on `localhost:9092` or adjust the code in `backend/src/services/kafkaConsumer.ts`.

- Redis not running:
  - Set `USE_REDIS=false` to use DB-only routing.
  - If enabled without Redis, routing features will log failures and fallback.

- Prisma errors:
  - Verify `DATABASE_URL` in `backend/.env`.
  - Run `npm run db:push` from `backend/`.

---

## Notes

- Endpoints referenced in the UI include `/calls/*`, `/analytics/summary`, `/auth/login`, `/health` (see `backend/src/index.ts` and route files under `backend/src/routes/`).
- Authentication is minimal; for local development the UI uses the API without requiring a token. If you enable auth, obtain a token via `POST /auth/login` and store it in `localStorage` as `authToken`.

If you run into issues or want a Docker setup, open an issue or PR. Happy hacking!
