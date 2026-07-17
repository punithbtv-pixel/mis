"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PLANTS,
  MAINTENANCE_TYPES,
  sectionsForPlant,
  categoriesForSection,
  equipmentForSection,
  categoryForEquipment,
  durationMinutes,
  formatDuration,
} from "@/lib/maintenanceLog";
import EntryTabs from "@/components/EntryTabs";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isDateStr(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const TYPE_STYLES = {
  PREVENTIVE: {
    sel: "border-emerald-500 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  BREAKDOWN: {
    sel: "border-rose-500 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  PROJECT: {
    sel: "border-violet-500 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  IMPROVEMENT: {
    sel: "border-amber-500 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
};

function emptyForm() {
  const plant = PLANTS[0];
  const section = sectionsForPlant(plant)[0] ?? "";
  const category = categoriesForSection(plant, section)?.[0] ?? null;
  const equipment = equipmentForSection(plant, section, category)[0] ?? "";
  return {
    date: todayStr(),
    plant,
    section,
    category,
    equipment,
    startTime: "09:00",
    endTime: "10:00",
    type: MAINTENANCE_TYPES[0].value,
    detail: "",
    spareParts: [],
    attendedBy: [],
  };
}

function LogEntryForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("id");
  const initialDate = isDateStr(search.get("date")) ? search.get("date") : todayStr();

  const [role, setRole] = useState(null);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyForm(), date: initialDate }));
  const [partInput, setPartInput] = useState("");
  const [loading, setLoading] = useState(!!editId);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStaff(d.staff ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const r = d.user?.role;
        setRole(r);
        const canCreate = r === "ADMIN" || r === "ENGINEER";
        const canEdit = r === "ADMIN";
        if (!canCreate || (editId && !canEdit)) {
          router.replace("/log-data");
          return;
        }
        setCheckedAccess(true);
      });
  }, [router, editId]);

  useEffect(() => {
    if (!editId || !checkedAccess) return;
    let active = true;
    fetch(`/api/maintenance-logs/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d.log) return;
        setForm({
          date: d.log.date,
          plant: d.log.plant,
          section: d.log.section,
          category: categoryForEquipment(d.log.plant, d.log.section, d.log.equipment),
          equipment: d.log.equipment,
          startTime: d.log.startTime,
          endTime: d.log.endTime,
          type: d.log.type,
          detail: d.log.detail ?? "",
          spareParts: d.log.spareParts ?? [],
          attendedBy: d.log.attendedBy ?? [],
        });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [editId, checkedAccess]);

  const sections = useMemo(() => sectionsForPlant(form.plant), [form.plant]);
  const categories = useMemo(
    () => categoriesForSection(form.plant, form.section),
    [form.plant, form.section]
  );
  const equipmentOptions = useMemo(
    () => equipmentForSection(form.plant, form.section, form.category),
    [form.plant, form.section, form.category]
  );
  const duration = useMemo(
    () => formatDuration(durationMinutes(form.startTime, form.endTime)),
    [form.startTime, form.endTime]
  );

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onPlantChange(plant) {
    const section = sectionsForPlant(plant)[0] ?? "";
    const category = categoriesForSection(plant, section)?.[0] ?? null;
    const equipment = equipmentForSection(plant, section, category)[0] ?? "";
    setForm((f) => ({ ...f, plant, section, category, equipment }));
  }

  function onSectionChange(section) {
    const category = categoriesForSection(form.plant, section)?.[0] ?? null;
    const equipment = equipmentForSection(form.plant, section, category)[0] ?? "";
    setForm((f) => ({ ...f, section, category, equipment }));
  }

  function onCategoryChange(category) {
    const equipment = equipmentForSection(form.plant, form.section, category)[0] ?? "";
    setForm((f) => ({ ...f, category, equipment }));
  }

  function addPart() {
    const v = partInput.trim().replace(/,$/, "");
    if (!v) return;
    setForm((f) => ({ ...f, spareParts: [...f.spareParts, v] }));
    setPartInput("");
  }

  function removePart(i) {
    setForm((f) => ({ ...f, spareParts: f.spareParts.filter((_, idx) => idx !== i) }));
  }

  function toggleStaff(name) {
    setForm((f) => ({
      ...f,
      attendedBy: f.attendedBy.includes(name)
        ? f.attendedBy.filter((n) => n !== name)
        : [...f.attendedBy, name],
    }));
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    if (form.attendedBy.length === 0) {
      setError("Select at least one person in Attended by.");
      return;
    }
    setStatus("saving");
    const res = await fetch(
      editId ? `/api/maintenance-logs/${editId}` : "/api/maintenance-logs",
      {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    if (res.ok) {
      setStatus("saved");
      setTimeout(() => setStatus(""), 2500);
      if (!editId) {
        setForm((f) => ({ ...emptyForm(), date: f.date }));
        setPartInput("");
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      setStatus("error");
    }
  }

  if (!checkedAccess || loading) {
    return (
      <div className="space-y-5 max-w-4xl">
        <EntryTabs date={form.date} />
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="sticky top-14 z-30 space-y-5 bg-background pb-4">
        <EntryTabs date={form.date} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            {editId ? "Edit Log Entry" : "Daily Log Entry"}
          </h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            />
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plant</label>
              <select
                value={form.plant}
                onChange={(e) => onPlantChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {PLANTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
              <select
                value={form.section}
                onChange={(e) => onSectionChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={`mt-4 grid grid-cols-1 gap-4 ${categories ? "md:grid-cols-3" : ""}`}>
            {categories && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select
                  value={form.category ?? ""}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={categories ? "md:col-span-2" : ""}>
              <label className="block text-xs font-medium text-slate-600 mb-1">Equipment / Location</label>
              <select
                value={form.equipment}
                onChange={(e) => set("equipment", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Time &amp; Duration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Duration <span className="text-slate-400 font-normal">(calculated)</span>
              </label>
              <div className="h-[38px] rounded-lg border border-sky-500 bg-sky-50 flex items-center justify-center text-sm font-semibold text-sky-700">
                {duration}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Type of Job
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MAINTENANCE_TYPES.map((t) => {
              const sel = form.type === t.value;
              const style = TYPE_STYLES[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("type", t.value)}
                  className={`text-left rounded-lg border-[1.5px] p-3 transition-colors ${
                    sel ? style.sel : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mb-1 ${style.dot}`} />
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-slate-500">{t.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Detail entry
          </h2>
          <textarea
            rows={3}
            value={form.detail}
            onChange={(e) => set("detail", e.target.value)}
            placeholder="Describe what was found and what was done..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Spare part(s) used{" "}
            <span className="text-slate-400 font-normal normal-case tracking-normal">
              — type a part and press Enter
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 px-2 py-2">
            {form.spareParts.map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-300 rounded-full pl-3 pr-1 py-0.5 text-xs font-medium"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removePart(i)}
                  className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] leading-none flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={partInput}
              onChange={(e) => setPartInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addPart();
                }
              }}
              placeholder="e.g. Bearing 6205, V-belt A47…"
              className="flex-1 min-w-[140px] text-sm px-1 py-1 outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Attended by{" "}
            <span className="text-slate-400 font-normal normal-case tracking-normal">
              — select one or more
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {staff.map((s) => {
              const sel = form.attendedBy.includes(s.name);
              return (
                <label
                  key={s.name}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    sel ? "border-sky-500 bg-sky-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleStaff(s.name)}
                  />
                  <span>
                    <span className="block font-medium text-slate-800">{s.name}</span>
                    <span className="block text-[11px] text-slate-500">{s.designation}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={status === "saving"}
            className="bg-slate-900 text-white rounded-lg px-5 py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : editId ? "Save changes" : "Save log entry"}
          </button>
          {status === "saved" && <span className="text-sm text-green-600">Saved ✓</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <span className="text-xs text-slate-500">
            {role === "ADMIN"
              ? "As Admin, you can also edit this entry later from Daily Log Data."
              : "Once saved, this entry is view-only in Daily Log Data — only Admin can edit it."}
          </span>
        </div>
      </form>
    </div>
  );
}

export default function LogEntryPage() {
  return (
    <Suspense fallback={null}>
      <LogEntryForm />
    </Suspense>
  );
}
