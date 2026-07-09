import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRows } from "@/lib/calc";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockDashboard } from "@/lib/mockData";
import { getSession } from "@/lib/apiAuth";
import { reportHeaders, rowToReportCells, REPORT_COLUMNS } from "@/lib/report";
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_TAGLINE,
  LOGO_ASPECT_RATIO,
  readLogoBuffer,
} from "@/lib/letterhead";
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
  const lastCol = REPORT_COLUMNS.length;

  ws.addRow([COMPANY_NAME]);
  ws.addRow([COMPANY_ADDRESS]);
  ws.addRow([COMPANY_TAGLINE]);
  ws.addRow([]);
  ws.addRow([`PowerHouse MIS — Monthly Data (${month})`]);
  ws.addRow([]);
  ws.addRow(reportHeaders());
  for (const row of rows) {
    ws.addRow(rowToReportCells(row));
  }

  ws.mergeCells(1, 1, 1, lastCol);
  ws.mergeCells(2, 1, 2, lastCol);
  ws.mergeCells(3, 1, 3, lastCol);
  ws.getRow(1).font = { bold: true, size: 16 };
  ws.getRow(2).font = { size: 10 };
  ws.getRow(3).font = { size: 10 };
  for (let r = 1; r <= 3; r++) {
    ws.getRow(r).alignment = { horizontal: "center", vertical: "middle" };
  }
  ws.getRow(1).height = 20;
  ws.getRow(2).height = 15;
  ws.getRow(3).height = 15;

  ws.getRow(5).font = { bold: true, size: 14 };
  ws.getRow(7).font = { bold: true };
  ws.columns.forEach((col) => {
    col.width = 14;
  });

  const logoBuffer = readLogoBuffer();
  const imageId = wb.addImage({ buffer: logoBuffer, extension: "png" });
  const logoWidth = 110;
  ws.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: logoWidth, height: Math.round(logoWidth / LOGO_ASPECT_RATIO) },
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function buildPdfBuffer(month, rows) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  const logoWidth = 24;
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const logoBase64 = readLogoBuffer().toString("base64");
  doc.addImage(`data:image/png;base64,${logoBase64}`, "PNG", 14, 8, logoWidth, logoHeight);

  doc.setFont(undefined, "bold");
  doc.setFontSize(14);
  doc.text(COMPANY_NAME, centerX, 13, { align: "center" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text(COMPANY_ADDRESS, centerX, 18, { align: "center" });
  doc.text(COMPANY_TAGLINE, centerX, 22, { align: "center" });
  doc.setDrawColor(15, 23, 42);
  doc.line(14, 27, pageWidth - 14, 27);

  doc.setFontSize(12);
  doc.text(`PowerHouse MIS — Monthly Data (${month})`, 14, 34);

  autoTable(doc, {
    head: [reportHeaders()],
    body: rows.map(rowToReportCells),
    startY: 38,
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
