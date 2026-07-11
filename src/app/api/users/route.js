import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUiOnlyMode } from "@/lib/mode";
import { hashPassword } from "@/lib/session";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";

// GET /api/users -> list app users (no password hashes). Admin only.
export async function GET() {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  });
  return NextResponse.json({ users });
}

// POST /api/users -> add a new user account. Admin only.
export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "");
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  if (!Object.values(ROLES).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "A user with this username already exists" }, { status: 400 });
    }
    console.error("POST /api/users failed:", e);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}
