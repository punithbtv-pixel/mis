import { durationMinutes, formatDuration, maintenanceTypeLabel } from "@/lib/maintenanceLog";

export const LOG_REPORT_COLUMNS = [
  { key: "date", header: "Date" },
  { key: "plant", header: "Plant" },
  { key: "section", header: "Section" },
  { key: "equipment", header: "Equipment" },
  { key: "startTime", header: "Start" },
  { key: "endTime", header: "End" },
  { key: "duration", header: "Duration" },
  { key: "type", header: "Type" },
  { key: "detail", header: "Detail" },
  { key: "spareParts", header: "Spare Parts" },
  { key: "attendedBy", header: "Attended By" },
];

export function logReportHeaders() {
  return LOG_REPORT_COLUMNS.map((c) => c.header);
}

export function rowToLogReportCells(row) {
  return [
    row.date,
    row.plant,
    row.section,
    row.equipment,
    row.startTime,
    row.endTime,
    formatDuration(durationMinutes(row.startTime, row.endTime)),
    maintenanceTypeLabel(row.type),
    row.detail ?? "",
    (row.spareParts ?? []).join(", "),
    (row.attendedBy ?? []).join(", "),
  ];
}
