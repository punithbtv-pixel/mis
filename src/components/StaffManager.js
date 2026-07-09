"use client";

import { useEffect, useState } from "react";

export default function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  function load() {
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStaff(d.staff ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function setField(id, field, value) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function saveRow(row) {
    setError("");
    setSavingId(row.id);
    const res = await fetch(`/api/staff/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: row.name, designation: row.designation }),
    });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      return;
    }
    load();
  }

  async function removeRow(id) {
    setError("");
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Delete failed");
      return;
    }
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  async function addStaff(e) {
    e.preventDefault();
    setError("");
    const name = newName.trim();
    const designation = newDesignation.trim();
    if (!name || !designation) {
      setError("Name and designation are required");
      return;
    }
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, designation }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Add failed");
      return;
    }
    setNewName("");
    setNewDesignation("");
    load();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Attended by — staff roster</h2>
        <p className="text-xs text-slate-500 mt-1">
          Names and designations shown on the Log Entry &quot;Attended by&quot; list.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={s.name}
                onChange={(e) => setField(s.id, "name", e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="text"
                value={s.designation}
                onChange={(e) => setField(s.id, "designation", e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => saveRow(s)}
                disabled={savingId === s.id}
                className="h-8 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {savingId === s.id ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => removeRow(s.id)}
                className="h-8 inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addStaff} className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-100">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Designation</label>
          <input
            type="text"
            value={newDesignation}
            onChange={(e) => setNewDesignation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          type="submit"
          className="h-9 inline-flex items-center rounded-lg bg-slate-900 text-white px-4 text-sm font-medium hover:bg-slate-800"
        >
          + Add staff
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
