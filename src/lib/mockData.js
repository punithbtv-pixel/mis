import { buildSummary, computeRows } from "@/lib/calc";
import { monthRange, parseDateOnly } from "@/lib/dates";
import { DEFAULT_SERVICE_HOURS, NUMERIC_FIELDS, SERVICE_KEYS } from "@/lib/equipment";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function makeReading(id, date, prev = null) {
  const n = id;
  return {
    id,
    date: toDateStr(date),
    dieselDipMm: Math.max(165, Math.round((prev?.dieselDipMm ?? 345) - 4 + (n % 5))),
    dieselReceivedLitres: n % 7 === 0 ? 700 : n % 11 === 0 ? 450 : 0,
    dieselDipAfterReceiveMm: null,
    dieselFlowMeterReading: 6000 + n * 32,
    dieselIssued: n % 3 === 0 ? 42 : 0,
    nepaMeterKwh: (prev?.nepaMeterKwh ?? 145000) + 220 + (n % 20),
    ebMillingKwh: (prev?.ebMillingKwh ?? 50100) + 122 + (n % 12),
    ebUtilityKwh: (prev?.ebUtilityKwh ?? 38200) + 90 + (n % 8),
    compE75_1Hours: (prev?.compE75_1Hours ?? 5870) + 7.5,
    compE75_2Hours: (prev?.compE75_2Hours ?? 5665) + 6.2,
    compE75_3Hours: (prev?.compE75_3Hours ?? 5925) + 6.8,
    compE55Hours: (prev?.compE55Hours ?? 5480) + 5.1,
    millingDgHours: (prev?.millingDgHours ?? 6110) + 4.9,
    parboilingDgHours: (prev?.parboilingDgHours ?? 12370) + 5.7,
    remarks: n % 9 === 0 ? "Fuel delivery and routine checks completed." : "",
  };
}

function generateInitialReadings() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 20));
  const out = [];
  let prev = null;
  for (let i = 0; i < 42; i++) {
    const reading = makeReading(i + 1, addDays(start, i), prev);
    reading.dieselDipAfterReceiveMm =
      reading.dieselReceivedLitres > 0 ? reading.dieselDipMm + 12 : null;
    out.push(reading);
    prev = reading;
  }
  return out;
}

function makeDefaultCalibration() {
  return [
    { dipMm: 150, litres: 3900 },
    { dipMm: 180, litres: 4700 },
    { dipMm: 220, litres: 5650 },
    { dipMm: 260, litres: 6620 },
    { dipMm: 300, litres: 7600 },
    { dipMm: 340, litres: 8600 },
    { dipMm: 380, litres: 9600 },
    { dipMm: 420, litres: 10600 },
  ];
}

function toSettingsRows(map) {
  return SERVICE_KEYS.map((key) => ({ key, value: Number(map[key]) }));
}

function buildInitialState() {
  const settings = {
    ...DEFAULT_SERVICE_HOURS,
    nextSer_compE75_1: 6200,
    nextSer_compE75_2: 6150,
    nextSer_compE75_3: 6280,
    nextSer_compE55: 6020,
    nextSer_millingDg: 6420,
    nextSer_parboilingDg: 12900,
  };
  const readings = generateInitialReadings();
  const byDate = new Map(readings.map((r) => [r.date, r]));
  return {
    nextId: readings.length + 1,
    readingsByDate: byDate,
    settings,
    calibration: makeDefaultCalibration(),
  };
}

function getState() {
  if (!globalThis.__phMockState) {
    globalThis.__phMockState = buildInitialState();
  }
  return globalThis.__phMockState;
}

function toSortedReadings(readingsByDate) {
  return [...readingsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function inRange(dateStr, gte, lt) {
  const dt = new Date(`${dateStr}T00:00:00.000Z`);
  return dt >= gte && dt < lt;
}

function serialize(reading) {
  if (!reading) return null;
  return { ...reading };
}

export function getMockDashboard(month) {
  const state = getState();
  const { gte, lt } = monthRange(month);
  const sorted = toSortedReadings(state.readingsByDate);
  const monthRows = sorted.filter((r) => inRange(r.date, gte, lt));
  const prior = [...sorted].reverse().find((r) => new Date(`${r.date}T00:00:00.000Z`) < gte);
  const settingsRows = toSettingsRows(state.settings);
  const withPrior = prior ? [prior, ...monthRows] : monthRows;
  const computedRows = computeRows(withPrior, settingsRows, state.calibration);
  const rows = prior ? computedRows.slice(1) : computedRows;
  const summary = buildSummary(rows, settingsRows);
  return { month, rows, ...summary };
}

export function getMockReadings(month) {
  const state = getState();
  const { gte, lt } = monthRange(month);
  const readings = toSortedReadings(state.readingsByDate)
    .filter((r) => inRange(r.date, gte, lt))
    .map(serialize);
  return { month, readings };
}

export function getMockReadingWithPrevious(dateStr) {
  const state = getState();
  const sorted = toSortedReadings(state.readingsByDate);
  const reading = state.readingsByDate.get(dateStr) || null;
  let previous = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].date < dateStr) {
      previous = sorted[i];
      break;
    }
  }
  return { reading: serialize(reading), previous: serialize(previous) };
}

export function upsertMockReading(body) {
  const state = getState();
  const date = parseDateOnly(body.date);
  if (!date) {
    return { error: "Invalid or missing date", status: 400 };
  }
  const dateStr = toDateStr(date);
  const existing = state.readingsByDate.get(dateStr);
  const next = existing
    ? { ...existing }
    : { id: state.nextId++, date: dateStr };

  for (const field of NUMERIC_FIELDS) {
    if (field in body) {
      const v = body[field];
      if (v === "" || v == null) {
        next[field] = null;
      } else {
        const parsed = Number(v);
        if (!Number.isFinite(parsed)) {
          return { error: `Invalid number for ${field}`, status: 400 };
        }
        next[field] = parsed;
      }
    } else if (!(field in next)) {
      next[field] = null;
    }
  }

  if ("remarks" in body) next.remarks = body.remarks || null;
  else if (!("remarks" in next)) next.remarks = null;

  state.readingsByDate.set(dateStr, next);
  return { reading: serialize(next), status: 200 };
}

export function deleteMockReading(dateStr) {
  const state = getState();
  state.readingsByDate.delete(dateStr);
  return { ok: true };
}

export function getMockSettings() {
  return { settings: { ...getState().settings } };
}

export function updateMockSettings(body) {
  const state = getState();
  for (const key of SERVICE_KEYS) {
    if (key in body && body[key] !== "" && body[key] != null) {
      const value = Number(body[key]);
      if (!Number.isFinite(value)) {
        return { error: `Invalid value for ${key}`, status: 400 };
      }
      state.settings[key] = value;
    }
  }
  return { settings: { ...state.settings }, status: 200 };
}

