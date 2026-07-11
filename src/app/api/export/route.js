import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRows, shiftRowsToPriorDay } from "@/lib/calc";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockDashboard } from "@/lib/mockData";
import { getSession } from "@/lib/apiAuth";
import { reportHeaders, rowToReportCells, REPORT_COLUMNS } from "@/lib/report";
import { buildExcelReport, buildPdfReport } from "@/lib/exportDoc";

async function fetchReportRows(month) {
  if (isUiOnlyMode()) {
    const data = getMockDashboard(month);
    return data.rows ?? [];
  }

  const { gte, lt } = monthRange(month);
  const [readings, next, settings, calibration] = await Promise.all([
    prisma.dailyReading.findMany({
      where: { date: { gte, lt } },
      orderBy: { date: "asc" },
    }),
    prisma.dailyReading.findFirst({
      where: { date: { gte: lt } },
      orderBy: { date: "asc" },
    }),
    prisma.setting.findMany(),
    prisma.dipCalibration.findMany(),
  ]);

  const withNext = next ? [...readings, next] : readings;
  const computedRows = computeRows(withNext, settings, calibration);
  return shiftRowsToPriorDay(computedRows);
}

// GET /api/export?month=YYYY-MM&format=excel|pdf
export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  const format = (searchParams.get("format") || "excel").toLowerCase();
  const datesParam = searchParams.get("dates");
  const columnsParam = searchParams.get("columns");

  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (format !== "excel" && format !== "pdf") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  let rows = await fetchReportRows(month);
  if (datesParam) {
    const wanted = new Set(datesParam.split(",").filter(Boolean));
    rows = rows.filter((r) => wanted.has(r.date));
  }

  let columns = REPORT_COLUMNS;
  if (columnsParam) {
    const wantedCols = new Set(columnsParam.split(",").filter(Boolean));
    columns = REPORT_COLUMNS.filter((c) => wantedCols.has(c.key));
  }

  const title = `PowerHouse MIS — Monthly Data (${month})`;

  if (format === "pdf") {
    const body = buildPdfReport({
      title,
      headers: reportHeaders(columns),
      rows: rows.map((r) => rowToReportCells(r, columns)),
    });
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="powerhouse-${month}.pdf"`,
      },
    });
  }

  const body = await buildExcelReport({
    sheetName: "PowerHouse Data",
    title,
    columnCount: columns.length,
    headers: reportHeaders(columns),
    rows: rows.map((r) => rowToReportCells(r, columns)),
  });
  return new NextResponse(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="powerhouse-${month}.xlsx"`,
    },
  });
}
