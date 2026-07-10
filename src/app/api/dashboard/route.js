import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRows, buildSummary, shiftRowsToPriorDay } from "@/lib/calc";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockDashboard } from "@/lib/mockData";

// GET /api/dashboard?month=YYYY-MM -> KPIs, chart series and service alerts.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(getMockDashboard(month));
  }

  const { gte, lt } = monthRange(month);

  // Include the next month's first reading so the last day's row (whose
  // output is relabeled from that entry) can be computed.
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
  const rows = shiftRowsToPriorDay(computedRows);

  const summary = buildSummary(rows, settings);
  return NextResponse.json({ month, rows, ...summary });
}
