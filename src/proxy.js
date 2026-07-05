import { NextResponse } from "next/server";
import { AUTH_COOKIE, tokenIsValid } from "@/lib/auth";
import { isUiOnlyMode } from "@/lib/mode";

// Paths that don't require auth.
const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isUiOnlyMode()) return NextResponse.next();

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const valid = await tokenIsValid(token);

  if (valid) return NextResponse.next();

  // API calls get a 401; page navigations get redirected to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
