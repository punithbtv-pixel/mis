"use client";

import { useEffect, useMemo, useState } from "react";
import MonthPicker from "@/components/MonthPicker";
import { currentMonth } from "@/lib/dates";
import { fmt } from "@/lib/format";
import DataTabs from "@/components/DataTabs";

// Flatten each day's dieselIssuances line items into one row per issuance,
// newest day first (multiple issuances on the same day keep their entry order).
function issuanceRows(rows) {
  return [...rows]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .flatMap((r) =>
      (r.raw?.dieselIssuances ?? []).map((it, i) => ({
        key: `${r.date}-${i}`,
        date: r.date,
        to: it.to,
        comment: it.comment,
        liters: it.liters,
      }))
    );
}

export default function DieselLogPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loading = !hasLoaded;

  function onMonthChange(nextMonth) {
    setMonth(nextMonth);
    setHasLoaded(false);
  }

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

  const issuances = useMemo(() => issuanceRows(rows), [rows]);
  const total = useMemo(
    () => issuances.reduce((sum, it) => sum + (Number(it.liters) || 0), 0),
    [issuances]
  );

  return (
    <div className="space-y-5">
      <DataTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Diesel Issued</h1>
        <MonthPicker month={month} onChange={onMonthChange} />
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 inline-block">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total issued
          </div>
          <div className="text-xl font-semibold text-amber-600">{fmt(total, 0)} L</div>
        </div>
      )}

      {!loading && issuances.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No diesel issued this month.
        </div>
      )}

      {!loading && issuances.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Issued To</th>
                <th className="px-3 py-2 text-left">Comment</th>
                <th className="px-3 py-2 text-right">Liters</th>
              </tr>
            </thead>
            <tbody>
              {issuances.map((it) => (
                <tr key={it.key} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{it.date}</td>
                  <td className="px-3 py-2">{it.to}</td>
                  <td className="px-3 py-2 text-slate-500">{it.comment || ""}</td>
                  <td className="px-3 py-2 text-right text-amber-600 font-medium">{fmt(it.liters, 0)} L</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="px-3 py-2" colSpan={3}>
                  Total
                </td>
                <td className="px-3 py-2 text-right text-amber-600">{fmt(total, 0)} L</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
