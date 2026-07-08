// One-off import: backfill DailyReading.serviceTankLitres from the "Service tank
// (Liters)" column in the Diesel sheet of the monthly Excel workbook.
//   node prisma/import-service-tank.mjs
// Reads XLSX_PATH (default: ./data/Jul_2026.xlsx).
//
// Only updates rows that already exist (from the daily-entry form / earlier
// seed); it does not create new DailyReading rows. The value is entered
// occasionally in the sheet and held constant in between — calc.js already
// forward-fills it, so we just store the sparse raw values as-is.

import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH =
  process.env.XLSX_PATH || path.join(__dirname, "..", "data", "Jul_2026.xlsx");

const SERVICE_TANK_COL = 22; // Diesel sheet: "Service tank (Liters)"

function cellNumber(cell) {
  const v = cell?.value;
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v.result != null) return Number(v.result); // formula
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function excelSerialToDateStr(serial) {
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

function cellDateStr(cell) {
  const v = cell?.value;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return excelSerialToDateStr(v);
  return null;
}

function parseDateOnly(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function main() {
  console.log(`Reading workbook: ${XLSX_PATH}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const ws = workbook.getWorksheet("Diesel");
  if (!ws) throw new Error('Worksheet "Diesel" not found');

  let updated = 0;
  let skippedMissing = 0;
  let skippedBlank = 0;

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return; // header
    const dateStr = cellDateStr(row.getCell(1));
    if (!dateStr) return;
    const litres = cellNumber(row.getCell(SERVICE_TANK_COL));
    rows.push({ dateStr, litres });
  });

  for (const { dateStr, litres } of rows) {
    if (litres == null) {
      skippedBlank++;
      continue;
    }
    const date = parseDateOnly(dateStr);
    const result = await prisma.dailyReading.updateMany({
      where: { date },
      data: { serviceTankLitres: litres },
    });
    if (result.count === 0) {
      skippedMissing++;
      console.log(`  No existing DailyReading for ${dateStr} — skipped`);
    } else {
      updated++;
    }
  }

  console.log(`Service tank values updated: ${updated}`);
  console.log(`Blank cells skipped: ${skippedBlank}`);
  console.log(`Rows skipped (no matching DailyReading): ${skippedMissing}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
