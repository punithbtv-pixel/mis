"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MonthPicker from "@/components/MonthPicker";
import { currentMonth } from "@/lib/dates";
import { fmt } from "@/lib/format";
import DataTabs from "@/components/DataTabs";
import {
  SELECTABLE_REPORT_COLUMNS,
  DATA_CATEGORIES,
  columnVisibleForCategory,
  reportCellValue,
} from "@/lib/report";

// A couple of columns keep their existing accent color from before this was
// made data-driven; everything else renders in the default slate.
const ACCENT_CLASS = {
  dieselConsumption: "text-amber-600",
  nepaConsumption: "text-sky-600",
};

function ColumnHeader({ colKey, label, align = "right", sticky, selectedColumns, toggleColumn }) {
  return (
    <th
      className={`px-2 py-2 text-center align-bottom ${sticky ? "sticky left-0 bg-slate-50" : ""}`}
    >
      <label className="flex flex-col items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={selectedColumns.has(colKey)}
          onChange={() => toggleColumn(colKey)}
        />
        <span
          className={`block max-w-[100px] leading-tight ${align === "left" ? "whitespace-nowrap" : ""}`}
        >
          {label}
        </span>
      </label>
    </th>
  );
}

export default function DataPage() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [selectedColumns, setSelectedColumns] = useState(
    new Set(SELECTABLE_REPORT_COLUMNS.map((c) => c.key))
  );
  const [category, setCategory] = useState("all");
  const loading = !hasLoaded;

  // Category filter only changes what's shown on screen; export column
  // selection (the checkboxes) stays independent of it.
  const middleColumns = useMemo(
    () =>
      SELECTABLE_REPORT_COLUMNS.filter(
        (c) => c.key !== "date" && c.key !== "remarks" && columnVisibleForCategory(c, category)
      ),
    [category]
  );
  const allRowsSelected = rows.length > 0 && selected.size === rows.length;
  const allColumnsSelected = selectedColumns.size === SELECTABLE_REPORT_COLUMNS.length;
  const allSelected = allRowsSelected && allColumnsSelected;

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
      .then((d) => {
        if (!active) return;
        const nextRows = d.rows ?? [];
        setRows(nextRows);
        setSelected(new Set(nextRows.map((r) => r.date)));
      })
      .catch(() => active && setRows([]))
      .finally(() => active && setHasLoaded(true));
    return () => {
      active = false;
    };
  }, [month]);

  function toggleRow(date) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      setSelectedColumns(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.date)));
      setSelectedColumns(new Set(SELECTABLE_REPORT_COLUMNS.map((c) => c.key)));
    }
  }

  function toggleColumn(key) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllColumns() {
    setSelectedColumns(
      allColumnsSelected ? new Set() : new Set(SELECTABLE_REPORT_COLUMNS.map((c) => c.key))
    );
  }

  async function downloadReport(format) {
    setExporting(format);
    try {
      const dates = encodeURIComponent(rows.map((r) => r.date).filter((d) => selected.has(d)).join(","));
      const columns = encodeURIComponent([...selectedColumns].join(","));
      const res = await fetch(`/api/export?month=${month}&format=${format}&dates=${dates}&columns=${columns}`);
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
      <DataTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">Monthly Data</h1>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {DATA_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker month={month} onChange={onMonthChange} />
          <button
            type="button"
            onClick={toggleAllColumns}
            className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {allColumnsSelected ? "Uncheck all columns" : "Check all columns"} ({selectedColumns.size}/{SELECTABLE_REPORT_COLUMNS.length})
          </button>
          <button
            type="button"
            onClick={() => downloadReport("excel")}
            disabled={!!exporting || loading || selected.size === 0 || selectedColumns.size === 0}
            className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting === "excel" ? "Exporting…" : `Excel${selected.size ? ` (${selected.size})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => downloadReport("pdf")}
            disabled={!!exporting || loading || selected.size === 0 || selectedColumns.size === 0}
            className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting === "pdf" ? "Exporting…" : `PDF${selected.size ? ` (${selected.size})` : ""}`}
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
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    title="Select/deselect all rows and columns"
                  />
                </th>
                <ColumnHeader colKey="date" label="Date" align="left" sticky selectedColumns={selectedColumns} toggleColumn={toggleColumn} />
                {middleColumns.map((col) => (
                  <ColumnHeader
                    key={col.key}
                    colKey={col.key}
                    label={col.header}
                    selectedColumns={selectedColumns}
                    toggleColumn={toggleColumn}
                  />
                ))}
                <ColumnHeader colKey="remarks" label="Remarks" align="left" selectedColumns={selectedColumns} toggleColumn={toggleColumn} />
                {canEdit && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.date)}
                      onChange={() => toggleRow(r.date)}
                    />
                  </td>
                  <td className="sticky left-0 bg-white px-3 py-2 text-center font-medium text-slate-700 whitespace-nowrap">
                    {r.date}
                  </td>
                  {middleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-center ${ACCENT_CLASS[col.key] ?? ""}`}
                    >
                      {fmt(reportCellValue(r, col), col.decimals ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-slate-500 max-w-[16rem] truncate" title={r.raw.remarks ?? ""}>
                    {r.raw.remarks ?? ""}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/entry?date=${String(r.raw.date).slice(0, 10)}`}
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
