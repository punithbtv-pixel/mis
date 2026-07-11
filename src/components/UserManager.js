"use client";

import { useEffect, useState } from "react";
import { ROLES, roleLabel } from "@/lib/roles";

function emptyNewUser() {
  return { username: "", password: "", role: ROLES.OPERATOR };
}

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState(emptyNewUser());
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  function load() {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function setField(id, field, value) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  }

  async function saveRow(row) {
    setError("");
    setSavingId(row.id);
    const body = { username: row.username, role: row.role };
    if (row.newPassword) body.password = row.newPassword;
    const res = await fetch(`/api/users/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Delete failed");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function addUser(e) {
    e.preventDefault();
    setError("");
    const username = newUser.username.trim();
    const password = newUser.password;
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: newUser.role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Add failed");
      return;
    }
    setNewUser(emptyNewUser());
    load();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">User accounts</h2>
        <p className="text-xs text-slate-500 mt-1">
          Add, edit or remove login accounts. Leave the password field blank when
          saving a row to keep the current password.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={u.username}
                onChange={(e) => setField(u.id, "username", e.target.value)}
                placeholder="Username"
                className="flex-1 min-w-[120px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="text"
                value={u.newPassword ?? ""}
                onChange={(e) => setField(u.id, "newPassword", e.target.value)}
                placeholder="New password (optional)"
                className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <select
                value={u.role}
                onChange={(e) => setField(u.id, "role", e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => saveRow(u)}
                disabled={savingId === u.id}
                className="h-8 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {savingId === u.id ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => removeRow(u.id)}
                className="h-8 inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addUser} className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-100">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
          <input
            type="text"
            value={newUser.username}
            onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
          <input
            type="text"
            value={newUser.password}
            onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 inline-flex items-center rounded-lg bg-slate-900 text-white px-4 text-sm font-medium hover:bg-slate-800"
        >
          + Add user
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
