import { RUN_HOUR_EQUIPMENT } from "@/lib/equipment";

export const REPORT_COLUMNS = [
  { key: "date", header: "Date", width: 12 },
  { key: "dieselDipMm", header: "Dip (mm)", width: 10, from: "raw", category: "diesel" },
  { key: "dieselConsumption", header: "Diesel Consumption (L)", width: 18, category: "diesel" },
  { key: "dieselReceived", header: "Received (L)", width: 12, category: "diesel" },
  { key: "closingLitres", header: "Main Tank Stock (L)", width: 16, category: "diesel" },
  { key: "serviceTankLitres", header: "Service Tank Stock (L)", width: 16, category: "diesel" },
  { key: "totalStockLitres", header: "Current Total Stock (L)", width: 18, category: "diesel" },
  { key: "dieselDipAfterReceiveMm", header: "Dip After (mm)", width: 14, from: "raw", category: "diesel" },
  { key: "dieselFlowMeterReading", header: "Flow", width: 10, from: "raw", category: "diesel" },
  { key: "dieselIssued", header: "Issued (L)", width: 10, from: "raw", category: "diesel" },
  { key: "nepaMeterKwh", header: "NEPA Meter (KWH)", width: 14, from: "raw", category: "power" },
  { key: "nepaConsumption", header: "NEPA Consumption (KWH)", width: 14, category: "power" },
  { key: "ebMillingKwh", header: "Milling Meter (KWH)", width: 14, from: "raw", category: "power" },
  { key: "ebMilling", header: "Milling Consumption (KWH)", width: 14, category: "power" },
  { key: "ebUtilityKwh", header: "Utility Meter (KWH)", width: 14, from: "raw", category: "power" },
  { key: "ebUtility", header: "Utility Consumption (KWH)", width: 14, category: "power" },
  ...RUN_HOUR_EQUIPMENT.flatMap((eq) => [
    {
      key: `${eq.field}_reading`,
      header: `${eq.label} Reading (hrs)`,
      width: 16,
      from: "raw",
      field: eq.field,
      category: eq.category,
      decimals: 1,
    },
    {
      key: eq.field,
      header: `${eq.label} Run Time (hrs)`,
      width: 14,
      from: "runHours",
      category: eq.category,
      decimals: 1,
    },
    {
      key: `${eq.field}_remaining`,
      header: `${eq.label} Remaining (hrs)`,
      width: 16,
      from: "remaining",
      field: eq.field,
      category: eq.category,
      decimals: 1,
    },
  ]),
  { key: "remarks", header: "Remarks", width: 24 },
];

// Columns offered as tick-boxes on the Monthly Data page (mirrors what's
// shown on screen; excludes the legacy/always-empty raw dip-after & flow fields).
export const SELECTABLE_REPORT_COLUMNS = REPORT_COLUMNS.filter(
  (c) => c.key !== "dieselDipAfterReceiveMm" && c.key !== "dieselFlowMeterReading"
);

// Category filter options for the Monthly Data page dropdown. `null` category
// columns (date, remarks) are always shown regardless of the selected filter.
export const DATA_CATEGORIES = [
  { value: "all", label: "All Columns" },
  { value: "diesel", label: "Diesel" },
  { value: "power", label: "Power" },
  { value: "dg", label: "DG" },
  { value: "comp", label: "Air Comp" },
];

export function columnVisibleForCategory(col, category) {
  return category === "all" || col.category == null || col.category === category;
}

function fmtCell(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
  }
  return String(v);
}

// Raw (unformatted) value for a column, shared by the on-screen table and export.
export function reportCellValue(row, col) {
  const field = col.field ?? col.key;
  switch (col.from) {
    case "raw":
      return row.raw?.[field];
    case "runHours":
      return row.runHours?.[field];
    case "remaining":
      return row.remaining?.[field];
    default:
      if (col.key === "date") return row.date;
      if (col.key === "remarks") return row.raw?.remarks ?? "";
      return row[field];
  }
}

export function rowToReportCells(row, columns = REPORT_COLUMNS) {
  return columns.map((col) => fmtCell(reportCellValue(row, col)));
}

export function reportHeaders(columns = REPORT_COLUMNS) {
  return columns.map((c) => c.header);
}
