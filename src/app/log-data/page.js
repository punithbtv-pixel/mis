"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MonthPicker from "@/components/MonthPicker";
import { currentMonth } from "@/lib/dates";
import { MAINTENANCE_TYPES, durationMinutes, formatDuration } from "@/lib/maintenanceLog";
import DataTabs from "@/components/DataTabs";

const TYPE_BADGE = {
  PREVENTIVE: "bg-emerald-50 text-emerald-700",
  BREAKDOWN: "bg-rose-50 text-rose-700",
  PROJECT: "bg-violet-50 text-violet-700",
  IMPROVEMENT: "bg-amber-50 text-amber-700",
};

const TYPE_DOT = {
  PREVENTIVE: "bg-emerald-500",
  BREAKDOWN: "bg-rose-500",
  PROJECT: "bg-violet-500",
  IMPROVEMENT: "bg-amber-500",
};

function typeLabel(value) {
  return MAINTENANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export default function LogDataPage() {
  const [month, setMonth] = useState(currentMonth());
  const [type, setType] = useState("All");
  const [rows, setRows] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState("");
  const [search, setSearch] = useState("");
  const loading = !hasLoaded;

  const visibleRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      r.plant,
      r.section,
      r.equipment,
      r.detail,
      ...(r.spareParts ?? []),
      ...(r.attendedBy ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const canEdit = user?.role === "ADMIN";
  const canCreate = user?.role === "ADMIN" || user?.role === "ENGINEER";

  function onMonthChange(next) {
    setMonth(next);
    setHasLoaded(false);
  }

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/maintenance-logs?month=${month}&type=${type}`)
      .then((r) => r.json())
      .then((d) => active && setRows(d.rows ?? []))
      .catch(() => active && setRows([]))
      .finally(() => active && setHasLoaded(true));
    return () => {
      active = false;
    };
  }, [month, type]);

  async function downloadReport(format) {
    setExporting(format);
    try {
      const res = await fetch(`/api/maintenance-logs/export?month=${month}&type=${type}&format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-log-${month}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">
      <div className="shrink-0 space-y-5 pb-4">
        <DataTabs />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Monthly Data</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker month={month} onChange={onMonthChange} />
            <button
              type="button"
              onClick={() => downloadReport("excel")}
              disabled={!!exporting || loading}
              className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {exporting === "excel" ? "Exporting…" : "Excel"}
            </button>
            <button
              type="button"
              onClick={() => downloadReport("pdf")}
              disabled={!!exporting || loading}
              className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {exporting === "pdf" ? "Exporting…" : "PDF"}
            </button>
            {canCreate && (
              <Link
                href="/log-entry"
                className="h-9 inline-flex items-center rounded-lg bg-slate-900 text-white px-4 text-sm font-medium hover:bg-slate-800"
              >
                + Log Entry
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setType("All")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              type === "All" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300"
            }`}
          >
            All types
          </button>
          {MAINTENANCE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                type === t.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plant, section, equipment, detail, parts, staff…"
            className="h-9 flex-1 min-w-[220px] max-w-sm rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && visibleRows.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          {rows.length === 0 ? "No log entries for this month." : "No log entries match your search."}
        </div>
      )}

      {!loading && visibleRows.length > 0 && (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <th className="sticky left-0 top-0 z-20 bg-slate-50 px-3 py-2 text-left whitespace-nowrap">Date</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left">Plant / Section / Equipment</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left whitespace-nowrap">Start–End</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left whitespace-nowrap">Duration</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left">Type</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left">Detail</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left">Spare parts</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left">Attended by</th>
                {canEdit && <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                    {r.date}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{r.equipment}</div>
                    <div className="text-xs text-slate-500">{r.plant} / {r.section}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.startTime}–{r.endTime}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDuration(durationMinutes(r.startTime, r.endTime))}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TYPE_BADGE[r.type] ?? "bg-slate-100 text-slate-700"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[r.type] ?? "bg-slate-400"}`} />
                      {typeLabel(r.type)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-[16rem]">{r.detail || ""}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.spareParts?.length ? r.spareParts.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(r.attendedBy ?? []).map((name) => (
                        <span key={name} className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap">
                          {name}
                        </span>
                      ))}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link href={`/log-entry?id=${r.id}`} className="text-sky-600 hover:underline">
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
