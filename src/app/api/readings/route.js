import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NUMERIC_FIELDS, TEXT_FIELDS } from "@/lib/equipment";
import {
  currentMonth,
  isValidMonth,
  monthRange,
  parseDateOnly,
} from "@/lib/dates";
import { toDateStr } from "@/lib/calc";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockReadings, upsertMockReading } from "@/lib/mockData";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";

function serialize(r) {
  return { ...r, date: toDateStr(r.date) };
}

// GET /api/readings?month=YYYY-MM  -> raw readings for that month (asc).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(getMockReadings(month));
  }

  const { gte, lt } = monthRange(month);
  const readings = await prisma.dailyReading.findMany({
    where: { date: { gte, lt } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ month, readings: readings.map(serialize) });
}

// POST /api/readings  -> upsert a single day's reading.
export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN, ROLES.OPERATOR);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    const mock = upsertMockReading(body);
    if (mock.error) {
      return NextResponse.json({ error: mock.error }, { status: mock.status ?? 400 });
    }
    return NextResponse.json({ reading: mock.reading });
  }

  const date = parseDateOnly(body.date);
  if (!date) {
    return NextResponse.json({ error: "Invalid or missing date" }, { status: 400 });
  }

  const data = {};
  for (const field of NUMERIC_FIELDS) {
    if (field in body) {
      const v = body[field];
      data[field] = v === "" || v == null ? null : Number(v);
      if (data[field] != null && !Number.isFinite(data[field])) {
        return NextResponse.json(
          { error: `Invalid number for ${field}` },
          { status: 400 }
        );
      }
    }
  }
  if ("remarks" in body) data.remarks = body.remarks || null;
  for (const field of TEXT_FIELDS) {
    if (field in body) data[field] = body[field] || null;
  }

  const saved = await prisma.dailyReading.upsert({
    where: { date },
    create: { date, ...data },
    update: data,
  });

  return NextResponse.json({ reading: serialize(saved) });
}
