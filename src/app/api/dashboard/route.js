import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRows, buildSummary } from "@/lib/calc";
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

  // Include the last reading of the previous month so day-1 deltas work.
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
  // Drop the carried-in prior day so the month view only shows its own days.
  const rows = prior ? allRows.slice(1) : allRows;

  const summary = buildSummary(rows, settings);
  return NextResponse.json({ month, rows, ...summary });
}
