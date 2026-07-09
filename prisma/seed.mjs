// Seed the database from the original Excel workbook.
//   node prisma/seed.mjs
// Reads XLSX_PATH (default: ./data/Jun_2026.xlsx).

import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH =
  process.env.XLSX_PATH || path.join(__dirname, "..", "data", "Jun_2026.xlsx");

// Map of normalized PowerHouse-Data row labels -> DB field.
const LABEL_TO_FIELD = {
  "diesel dip reading (mm)": "dieselDipMm",
  "nepa meter reading (kwh)": "nepaMeterKwh",
  "1-comp e75 reading (hours)": "compE75_1Hours",
  "2-comp e75 reading (hours)": "compE75_2Hours",
  "3-comp e75 reading (hours)": "compE75_3Hours",
  "4-comp e55 reading (hours)": "compE55Hours",
  "milling dg reading (hours)": "millingDgHours",
  "parboiling dg reading (hours)": "parboilingDgHours",
  "diesel received": "dieselReceivedLitres",
  "diesel dip after receive": "dieselDipAfterReceiveMm",
  "diesel flow meter reading": "dieselFlowMeterReading",
  milling: "ebMillingKwh",
  "utility / parboiling": "ebUtilityKwh",
  "diesel issued": "dieselIssued",
  "service tanks": "serviceTankLitres",
};

const DEFAULT_SERVICE_HOURS = {
  nextSer_compE75_1: 6000,
  nextSer_compE75_2: 6000,
  nextSer_compE75_3: 6000,
  nextSer_compE55: 6000,
  nextSer_millingDg: 6300,
  nextSer_parboilingDg: 12700,
};

function norm(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellText(cell) {
  const v = cell?.value;
  if (v == null) return "";
  if (typeof v === "object" && "richText" in v) {
    return v.richText.map((t) => t.text).join("");
  }
  return String(v);
}

function cellNumber(cell) {
  const v = cell?.value;
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v.result != null) return Number(v.result); // formula
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function excelSerialToDateStr(serial) {
  // Excel epoch (with the 1900 leap-year bug) = 1899-12-30.
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

async function importDailyReadings(ws) {
  // Row 1 = dates across columns. Find date columns.
  const headerRow = ws.getRow(1);
  const dateCols = []; // { col, dateStr }
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    if (col < 3) return; // col B = labels
    const ds = cellDateStr(cell);
    if (ds) dateCols.push({ col, dateStr: ds });
  });

  // Accumulate values per date.
  const byDate = new Map();
  for (const { dateStr } of dateCols) byDate.set(dateStr, {});

  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const label = norm(cellText(row.getCell(2)));
    const field = LABEL_TO_FIELD[label];
    if (!field) return;
    for (const { col, dateStr } of dateCols) {
      const n = cellNumber(row.getCell(col));
      if (n != null) byDate.get(dateStr)[field] = n;
    }
  });

  let count = 0;
  for (const [dateStr, data] of byDate) {
    if (Object.keys(data).length === 0) continue;
    const date = parseDateOnly(dateStr);
    await prisma.dailyReading.upsert({
      where: { date },
      create: { date, ...data },
      update: data,
    });
    count++;
  }
  return count;
}

async function importDipCalibration(workbook) {
  // Find the "Dip / mm" + "Volume / Litters" header pair on any sheet.
  for (const ws of workbook.worksheets) {
    let dipCol = null;
    let volCol = null;
    let headerRowNum = null;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (dipCol && volCol) return;
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const t = norm(cellText(cell));
        if (t.startsWith("dip /") || t === "dip / mm") {
          dipCol = col;
          headerRowNum = rowNum;
        }
        if (t.startsWith("volume /") || t.includes("litters") || t.includes("litres")) {
          volCol = col;
        }
      });
    });

    if (dipCol && volCol && headerRowNum) {
      const rows = [];
      const seen = new Set();
      for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
        const dip = cellNumber(ws.getCell(r, dipCol));
        const vol = cellNumber(ws.getCell(r, volCol));
        if (dip == null && vol == null) continue;
        if (dip == null || vol == null) continue;
        const dipInt = Math.round(dip);
        if (seen.has(dipInt)) continue;
        seen.add(dipInt);
        rows.push({ dipMm: dipInt, litres: vol });
      }
      if (rows.length > 0) {
        await prisma.dipCalibration.deleteMany();
        // createMany in chunks
        for (let i = 0; i < rows.length; i += 500) {
          await prisma.dipCalibration.createMany({
            data: rows.slice(i, i + 500),
            skipDuplicates: true,
          });
        }
        return rows.length;
      }
    }
  }
  return 0;
}

async function importSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SERVICE_HOURS)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {}, // don't overwrite a user-customized value
    });
  }
}

async function main() {
  console.log(`Reading workbook: ${XLSX_PATH}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const phName = workbook.worksheets.find((w) =>
    norm(w.name).includes("powerhouse")
  )?.name;
  const ws = phName ? workbook.getWorksheet(phName) : workbook.worksheets[1];

  const readings = await importDailyReadings(ws);
  console.log(`  Daily readings upserted: ${readings}`);

  const calib = await importDipCalibration(workbook);
  console.log(`  Dip calibration rows: ${calib}`);

  await importSettings();
  console.log(`  Service-hour settings seeded.`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
