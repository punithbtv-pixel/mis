import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockMaintenanceLogs } from "@/lib/mockData";
import { getSession } from "@/lib/apiAuth";
import {
  LOG_REPORT_COLUMNS,
  logReportHeaders,
  rowToLogReportCells,
} from "@/lib/maintenanceLogReport";
import { buildExcelReport, buildPdfReport } from "@/lib/exportDoc";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function serialize(row) {
  return { ...row, date: toDateStr(row.date) };
}

async function fetchLogRows(month, type) {
  if (isUiOnlyMode()) {
    const data = getMockMaintenanceLogs(month, type);
    return data.rows ?? [];
  }

  const { gte, lt } = monthRange(month);
  const rows = await prisma.maintenanceLog.findMany({
    where: {
      date: { gte, lt },
      ...(type && type !== "All" ? { type } : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  return rows.map(serialize);
}

// GET /api/maintenance-logs/export?month=YYYY-MM&type=All&format=excel|pdf
export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  const type = searchParams.get("type") || "All";
  const format = (searchParams.get("format") || "excel").toLowerCase();

  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (format !== "excel" && format !== "pdf") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const rows = await fetchLogRows(month, type);
  const title = `Daily Log Data (${month})`;

  if (format === "pdf") {
    const body = buildPdfReport({
      title,
      headers: logReportHeaders(),
      rows: rows.map(rowToLogReportCells),
    });
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="daily-log-${month}.pdf"`,
      },
    });
  }

  const body = await buildExcelReport({
    sheetName: "Daily Log Data",
    title,
    columnCount: LOG_REPORT_COLUMNS.length,
    headers: logReportHeaders(),
    rows: rows.map(rowToLogReportCells),
  });
  return new NextResponse(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="daily-log-${month}.xlsx"`,
    },
  });
}
