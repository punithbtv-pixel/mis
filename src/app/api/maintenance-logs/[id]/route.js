import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/dates";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockMaintenanceLog, updateMockMaintenanceLog } from "@/lib/mockData";
import { requireSession } from "@/lib/apiAuth";
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

// GET /api/maintenance-logs/:id -> a single log entry.
export async function GET(request, { params }) {
  const { id } = await params;

  if (isUiOnlyMode()) {
    const log = getMockMaintenanceLog(id);
    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ log });
  }

  const log = await prisma.maintenanceLog.findUnique({ where: { id: Number(id) } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ log: serialize(log) });
}

// PUT /api/maintenance-logs/:id -> update a log entry. Admin only.
export async function PUT(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isUiOnlyMode()) {
    const mock = updateMockMaintenanceLog(id, body);
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

  try {
    const saved = await prisma.maintenanceLog.update({
      where: { id: Number(id) },
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
      },
    });
    return NextResponse.json({ log: serialize(saved) });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
