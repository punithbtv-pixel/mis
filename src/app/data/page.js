"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MonthPicker from "@/components/MonthPicker";
import { RUN_HOUR_EQUIPMENT } from "@/lib/equipment";
import { currentMonth } from "@/lib/dates";
import { fmt } from "@/lib/format";

export default function DataPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState("");
  const loading = !hasLoaded;

  const canAddEntry = user?.role === "ADMIN" || user?.role === "OPERATOR";
  const canEdit = user?.role === "ADMIN";

  function onMonthChange(nextMonth) {
    setMonth(nextMonth);
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
    fetch(`/api/dashboard?month=${month}`)
      .then((r) => r.json())
      .then((d) => active && setRows(d.rows ?? []))
      .catch(() => active && setRows([]))
      .finally(() => active && setHasLoaded(true));
    return () => {
      active = false;
    };
  }, [month]);

  async function downloadReport(format) {
    setExporting(format);
    try {
      const res = await fetch(`/api/export?month=${month}&format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `powerhouse-${month}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Monthly Data</h1>
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
          {canAddEntry && (
            <Link
              href="/entry"
              className="h-9 inline-flex items-center rounded-lg bg-slate-900 text-white px-4 text-sm font-medium hover:bg-slate-800"
            >
              + Entry
            </Link>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No readings for this month.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Dip (mm)</th>
                <th className="px-3 py-2 text-right">Diesel Consumption (LTRS)</th>
                <th className="px-3 py-2 text-right">Recv (L)</th>
                <th className="px-3 py-2 text-right">Stock (L)</th>
                <th className="px-3 py-2 text-right">Issued (L)</th>
                <th className="px-3 py-2 text-right">NEPA (KWH)</th>
                <th className="px-3 py-2 text-right">Milling</th>
                <th className="px-3 py-2 text-right">Utility</th>
                {RUN_HOUR_EQUIPMENT.map((eq) => (
                  <th key={eq.field} className="px-3 py-2 text-right whitespace-nowrap">
                    {eq.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left">Remarks</th>
                {canEdit && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                    {r.date}
                  </td>
                  <td className="px-3 py-2 text-right">{fmt(r.raw.dieselDipMm)}</td>
                  <td className="px-3 py-2 text-right text-amber-600">{fmt(r.dieselConsumption)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.dieselReceived)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.closingLitres)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.raw.dieselIssued)}</td>
                  <td className="px-3 py-2 text-right text-sky-600">{fmt(r.nepaConsumption)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.ebMilling)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.ebUtility)}</td>
                  {RUN_HOUR_EQUIPMENT.map((eq) => (
                    <td key={eq.field} className="px-3 py-2 text-right">
                      {fmt(r.runHours[eq.field], 1)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-slate-500 max-w-[16rem] truncate" title={r.raw.remarks ?? ""}>
                    {r.raw.remarks ?? ""}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/entry?date=${r.date}`}
                        className="text-sky-600 hover:underline"
                      >
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
