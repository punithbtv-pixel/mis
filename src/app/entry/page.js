"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { INPUT_GROUPS, DIESEL_ISSUE_TO_OPTIONS } from "@/lib/equipment";
import { fmt } from "@/lib/format";
import EntryTabs from "@/components/EntryTabs";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isDateStr(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function EntryForm() {
  const router = useRouter();
  const search = useSearchParams();
  const initialDate = isDateStr(search.get("date")) ? search.get("date") : todayStr();
  const [date, setDate] = useState(initialDate);
  const [values, setValues] = useState({});
  const [previous, setPrevious] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [issuanceDraft, setIssuanceDraft] = useState({
    to: DIESEL_ISSUE_TO_OPTIONS[0],
    comment: "",
    liters: "",
  });

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role;
        if (role !== "ADMIN" && role !== "OPERATOR") {
          setForbidden(true);
          router.replace("/");
        }
      });
  }, [router]);

  useEffect(() => {
    let active = true;
    fetch(`/api/readings/${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const r = data.reading ?? {};
        const next = {};
        for (const g of INPUT_GROUPS)
          for (const f of g.fields) next[f.field] = r[f.field] ?? "";
        next.remarks = r.remarks ?? "";
        next.dieselIssuances = Array.isArray(r.dieselIssuances) ? r.dieselIssuances : [];
        setValues(next);
        setPrevious(data.previous);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date]);

  function setField(field, v) {
    setValues((prev) => ({ ...prev, [field]: v }));
  }

  function addIssuance() {
    const liters = Number(issuanceDraft.liters);
    if (issuanceDraft.liters === "" || !Number.isFinite(liters)) return;
    setValues((prev) => ({
      ...prev,
      dieselIssuances: [
        ...(prev.dieselIssuances ?? []),
        { to: issuanceDraft.to, comment: issuanceDraft.comment, liters },
      ],
    }));
    setIssuanceDraft({ to: DIESEL_ISSUE_TO_OPTIONS[0], comment: "", liters: "" });
  }

  function clearIssuanceDraft() {
    setIssuanceDraft({ to: DIESEL_ISSUE_TO_OPTIONS[0], comment: "", liters: "" });
  }

  function removeIssuance(i) {
    setValues((prev) => ({
      ...prev,
      dieselIssuances: (prev.dieselIssuances ?? []).filter((_, idx) => idx !== i),
    }));
  }

  async function save(e) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...values }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus(""), 2500);
  }

  function delta(field) {
    const cur = values[field];
    const prev = previous?.[field];
    if (cur === "" || cur == null || prev == null) return null;
    const d = Number(cur) - Number(prev);
    return Number.isFinite(d) ? d : null;
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <EntryTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Daily Entry</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (!e.target.value) return;
              setLoading(true);
              setDate(e.target.value);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Enter the meter readings for the selected day. The faint number under
        each box is that day&apos;s change vs the previous reading.
      </p>

      <form onSubmit={save} className="space-y-4">
        {INPUT_GROUPS.map((group) => (
          <div
            key={group.title}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              {group.title}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {group.fields.map((f) => {
                const d = delta(f.field);
                return (
                  <div key={f.field}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {f.label}
                      {f.unit && (
                        <span className="text-slate-400"> ({f.unit})</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={values[f.field] ?? ""}
                      onChange={(e) => setField(f.field, e.target.value)}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="h-4 mt-0.5 text-[11px] text-slate-400">
                      {d != null && <>Δ {fmt(d, 1)}</>}
                    </div>
                  </div>
                );
              })}
            </div>

            {group.title === "Diesel" && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Issued To
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <select
                    value={issuanceDraft.to}
                    onChange={(e) =>
                      setIssuanceDraft((d) => ({ ...d, to: e.target.value }))
                    }
                    disabled={loading}
                    className="h-[38px] rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {DIESEL_ISSUE_TO_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Comment"
                    value={issuanceDraft.comment}
                    onChange={(e) =>
                      setIssuanceDraft((d) => ({ ...d, comment: e.target.value }))
                    }
                    disabled={loading}
                    className="flex-1 min-w-[160px] h-[38px] rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Liters"
                    value={issuanceDraft.liters}
                    onChange={(e) =>
                      setIssuanceDraft((d) => ({ ...d, liters: e.target.value }))
                    }
                    disabled={loading}
                    className="w-28 h-[38px] rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={addIssuance}
                    disabled={loading}
                    className="h-[38px] rounded-lg bg-slate-900 text-white px-4 text-sm font-medium hover:bg-slate-800"
                  >
                    ADD
                  </button>
                </div>
                {(values.dieselIssuances ?? []).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {values.dieselIssuances.map((it, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm"
                      >
                        <span>
                          <span className="font-medium text-slate-700">{it.to}</span>
                          {it.comment && (
                            <span className="text-slate-500"> — {it.comment}</span>
                          )}
                          <span className="text-slate-500"> · {it.liters} L</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeIssuance(i)}
                          className="w-5 h-5 rounded-full bg-slate-300 text-white text-xs leading-none flex items-center justify-center hover:bg-rose-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Remarks
          </label>
          <textarea
            rows={2}
            value={values.remarks ?? ""}
            onChange={(e) => setField("remarks", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "saving" || loading}
            className="bg-slate-900 text-white rounded-lg px-5 py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save reading"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-green-600">Saved ✓</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">Save failed</span>
          )}
        </div>
      </form>
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={null}>
      <EntryForm />
    </Suspense>
  );
}
