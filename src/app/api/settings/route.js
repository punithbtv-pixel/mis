import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SERVICE_KEYS, DEFAULT_SERVICE_HOURS } from "@/lib/equipment";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockSettings, updateMockSettings } from "@/lib/mockData";

// GET /api/settings -> service-hour targets (defaults merged with overrides).
export async function GET() {
  if (isUiOnlyMode()) {
    return NextResponse.json(getMockSettings());
  }

  const rows = await prisma.setting.findMany();
  const map = { ...DEFAULT_SERVICE_HOURS };
  for (const r of rows) map[r.key] = Number(r.value);
  return NextResponse.json({ settings: map });
}

// POST /api/settings -> upsert one or more service-hour targets.
export async function POST(request) {
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
  for (const key of SERVICE_KEYS) {
    if (key in body && body[key] !== "" && body[key] != null) {
      const value = Number(body[key]);
      if (!Number.isFinite(value)) {
        return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
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
  const map = { ...DEFAULT_SERVICE_HOURS };
  for (const r of rows) map[r.key] = Number(r.value);
  return NextResponse.json({ settings: map });
}
