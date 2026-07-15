# PowerHouse MIS

Web app that replaces the monthly Excel MIS (`Jun_2026.xlsx`) for ZYN Electrical's
power house. Engineers record **daily meter readings**; the app derives all
consumption, run-hours and service-due figures and shows them on a dashboard.

Built with **Next.js (App Router, JavaScript)**, **Prisma + PostgreSQL** (Neon),
**Tailwind CSS** and **Recharts**. Deploys to **Vercel**.

## Features

- **Daily Entry** (`/entry`) — one form per day for raw meter readings, with the
  previous day's change (Δ) shown live.
- **Dashboard** (`/`) — KPI cards (diesel consumed/received, current stock, grid &
  EB power), daily diesel/power charts, per-equipment run-hour charts, and
  **service-due alerts**.
- **Data** (`/data`) — the month spreadsheet view (raw + computed columns).
- **Log Entry** (`/log-entry`, Admin/Engineer) — record a maintenance activity
  (plant/section/equipment, start–end time with calculated duration, type of
  maintenance, detail, spare parts used, attended by).
- **Log Data** (`/log-data`, Admin/Engineer/ZYN) — browse and filter logged
  maintenance activities. Only Admin can edit a saved entry.
- **Settings** (`/settings`) — next-service hour target per equipment.
- **Login** — single shared password.

## How the numbers work

Daily inputs are **cumulative meter readings**. Everything else is computed
(`src/lib/calc.js`):

- Diesel consumption = opening litres − closing litres + received, where litres
  come from the **tank dip calibration** table (dip mm → litres).
- Power/run-hours per day = today's reading − yesterday's.
- Hours remaining to service = configured target − latest reading.

## Local setup

```bash
npm install

# 1. Create .env from the example and fill in DATABASE_URL + APP_PASSWORD
cp .env.example .env

# 2. Create the tables in your Postgres database
npm run db:push

# 3. (optional) Import the existing June data + tank calibration from the workbook
npm run db:seed

# 4. Run
npm run dev
```

Open http://localhost:3000 and log in with `APP_PASSWORD`.

## UI-only mock mode (no DB)

Use this when you want to review all pages and interactions without a running
database.

1. Create `.env` from `.env.example`.
2. Set:
   - `UI_ONLY=true`
   - `APP_PASSWORD` to any value (still used when UI mode is off)
   - `DATABASE_URL` to any syntactically valid Postgres URL (not used while
     `UI_ONLY=true`, but keeps tooling/build scripts happy)
3. Run:

```bash
npm run dev
```

In UI-only mode:
- Auth is auto-allowed by the proxy/auth layer.
- API routes serve realistic in-memory mock data.
- POST/DELETE API operations update in-memory state for the current server
  session only (no persistence across restarts).

## Deploy to Vercel (free)

1. Push this repo to GitHub and **Import** it in Vercel.
2. In the project, open **Storage → Create Database** and pick **Neon** (free
   tier). Vercel injects `DATABASE_URL` automatically.
3. Add an environment variable **`APP_PASSWORD`** (your shared login password).
4. Deploy. The build runs `prisma generate && next build`.
5. Create the schema once against the production DB:
   ```bash
   # locally, with the production DATABASE_URL in your shell/.env
   npm run db:push
   npm run db:seed   # optional, to load the June history
   ```

> Any Postgres works (Neon, Supabase, Prisma Postgres) — only `DATABASE_URL`
> needs to change.

## Project layout

```
prisma/schema.prisma   DailyReading, Setting, DipCalibration
prisma/seed.mjs        Imports data/Jun_2026.xlsx
src/lib/               prisma client, equipment defs, calc layer, auth, dates
src/proxy.js           password gate for all routes
src/app/api/           login, logout, readings, dashboard, settings
src/app/               login, dashboard (/), entry, data, settings pages
```
