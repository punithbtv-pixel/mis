import {
  RUN_HOUR_EQUIPMENT,
  DEFAULT_SERVICE_HOURS,
  DEFAULT_SERVICE_ALERT_THRESHOLDS,
  DEFAULT_SERVICE_SCALE,
  thresholdSettingKeyForCategory,
  scaleKeysForCategory,
} from "./equipment";

// Format a Date (or date-like) to YYYY-MM-DD. test
export function toDateStr(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
}

// Build a sorted [ [dipMm, litres], ... ] lookup and interpolate linearly.
export function makeDipLookup(calibration) {
  const points = [...calibration]
    .map((c) => [Number(c.dipMm), Number(c.litres)])
    .sort((a, b) => a[0] - b[0]);

  return function litresFromDip(dip) {
    if (dip == null || Number.isNaN(Number(dip)) || points.length === 0) return null;
    const x = Number(dip);
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
    // binary search for the bracketing pair
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid][0] <= x) lo = mid;
      else hi = mid;
    }
    const [x0, y0] = points[lo];
    const [x1, y1] = points[hi];
    if (x1 === x0) return y0;
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  };
}

function settingsToMap(settings) {
  const map = {
    ...DEFAULT_SERVICE_HOURS,
    ...DEFAULT_SERVICE_ALERT_THRESHOLDS,
    ...DEFAULT_SERVICE_SCALE,
  };
  for (const s of settings ?? []) map[s.key] = Number(s.value);
  return map;
}

function diff(curr, prev) {
  if (curr == null || prev == null) return null;
  const d = Number(curr) - Number(prev);
  return Number.isFinite(d) ? d : null;
}

function round(n, dp = 2) {
  if (n == null || !Number.isFinite(n)) return n;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// Diesel-only rounding: same 2dp rounding as everything else, but a value
// that lands exactly on .50 gets bumped up to the next whole number instead
// of being reported with a half-litre fraction.
function roundDiesel(n, dp = 2) {
  const r = round(n, dp);
  if (r == null || !Number.isFinite(r)) return r;
  const cents = Math.round(r * 100);
  if (Math.abs(cents % 100) === 50) {
    return round(r + 0.5, dp);
  }
  return r;
}

// Core: turn raw daily readings into per-day derived rows.
// `readings` may be in any order; returns rows sorted ascending by date.
export function computeRows(readings, settings, calibration) {
  const litresFromDip = makeDipLookup(calibration ?? []);
  const svc = settingsToMap(settings);

  const sorted = [...readings].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let lastServiceTankLitres = null;

  return sorted.map((r, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;

    // Diesel stock via tank calibration (Main Tank).
    const closingLitres = litresFromDip(r.dieselDipMm);
    const openingLitres = prev ? litresFromDip(prev.dieselDipMm) : null;
    const received = r.dieselReceivedLitres ?? 0;
    let dieselConsumption = null;
    if (openingLitres != null && closingLitres != null) {
      dieselConsumption = openingLitres - closingLitres + received;
    }

    // Service Tank is entered occasionally and held constant until the next entry.
    if (r.serviceTankLitres != null) lastServiceTankLitres = r.serviceTankLitres;
    const serviceTankLitres = lastServiceTankLitres;
    const totalStockLitres =
      closingLitres != null && serviceTankLitres != null
        ? closingLitres + serviceTankLitres
        : null;

    // Grid / EB power.
    const nepaConsumption = diff(r.nepaMeterKwh, prev?.nepaMeterKwh);
    const ebMilling = diff(r.ebMillingKwh, prev?.ebMillingKwh);
    const ebUtility = diff(r.ebUtilityKwh, prev?.ebUtilityKwh);
    let ebTotal = null;
    if (ebMilling != null || ebUtility != null) {
      ebTotal = (ebMilling ?? 0) + (ebUtility ?? 0);
    }
    const ebDifference =
      nepaConsumption != null && ebTotal != null ? nepaConsumption - ebTotal : null;

    // Run hours + remaining service per equipment.
    const runHours = {};
    const remaining = {};
    for (const eq of RUN_HOUR_EQUIPMENT) {
      runHours[eq.field] = round(diff(r[eq.field], prev?.[eq.field]));
      const target = svc[eq.serviceKey];
      const current = r[eq.field];
      remaining[eq.field] =
        current != null && target != null ? round(target - Number(current)) : null;
    }

    return {
      id: r.id,
      date: toDateStr(r.date),
      raw: r,
      dieselConsumption: roundDiesel(dieselConsumption),
      dieselReceived: r.dieselReceivedLitres ?? null,
      closingLitres: roundDiesel(closingLitres),
      serviceTankLitres: roundDiesel(serviceTankLitres),
      totalStockLitres: roundDiesel(totalStockLitres),
      nepaConsumption: round(nepaConsumption),
      ebMilling: round(ebMilling),
      ebUtility: round(ebUtility),
      ebTotal: round(ebTotal),
      ebDifference: round(ebDifference),
      runHours,
      remaining,
    };
  });
}

// The plant reports each day's entry as covering the previous day's
// activity, so the row computed from a given day's reading is relabeled
// to the prior day before it's shown on Monthly Data / the dashboard.
export function shiftRowsToPriorDay(rows) {
  const out = [];
  for (let i = 0; i < rows.length - 1; i++) {
    out.push({ ...rows[i + 1], date: rows[i].date });
  }
  return out;
}

function sum(arr, roundFn = round) {
  const vals = arr.filter((v) => v != null && Number.isFinite(v));
  if (vals.length === 0) return 0;
  return roundFn(vals.reduce((a, b) => a + b, 0));
}

// Build dashboard payload (KPIs, chart series, service alerts) from rows.
export function buildSummary(rows, settings) {
  const svc = settingsToMap(settings);

  const totals = {
    dieselConsumed: sum(rows.map((r) => r.dieselConsumption), roundDiesel),
    dieselReceived: sum(rows.map((r) => r.dieselReceived), roundDiesel),
    nepaKwh: sum(rows.map((r) => r.nepaConsumption)),
    ebMilling: sum(rows.map((r) => r.ebMilling)),
    ebUtility: sum(rows.map((r) => r.ebUtility)),
  };

  const runHoursTotal = {};
  for (const eq of RUN_HOUR_EQUIPMENT) {
    runHoursTotal[eq.field] = sum(rows.map((r) => r.runHours[eq.field]));
  }

  // Latest known remaining-hours per equipment + alert flag.
  const alerts = [];
  for (const eq of RUN_HOUR_EQUIPMENT) {
    let latest = null;
    let latestDate = null;
    for (const r of rows) {
      if (r.remaining[eq.field] != null) {
        latest = r.remaining[eq.field];
        latestDate = r.date;
      }
    }
    const thresholdKey = thresholdSettingKeyForCategory(eq.category);
    const threshold = svc[thresholdKey] ?? DEFAULT_SERVICE_ALERT_THRESHOLDS[thresholdKey];
    const { minKey, maxKey } = scaleKeysForCategory(eq.category);
    alerts.push({
      field: eq.field,
      label: eq.label,
      category: eq.category,
      remaining: latest,
      asOf: latestDate,
      target: svc[eq.serviceKey] ?? null,
      scaleMin: svc[minKey] ?? DEFAULT_SERVICE_SCALE[minKey],
      scaleMax: svc[maxKey] ?? DEFAULT_SERVICE_SCALE[maxKey],
      due: latest != null && latest <= threshold,
    });
  }

  const latestDieselStock = (() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].closingLitres != null) return rows[i].closingLitres;
    }
    return null;
  })();

  const latestServiceTank = (() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].serviceTankLitres != null) return rows[i].serviceTankLitres;
    }
    return null;
  })();

  const latestTotalStock = (() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].totalStockLitres != null) return rows[i].totalStockLitres;
    }
    return null;
  })();

  // Chart series (one point per day).
  const series = rows.map((r) => ({
    date: r.date,
    dieselConsumption: r.dieselConsumption,
    dieselReceived: r.dieselReceived,
    nepaConsumption: r.nepaConsumption,
    ebMilling: r.ebMilling,
    ebUtility: r.ebUtility,
    ...Object.fromEntries(
      RUN_HOUR_EQUIPMENT.map((eq) => [eq.field, r.runHours[eq.field]])
    ),
  }));

  return {
    totals,
    runHoursTotal,
    alerts,
    latestDieselStock,
    latestServiceTank,
    latestTotalStock,
    series,
  };
}
