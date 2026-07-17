"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGE_ACCESS, roleLabel } from "@/lib/roles";

const ALL_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/entry", label: "Daily Entry", activeMatch: ["/entry", "/log-entry"] },
  { href: "/data", label: "Data", activeMatch: ["/data", "/log-data"] },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  if (pathname === "/login") return null;

  const links = user
    ? ALL_LINKS.filter((l) => PAGE_ACCESS[l.href]?.includes(user.role))
    : ALL_LINKS;

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        <span className="font-semibold tracking-tight whitespace-nowrap">
          ZYN ELECTRICAL <span className="text-sky-400">MIS</span>
        </span>
        <nav className="flex items-center gap-1 flex-1">
          {links.map((l) => {
            const matches = l.activeMatch ?? [l.href];
            const active =
              l.href === "/" ? pathname === "/" : matches.some((m) => pathname.startsWith(m));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <span className="text-xs text-slate-400 hidden sm:inline">
            {user.username}{" "}
            <span className="text-sky-400">({roleLabel(user.role)})</span>
          </span>
        )}
        <button
          onClick={logout}
          className="text-sm text-slate-300 hover:text-white"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
