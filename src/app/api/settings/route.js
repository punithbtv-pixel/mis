import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SERVICE_KEYS,
  DEFAULT_SERVICE_HOURS,
  THRESHOLD_SETTING_KEY,
  SERVICE_ALERT_THRESHOLD,
} from "@/lib/equipment";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockSettings, updateMockSettings } from "@/lib/mockData";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";

function mergeSettings(rows) {
  const map = {
    ...DEFAULT_SERVICE_HOURS,
    [THRESHOLD_SETTING_KEY]: SERVICE_ALERT_THRESHOLD,
  };
  for (const r of rows) map[r.key] = Number(r.value);
  return map;
}

// GET /api/settings -> service-hour targets and alert threshold.
export async function GET() {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(getMockSettings());
  }

  const rows = await prisma.setting.findMany();
  return NextResponse.json({ settings: mergeSettings(rows) });
}

// POST /api/settings -> upsert service-hour targets and alert threshold.
export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN);
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
    const mock = updateMockSettings(body);
    if (mock.error) {
      return NextResponse.json({ error: mock.error }, { status: mock.status ?? 400 });
    }
    return NextResponse.json({ settings: mock.settings });
  }

  const updates = [];
  const keys = [...SERVICE_KEYS, THRESHOLD_SETTING_KEY];
  for (const key of keys) {
    if (key in body && body[key] !== "" && body[key] != null) {
      const value = Number(body[key]);
      if (!Number.isFinite(value)) {
        return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
      }
      if (key === THRESHOLD_SETTING_KEY && value < 0) {
        return NextResponse.json({ error: "Threshold must be zero or positive" }, { status: 400 });
      }
      updates.push(
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      );
    }
  }
  await Promise.all(updates);

  const rows = await prisma.setting.findMany();
  return NextResponse.json({ settings: mergeSettings(rows) });
}
