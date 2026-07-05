import { NextResponse } from "next/server";
import { AUTH_COOKIE, passwordMatches, expectedToken } from "@/lib/auth";
import { isUiOnlyMode } from "@/lib/mode";

export async function POST(request) {
  if (isUiOnlyMode()) {
    const res = NextResponse.json({ ok: true, mode: "ui-only" });
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

  if (!passwordMatches(body.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
