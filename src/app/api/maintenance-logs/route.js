import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth, isValidMonth, monthRange, parseDateOnly } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockMaintenanceLogs, createMockMaintenanceLog } from "@/lib/mockData";
import { requireSession, getSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { MAINTENANCE_TYPE_VALUES, isValidTimeStr } from "@/lib/maintenanceLog";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function serialize(row) {
  return { ...row, date: toDateStr(row.date) };
}

function normalizeStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s).trim()).filter(Boolean);
}

// GET /api/maintenance-logs?month=YYYY-MM&type=PREVENTIVE -> logs for that month.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  const type = searchParams.get("type") || "All";
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(getMockMaintenanceLogs(month, type));
  }

  const { gte, lt } = monthRange(month);
  const rows = await prisma.maintenanceLog.findMany({
    where: {
      date: { gte, lt },
      ...(type && type !== "All" ? { type } : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  return NextResponse.json({ rows: rows.map(serialize) });
}

// POST /api/maintenance-logs -> create a new maintenance log entry.
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
    const session = await getSession();
    const mock = createMockMaintenanceLog(body, session);
    if (mock.error) {
      return NextResponse.json({ error: mock.error }, { status: mock.status ?? 400 });
    }
    return NextResponse.json({ log: mock.log });
  }

  const date = parseDateOnly(body.date);
  if (!date) {
    return NextResponse.json({ error: "Invalid or missing date" }, { status: 400 });
  }
  if (!body.plant || !body.section || !body.equipment) {
    return NextResponse.json({ error: "Plant, section and equipment are required" }, { status: 400 });
  }
  if (!isValidTimeStr(body.startTime) || !isValidTimeStr(body.endTime)) {
    return NextResponse.json({ error: "Start and end time must be HH:MM" }, { status: 400 });
  }
  if (!MAINTENANCE_TYPE_VALUES.includes(body.type)) {
    return NextResponse.json({ error: "Invalid maintenance type" }, { status: 400 });
  }
  const attendedBy = normalizeStringArray(body.attendedBy);
  if (attendedBy.length === 0) {
    return NextResponse.json({ error: "At least one person must be selected in Attended by" }, { status: 400 });
  }

  const saved = await prisma.maintenanceLog.create({
    data: {
      date,
      plant: String(body.plant),
      section: String(body.section),
      equipment: String(body.equipment),
      startTime: body.startTime,
      endTime: body.endTime,
      type: body.type,
      detail: body.detail ? String(body.detail) : null,
      spareParts: normalizeStringArray(body.spareParts),
      attendedBy,
      createdByUsername: auth.session.username,
    },
  });

  return NextResponse.json({ log: serialize(saved) });
}
