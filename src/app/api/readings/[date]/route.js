import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/dates";
import { toDateStr } from "@/lib/calc";
import { isUiOnlyMode } from "@/lib/mode";
import { deleteMockReading, getMockReadingWithPrevious } from "@/lib/mockData";

function serialize(r) {
  return r ? { ...r, date: toDateStr(r.date) } : null;
}

// GET /api/readings/2026-06-15 -> { reading, previous }
export async function GET(_request, { params }) {
  const { date: dateParam } = await params;
  const date = parseDateOnly(dateParam);
  if (!date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(getMockReadingWithPrevious(dateParam));
  }

  const [reading, previous] = await Promise.all([
    prisma.dailyReading.findUnique({ where: { date } }),
    prisma.dailyReading.findFirst({
      where: { date: { lt: date } },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    reading: serialize(reading),
    previous: serialize(previous),
  });
}

// DELETE /api/readings/2026-06-15
export async function DELETE(_request, { params }) {
  const { date: dateParam } = await params;
  const date = parseDateOnly(dateParam);
  if (!date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(deleteMockReading(dateParam));
  }

  await prisma.dailyReading.deleteMany({ where: { date } });
  return NextResponse.json({ ok: true });
}
