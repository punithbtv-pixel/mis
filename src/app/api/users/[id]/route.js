import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUiOnlyMode } from "@/lib/mode";
import { hashPassword } from "@/lib/session";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";

// PUT /api/users/:id -> update a user's username, password and/or role. Admin only.
export async function PUT(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  const { id } = await params;
  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = {};
  if ("username" in body) {
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    data.username = username;
  }
  if ("password" in body && body.password) {
    data.passwordHash = await hashPassword(String(body.password));
  }
  if ("role" in body) {
    const role = String(body.role ?? "");
    if (!Object.values(ROLES).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (role !== ROLES.ADMIN && Number(id) === auth.session.id) {
      return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
    }
    data.role = role;
  }

  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, username: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "A user with this username already exists" }, { status: 400 });
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PUT /api/users/[id] failed:", e);
    return NextResponse.json({ error: "Could not save user" }, { status: 500 });
  }
}

// DELETE /api/users/:id -> remove a user account. Admin only.
export async function DELETE(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  const { id } = await params;
  if (Number(id) === auth.session.id) {
    return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (target?.role === ROLES.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: ROLES.ADMIN } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last remaining admin" }, { status: 400 });
      }
    }
    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("DELETE /api/users/[id] failed:", e);
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
}
