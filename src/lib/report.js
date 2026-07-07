import { RUN_HOUR_EQUIPMENT } from "@/lib/equipment";

export const REPORT_COLUMNS = [
  { key: "date", header: "Date", width: 12 },
  { key: "dieselDipMm", header: "Dip (mm)", width: 10 },
  { key: "dieselConsumption", header: "Diesel Consumption (L)", width: 18 },
  { key: "dieselReceived", header: "Received (L)", width: 12 },
  { key: "closingLitres", header: "Stock (L)", width: 12 },
  { key: "dieselDipAfterReceiveMm", header: "Dip After (mm)", width: 14 },
  { key: "dieselFlowMeterReading", header: "Flow", width: 10 },
  { key: "dieselIssued", header: "Issued (L)", width: 10 },
  { key: "nepaConsumption", header: "NEPA (KWH)", width: 12 },
  { key: "ebMilling", header: "Milling", width: 10 },
  { key: "ebUtility", header: "Utility", width: 10 },
  ...RUN_HOUR_EQUIPMENT.map((eq) => ({
    key: eq.field,
    header: eq.label,
    width: 14,
    runHours: true,
  })),
  { key: "remarks", header: "Remarks", width: 24 },
];

function fmtCell(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
  }
  return String(v);
}

export function rowToReportCells(row) {
  const rawFields = new Set([
    "dieselDipMm",
    "dieselDipAfterReceiveMm",
    "dieselFlowMeterReading",
    "dieselIssued",
  ]);
  return REPORT_COLUMNS.map((col) => {
    if (col.runHours) return fmtCell(row.runHours?.[col.key]);
    if (col.key === "date") return row.date;
    if (col.key === "remarks") return row.raw?.remarks ?? "";
    if (rawFields.has(col.key)) return fmtCell(row.raw?.[col.key]);
    return fmtCell(row[col.key]);
  });
}

export function reportHeaders() {
  return REPORT_COLUMNS.map((c) => c.header);
}
