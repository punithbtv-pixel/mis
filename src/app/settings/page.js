"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RUN_HOUR_EQUIPMENT, THRESHOLD_CATEGORIES } from "@/lib/equipment";
import StaffManager from "@/components/StaffManager";
import UserManager from "@/components/UserManager";

export default function SettingsPage() {
  const router = useRouter();
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showThreshold, setShowThreshold] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role !== "ADMIN") {
          setForbidden(true);
          router.replace("/");
        }
      });
  }, [router]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return null;
        }
        return r.json();
      })
      .then((d) => d && setValues(d.settings ?? {}))
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

  if (forbidden) {
    return <p className="text-slate-500">Redirecting…</p>;
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowStaff((v) => !v)}
          className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {showStaff ? "Hide staff roster" : "Staff Roster"}
        </button>
        <button
          type="button"
          onClick={() => setShowThreshold((v) => !v)}
          className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {showThreshold ? "Hide service threshold" : "Service Threshold"}
        </button>
        <button
          type="button"
          onClick={() => setShowUsers((v) => !v)}
          className="h-9 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {showUsers ? "Hide user settings" : "User settings"}
        </button>
      </div>

      {showStaff && <StaffManager />}

      {showThreshold && (
        <>
          <p className="text-sm text-slate-500">
            Configure service alert threshold and next-service hour targets for each
            piece of equipment.
          </p>

          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : (
            <form
              onSubmit={save}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-6"
            >
              <div>
                <span className="block text-sm font-medium text-slate-600 mb-1">
                  Service alert threshold (hours remaining)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {THRESHOLD_CATEGORIES.map((c) => (
                    <div key={c.settingKey}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {c.label}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={values[c.settingKey] ?? ""}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            [c.settingKey]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Equipment is flagged &quot;service due&quot; when remaining hours
                  fall at or below its category&apos;s threshold.
                </p>
              </div>

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
        </>
      )}

      {showUsers && <UserManager />}
    </div>
  );
}
