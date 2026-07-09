import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_TAGLINE } from "@/lib/letterhead";

// Shared "ZYN MILS LIMITED" letterhead + table layout for Excel/PDF report exports.

export async function buildExcelReport({ sheetName, title, columnCount, headers, rows }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.addRow([COMPANY_NAME]);
  ws.addRow([COMPANY_ADDRESS]);
  ws.addRow([COMPANY_TAGLINE]);
  ws.addRow([]);
  ws.addRow([title]);
  ws.addRow([]);
  ws.addRow(headers);
  for (const row of rows) {
    ws.addRow(row);
  }

  ws.mergeCells(1, 1, 1, columnCount);
  ws.mergeCells(2, 1, 2, columnCount);
  ws.mergeCells(3, 1, 3, columnCount);
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

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function buildPdfReport({ title, headers, rows, orientation = "landscape" }) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont(undefined, "bold");
  doc.setFontSize(14);
  doc.text(COMPANY_NAME, centerX, 12, { align: "center" });
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text(COMPANY_ADDRESS, centerX, 17, { align: "center" });
  doc.text(COMPANY_TAGLINE, centerX, 21, { align: "center" });
  doc.setDrawColor(15, 23, 42);
  doc.line(14, 26, pageWidth - 14, 26);

  doc.setFontSize(12);
  doc.text(title, 14, 33);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 37,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
  });
  return Buffer.from(doc.output("arraybuffer"));
}
