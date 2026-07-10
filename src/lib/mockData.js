import { buildSummary, computeRows, shiftRowsToPriorDay } from "@/lib/calc";
import { monthRange, parseDateOnly } from "@/lib/dates";
import {
  DEFAULT_SERVICE_HOURS,
  NUMERIC_FIELDS,
  TEXT_FIELDS,
  SERVICE_KEYS,
  THRESHOLD_SETTING_KEYS,
  DEFAULT_SERVICE_ALERT_THRESHOLDS,
} from "@/lib/equipment";
import { MAINTENANCE_TYPE_VALUES, isValidTimeStr, DEFAULT_STAFF } from "@/lib/maintenanceLog";

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
    serviceTankLitres: n % 8 === 0 ? 4200 + (n % 5) * 150 : null,
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

function makeInitialMaintenanceLogs() {
  const rows = [
    { date: "2026-07-09", plant: "Milling", section: "Milling Section", equipment: "CC1 / Chain conveyor", startTime: "09:00", endTime: "10:30", type: "PREVENTIVE", detail: "Bearing noise on drive-end, replaced bearing and re-aligned belt.", spareParts: ["Bearing 6205", "V-belt A47"], attendedBy: ["Lucky", "Bakari Lawal"] },
    { date: "2026-07-09", plant: "Powerhouse", section: "Powerhouse Section", equipment: "AIR Compressor E75 - 2", startTime: "14:10", endTime: "16:40", type: "BREAKDOWN", detail: "Tripped on high discharge temp; cleaned cooler fins, reset overload.", spareParts: ["Air filter", "Overload relay"], attendedBy: ["Gideon Micah", "James"] },
    { date: "2026-07-08", plant: "Boiler", section: "Boiler Section", equipment: "FD Fan - 1", startTime: "08:00", endTime: "08:45", type: "PREVENTIVE", detail: "Monthly vibration check and grease top-up.", spareParts: ["Grease NLGI-2"], attendedBy: ["Anthony I. Amedu"] },
    { date: "2026-07-05", plant: "Milling", section: "Sorting Section", equipment: "Sortex-Spark Pro 10_A", startTime: "15:00", endTime: "18:20", type: "PROJECT", detail: "Installed upgraded ejector valve bank as part of capacity project.", spareParts: ["Ejector valve bank v2"], attendedBy: ["Abdulmajid Abdulraham", "Anthony Inuwa", "Joseph F Matthew"] },
  ];
  return rows.map((r, i) => ({
    id: i + 1,
    createdByUsername: "demo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...r,
  }));
}

function buildInitialState() {
  const settings = {
    ...DEFAULT_SERVICE_HOURS,
    ...DEFAULT_SERVICE_ALERT_THRESHOLDS,
    nextSer_compE75_1: 6200,
    nextSer_compE75_2: 6150,
    nextSer_compE75_3: 6280,
    nextSer_compE55: 6020,
    nextSer_millingDg: 6420,
    nextSer_parboilingDg: 12900,
  };
  const readings = generateInitialReadings();
  const byDate = new Map(readings.map((r) => [r.date, r]));
  const maintenanceLogs = makeInitialMaintenanceLogs();
  const staff = DEFAULT_STAFF.map((s, i) => ({ id: i + 1, ...s }));
  return {
    nextId: readings.length + 1,
    readingsByDate: byDate,
    settings,
    calibration: makeDefaultCalibration(),
    maintenanceLogs,
    nextMaintenanceLogId: maintenanceLogs.length + 1,
    staff,
    nextStaffId: staff.length + 1,
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
  const next = sorted.find((r) => new Date(`${r.date}T00:00:00.000Z`) >= lt);
  const settingsRows = toSettingsRows(state.settings);
  const withNext = next ? [...monthRows, next] : monthRows;
  const allComputedRows = computeRows(withNext, settingsRows, state.calibration);
  const rows = shiftRowsToPriorDay(allComputedRows);
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
  for (const field of TEXT_FIELDS) {
    if (field in body) next[field] = body[field] || null;
    else if (!(field in next)) next[field] = null;
  }

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
  const keys = [...SERVICE_KEYS, ...THRESHOLD_SETTING_KEYS];
  for (const key of keys) {
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

function normalizeStringArray(v) {
  if (v == null) return [];
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s).trim()).filter(Boolean);
}

function validateMaintenanceLogBody(body) {
  const date = parseDateOnly(body.date);
  if (!date) return { error: "Invalid or missing date" };
  if (!body.plant || !body.section || !body.equipment) {
    return { error: "Plant, section and equipment are required" };
  }
  if (!isValidTimeStr(body.startTime) || !isValidTimeStr(body.endTime)) {
    return { error: "Start and end time must be HH:MM" };
  }
  if (!MAINTENANCE_TYPE_VALUES.includes(body.type)) {
    return { error: "Invalid maintenance type" };
  }
  const attendedBy = normalizeStringArray(body.attendedBy);
  if (attendedBy.length === 0) {
    return { error: "At least one person must be selected in Attended by" };
  }
  return {
    dateStr: date.toISOString().slice(0, 10),
    plant: String(body.plant),
    section: String(body.section),
    equipment: String(body.equipment),
    startTime: body.startTime,
    endTime: body.endTime,
    type: body.type,
    detail: body.detail ? String(body.detail) : null,
    spareParts: normalizeStringArray(body.spareParts),
    attendedBy,
  };
}

export function getMockMaintenanceLogs(month, type) {
  const state = getState();
  let rows = [...state.maintenanceLogs];
  if (month) rows = rows.filter((r) => r.date.startsWith(month));
  if (type && type !== "All") rows = rows.filter((r) => r.type === type);
  rows.sort((a, b) => (a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date)));
  return { rows };
}

export function getMockMaintenanceLog(id) {
  const state = getState();
  return state.maintenanceLogs.find((r) => r.id === Number(id)) ?? null;
}

export function createMockMaintenanceLog(body, session) {
  const parsed = validateMaintenanceLogBody(body);
  if (parsed.error) return { error: parsed.error, status: 400 };

  const state = getState();
  const now = new Date().toISOString();
  const row = {
    id: state.nextMaintenanceLogId++,
    date: parsed.dateStr,
    plant: parsed.plant,
    section: parsed.section,
    equipment: parsed.equipment,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    type: parsed.type,
    detail: parsed.detail,
    spareParts: parsed.spareParts,
    attendedBy: parsed.attendedBy,
    createdByUsername: session?.username ?? null,
    createdAt: now,
    updatedAt: now,
  };
  state.maintenanceLogs.push(row);
  return { log: row, status: 200 };
}

export function updateMockMaintenanceLog(id, body) {
  const state = getState();
  const idx = state.maintenanceLogs.findIndex((r) => r.id === Number(id));
  if (idx === -1) return { error: "Not found", status: 404 };

  const parsed = validateMaintenanceLogBody(body);
  if (parsed.error) return { error: parsed.error, status: 400 };

  const row = {
    ...state.maintenanceLogs[idx],
    date: parsed.dateStr,
    plant: parsed.plant,
    section: parsed.section,
    equipment: parsed.equipment,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    type: parsed.type,
    detail: parsed.detail,
    spareParts: parsed.spareParts,
    attendedBy: parsed.attendedBy,
    updatedAt: new Date().toISOString(),
  };
  state.maintenanceLogs[idx] = row;
  return { log: row, status: 200 };
}

export function getMockStaff() {
  const state = getState();
  return { staff: [...state.staff] };
}

export function createMockStaff(body) {
  const name = String(body?.name ?? "").trim();
  const designation = String(body?.designation ?? "").trim();
  if (!name || !designation) {
    return { error: "Name and designation are required", status: 400 };
  }
  const state = getState();
  if (state.staff.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    return { error: "A staff member with this name already exists", status: 400 };
  }
  const row = { id: state.nextStaffId++, name, designation };
  state.staff.push(row);
  return { staff: row, status: 200 };
}

export function updateMockStaff(id, body) {
  const state = getState();
  const idx = state.staff.findIndex((s) => s.id === Number(id));
  if (idx === -1) return { error: "Not found", status: 404 };

  const name = String(body?.name ?? "").trim();
  const designation = String(body?.designation ?? "").trim();
  if (!name || !designation) {
    return { error: "Name and designation are required", status: 400 };
  }
  if (state.staff.some((s) => s.id !== Number(id) && s.name.toLowerCase() === name.toLowerCase())) {
    return { error: "A staff member with this name already exists", status: 400 };
  }
  state.staff[idx] = { ...state.staff[idx], name, designation };
  return { staff: state.staff[idx], status: 200 };
}

export function deleteMockStaff(id) {
  const state = getState();
  const idx = state.staff.findIndex((s) => s.id === Number(id));
  if (idx === -1) return { error: "Not found", status: 404 };
  state.staff.splice(idx, 1);
  return { ok: true, status: 200 };
}

