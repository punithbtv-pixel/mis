// Central definitions for the power-house equipment and daily input fields.
// Keeping this in one place keeps the form, table, dashboard and seed in sync.

// Equipment that have hour-meters and a "next service" target.
export const RUN_HOUR_EQUIPMENT = [
  { field: "compE75_1Hours", label: "Comp E75 #1", serviceKey: "nextSer_compE75_1" },
  { field: "compE75_2Hours", label: "Comp E75 #2", serviceKey: "nextSer_compE75_2" },
  { field: "compE75_3Hours", label: "Comp E75 #3", serviceKey: "nextSer_compE75_3" },
  { field: "compE55Hours", label: "Comp E55", serviceKey: "nextSer_compE55" },
  { field: "millingDgHours", label: "Milling DG", serviceKey: "nextSer_millingDg" },
  { field: "parboilingDgHours", label: "Parboiling DG", serviceKey: "nextSer_parboilingDg" },
];

// Default service interval target (hours) used when a Setting is missing.
export const DEFAULT_SERVICE_HOURS = {
  nextSer_compE75_1: 6000,
  nextSer_compE75_2: 6000,
  nextSer_compE75_3: 6000,
  nextSer_compE55: 6000,
  nextSer_millingDg: 5824,
  nextSer_parboilingDg: 12643.5,
};

// Remaining-hours threshold below which we raise a "service due" alert.
export const SERVICE_ALERT_THRESHOLD = 250;

// Grouped definition of everything entered on the daily form.
export const INPUT_GROUPS = [
  {
    title: "Diesel",
    fields: [
      { field: "dieselDipMm", label: "Dip stick reading", unit: "mm" },
      { field: "dieselReceivedLitres", label: "Diesel received", unit: "L" },
      { field: "dieselDipAfterReceiveMm", label: "Dip after receive", unit: "mm" },
      { field: "dieselFlowMeterReading", label: "Flow meter reading", unit: "" },
      { field: "dieselIssued", label: "Diesel issued", unit: "L" },
    ],
  },
  {
    title: "Grid / EB Power",
    fields: [
      { field: "nepaMeterKwh", label: "NEPA main meter", unit: "KWH" },
      { field: "ebMillingKwh", label: "EB Milling meter", unit: "KWH" },
      { field: "ebUtilityKwh", label: "EB Utility / Parboiling meter", unit: "KWH" },
    ],
  },
  {
    title: "Compressors (hour meters)",
    fields: [
      { field: "compE75_1Hours", label: "Comp E75 #1", unit: "hrs" },
      { field: "compE75_2Hours", label: "Comp E75 #2", unit: "hrs" },
      { field: "compE75_3Hours", label: "Comp E75 #3", unit: "hrs" },
      { field: "compE55Hours", label: "Comp E55", unit: "hrs" },
    ],
  },
  {
    title: "Generators (hour meters)",
    fields: [
      { field: "millingDgHours", label: "Milling DG", unit: "hrs" },
      { field: "parboilingDgHours", label: "Parboiling DG", unit: "hrs" },
    ],
  },
];

// Flat list of all numeric input field names (for parsing/validation).
export const NUMERIC_FIELDS = INPUT_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.field)
);

export const SERVICE_KEYS = RUN_HOUR_EQUIPMENT.map((e) => e.serviceKey);
