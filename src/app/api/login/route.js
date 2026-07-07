import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE } from "@/lib/auth";
import { hashPassword, createSessionToken } from "@/lib/session";
import { isUiOnlyMode } from "@/lib/mode";
import { ROLES } from "@/lib/roles";

export async function POST(request) {
  if (isUiOnlyMode()) {
    const res = NextResponse.json({
      ok: true,
      mode: "ui-only",
      user: { username: "demo", role: ROLES.ADMIN },
    });
    res.cookies.set(AUTH_COOKIE, "ui-only", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // ignore malformed body
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, role: user.role },
  });
  res.cookies.set(AUTH_COOKIE, await createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
