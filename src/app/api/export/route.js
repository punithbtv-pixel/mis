import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRows } from "@/lib/calc";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockDashboard } from "@/lib/mockData";
import { getSession } from "@/lib/apiAuth";
import { reportHeaders, rowToReportCells } from "@/lib/report";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

async function fetchReportRows(month) {
  if (isUiOnlyMode()) {
    const data = getMockDashboard(month);
    return data.rows ?? [];
  }

  const { gte, lt } = monthRange(month);
  const [readings, prior, settings, calibration] = await Promise.all([
    prisma.dailyReading.findMany({
      where: { date: { gte, lt } },
      orderBy: { date: "asc" },
    }),
    prisma.dailyReading.findFirst({
      where: { date: { lt: gte } },
      orderBy: { date: "desc" },
    }),
    prisma.setting.findMany(),
    prisma.dipCalibration.findMany(),
  ]);

  const withPrior = prior ? [prior, ...readings] : readings;
  const allRows = computeRows(withPrior, settings, calibration);
  return prior ? allRows.slice(1) : allRows;
}

async function buildExcelBuffer(month, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PowerHouse Data");
  ws.addRow([`PowerHouse MIS — Monthly Data (${month})`]);
  ws.addRow([]);
  ws.addRow(reportHeaders());
  for (const row of rows) {
    ws.addRow(rowToReportCells(row));
  }
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.getRow(3).font = { bold: true };
  ws.columns.forEach((col) => {
    col.width = 14;
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function buildPdfBuffer(month, rows) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(`PowerHouse MIS — Monthly Data (${month})`, 14, 14);
  autoTable(doc, {
    head: [reportHeaders()],
    body: rows.map(rowToReportCells),
    startY: 20,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
  });
  return Buffer.from(doc.output("arraybuffer"));
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

  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (format !== "excel" && format !== "pdf") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const rows = await fetchReportRows(month);

  if (format === "pdf") {
    const body = buildPdfBuffer(month, rows);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="powerhouse-${month}.pdf"`,
      },
    });
  }

  const body = await buildExcelBuffer(month, rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="powerhouse-${month}.xlsx"`,
    },
  });
}
