import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUiOnlyMode } from "@/lib/mode";
import { getMockStaff, createMockStaff } from "@/lib/mockData";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";

// GET /api/staff -> the "Attended by" roster (name + designation).
export async function GET() {
  const auth = await requireSession();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (isUiOnlyMode()) {
    return NextResponse.json(getMockStaff());
  }

  const staff = await prisma.staff.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ staff });
}

// POST /api/staff -> add a new staff member. Admin only.
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
    const mock = createMockStaff(body);
    if (mock.error) {
      return NextResponse.json({ error: mock.error }, { status: mock.status ?? 400 });
    }
    return NextResponse.json({ staff: mock.staff });
  }

  const name = String(body?.name ?? "").trim();
  const designation = String(body?.designation ?? "").trim();
  if (!name || !designation) {
    return NextResponse.json({ error: "Name and designation are required" }, { status: 400 });
  }

  try {
    const staff = await prisma.staff.create({ data: { name, designation } });
    return NextResponse.json({ staff });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "A staff member with this name already exists" }, { status: 400 });
    }
    console.error("POST /api/staff failed:", e);
    return NextResponse.json({ error: "Could not save staff member" }, { status: 500 });
  }
}
