"use client";

import { monthLabel } from "@/lib/format";

export default function MonthPicker({ month, onChange }) {
  function shift(delta) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    onChange(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => shift(-1)}
        className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Previous month"
      >
        ‹
      </button>
      <input
        type="month"
        value={month}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        aria-label="Select month"
      />
      <button
        onClick={() => shift(1)}
        className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Next month"
      >
        ›
      </button>
      <span className="ml-1 text-sm text-slate-500 hidden sm:inline">
        {monthLabel(month)}
      </span>
    </div>
  );
}
