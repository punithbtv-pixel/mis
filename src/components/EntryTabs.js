"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/entry", label: "Powerhouse Data Entry" },
  { href: "/log-entry", label: "Job Activity Log Entry" },
];

export default function EntryTabs({ date }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        const href = date ? `${t.href}?date=${date}` : t.href;
        return (
          <Link
            key={t.href}
            href={href}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              active
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
