"use client";

import { useEffect, useState } from "react";
import { RUN_HOUR_EQUIPMENT } from "@/lib/equipment";

export default function SettingsPage() {
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setValues(d.settings ?? {}))
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      const d = await res.json();
      setValues(d.settings);
      setStatus("saved");
      setTimeout(() => setStatus(""), 2500);
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-500">
        Next-service hour target for each piece of equipment. &quot;Hours
        remaining&quot; on the dashboard is this target minus the latest meter
        reading.
      </p>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <form
          onSubmit={save}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RUN_HOUR_EQUIPMENT.map((eq) => (
              <div key={eq.serviceKey}>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  {eq.label} — next service (hrs)
                </label>
                <input
                  type="number"
                  step="any"
                  value={values[eq.serviceKey] ?? ""}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, [eq.serviceKey]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "saving"}
              className="bg-slate-900 text-white rounded-lg px-5 py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save settings"}
            </button>
            {status === "saved" && (
              <span className="text-sm text-green-600">Saved ✓</span>
            )}
            {status === "error" && (
              <span className="text-sm text-red-600">Save failed</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
