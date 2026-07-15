# PowerHouse MIS Webapp

## What we're building
A web app that replaces `Jun_2026.xlsx` for ZYN Electrical's power house. Engineers enter **daily meter readings** (the `PowerHouse Data` sheet), and the app derives all consumption, run-hours and service-due numbers (the `Summary`, `Compressor`, `Diesel`, `EB`, `Flowmeter` sheets) and shows them on a dashboard.

## Stack (free, Vercel-ready)
- **Next.js (App Router) + TypeScript + React** — one project = React frontend + Node serverless API, deploys to Vercel in one click.
- **Postgres on Neon / Vercel Postgres (free tier)** + **Prisma** ORM.
- **Tailwind CSS** for UI, **Recharts** for charts.
- **Simple login**: one shared password from an env var, sets an httpOnly cookie; Next.js middleware guards all pages/APIs.

## Data model (the key insight)
Daily inputs are **cumulative meter readings**; everything else is a **delta** between consecutive days. Stored input fields per date:
- `dieselDipMm`, `nepaMeterKwh`
- `compE75_1Hours`, `compE75_2Hours`, `compE75_3Hours`, `compE55Hours`
- `millingDgHours`, `parboilingDgHours`
- `dieselReceivedLitres`, `dieselDipAfterReceiveMm`, `dieselFlowMeterReading`
- `ebMillingKwh`, `ebUtilityKwh`, `dieselIssued`, `remarks`

Two supporting tables:
- **`Settings`** — next-service-hour target per equipment (Comp E75-1/2/3, Comp E55, Milling DG, Parboiling DG).
- **`DipCalibration`** — the ~680-row dip-mm to litres lookup (from the `Diesel` sheet's `V:W` calibration columns); diesel stock in litres is derived from the dip reading via this table.

## Computed (server-side, not hand-entered)
- Diesel consumption = opening litres - closing litres + received (litres via dip calibration).
- Nepa/EB consumption = today's meter - yesterday's meter (Milling + Utility split).
- Run hours/day per equipment = today's hour reading - yesterday's.
- Remaining hours to service = `nextServiceHours - currentReading` (with low-hours alerts).

## Pages
- `/login` — shared-password login.
- `/entry` — daily form: pick a date, enter the readings above, save/update. Shows yesterday's values for reference + instantly computed deltas.
- `/data` — month table (the spreadsheet view), editable.
- `/` (Dashboard / Summary) — KPI cards (month diesel consumed, total kWh, run hours per equipment), daily consumption charts (diesel & power), per-equipment run-hour charts, and **service-due alerts**.

## Data migration
A one-off seed script parses `Jun_2026.xlsx` (via `exceljs`) to import existing June readings + the dip calibration table + service-interval settings, so the app launches with real history.

## Deployment
- Push to GitHub, import to Vercel, attach a free Neon/Vercel Postgres, set `DATABASE_URL` + `APP_PASSWORD` env vars, run `prisma migrate deploy` + seed.

## Notes / decisions made
- Using **Next.js** because it is React + a Node backend in a single Vercel deployment (cleanest path); satisfies the "nodejs and react" requirement without a separate server.
- Month is inferred from each entry's date, so the app naturally handles future months (no per-month files).

## Build checklist
1. Scaffold Next.js + TypeScript + Tailwind project; configure for Vercel.
2. Set up Prisma schema (DailyReading, Settings, DipCalibration) + Neon/Vercel Postgres connection.
3. Implement simple shared-password login with httpOnly cookie + route-guarding middleware.
4. Write server-side calc layer: deltas, consumption, dip->litres lookup, remaining service hours.
5. Build daily entry form page (`/entry`) with date picker, prior-day reference, live computed deltas, save API.
6. Build month data table view (`/data`), editable.
7. Build Summary dashboard (`/`) with KPI cards, Recharts charts, and service-due alerts.
8. Write exceljs seed script to import `Jun_2026.xlsx` history, dip calibration, and service settings.
9. Add README + deploy config; document Vercel + Postgres setup and env vars.
