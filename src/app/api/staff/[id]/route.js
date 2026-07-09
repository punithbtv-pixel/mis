import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUiOnlyMode } from "@/lib/mode";
import { updateMockStaff, deleteMockStaff } from "@/lib/mockData";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";

// PUT /api/staff/:id -> update a staff member's name/designation. Admin only.
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
    const mock = updateMockStaff(id, body);
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
    const staff = await prisma.staff.update({
      where: { id: Number(id) },
      data: { name, designation },
    });
    return NextResponse.json({ staff });
  } catch {
    return NextResponse.json({ error: "Not found, or name already in use" }, { status: 400 });
  }
}

// DELETE /api/staff/:id -> remove a staff member. Admin only.
export async function DELETE(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  if (isUiOnlyMode()) {
    const mock = deleteMockStaff(id);
    if (mock.error) {
      return NextResponse.json({ error: mock.error }, { status: mock.status ?? 400 });
    }
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.staff.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
