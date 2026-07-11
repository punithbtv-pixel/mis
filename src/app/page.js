"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import MonthPicker from "@/components/MonthPicker";
import { RUN_HOUR_EQUIPMENT } from "@/lib/equipment";
import { currentMonth } from "@/lib/dates";
import { fmt, dayLabel } from "@/lib/format";
import { ROLES } from "@/lib/roles";

const EQ_COLORS = [
  "#0ea5e9",
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

function Card({ label, value, unit, accent = "text-slate-900" }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${accent}`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const loading = data == null;
  const isAdmin = user?.role === ROLES.ADMIN;

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d.user))
      .catch(() => {});
  }, []);

  function onMonthChange(nextMonth) {
    setMonth(nextMonth);
    setData(null);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/dashboard?month=${month}`)
      .then((r) => r.json())
      .then((d) => active && setData(d))
      .catch(() => active && setData({ series: [], rows: [], totals: {}, alerts: [] }));
    return () => {
      active = false;
    };
  }, [month]);

  const series = useMemo(
    () => (data?.series ?? []).map((s) => ({ ...s, day: dayLabel(s.date) })),
    [data]
  );

  const t = data?.totals;
  const hasData = series.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Summary Dashboard</h1>
        <MonthPicker month={month} onChange={onMonthChange} />
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && !hasData && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No readings for this month yet.{" "}
          <a href="/entry" className="text-sky-600 font-medium">
            Add a daily entry →
          </a>
        </div>
      )}

      {!loading && hasData && (
        <>
          <div className={`grid gap-3 ${isAdmin ? "grid-cols-8" : "grid-cols-6"}`}>
            <Card label="Diesel Consumed" value={fmt(t.dieselConsumed)} unit="Liters" accent="text-amber-600" />
            <Card label="Diesel Received" value={fmt(t.dieselReceived)} unit="Liters" />
            <Card label="Main Tank Stock" value={fmt(data.latestDieselStock)} unit="Liters" />
            <Card label="Service Tank Stock" value={fmt(data.latestServiceTank)} unit="Liters" />
            <Card label="Current Total Stock" value={fmt(data.latestTotalStock)} unit="Liters" accent="text-emerald-600" />
            <Card label="NEPA Power Consumption" value={fmt(t.nepaKwh)} unit="KWH" accent="text-sky-600" />
            {isAdmin && (
              <>
                <Card label="Milling Power Consumption" value={fmt(t.ebMilling)} unit="KWH" />
                <Card label="Utility Power Consumption" value={fmt(t.ebUtility)} unit="KWH" />
              </>
            )}
          </div>

          {data.alerts?.some((a) => a.due) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-red-700 mb-2">
                Service Due Soon
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.alerts
                  .filter((a) => a.due)
                  .map((a) => (
                    <span
                      key={a.field}
                      className="inline-flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-3 py-1 text-sm text-red-700"
                    >
                      <span className="font-medium">{a.label}</span>
                      {fmt(a.remaining)} hrs left
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Daily Diesel Consumption (L)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="dieselConsumption" name="Diesel (L)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Daily Power Consumption (KWH)">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="nepaConsumption" name="NEPA" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                  {isAdmin && (
                    <>
                      <Line type="monotone" dataKey="ebMilling" name="Milling" stroke="#6366f1" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="ebUtility" name="Utility" stroke="#14b8a6" dot={false} strokeWidth={2} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Daily Equipment Run Hours">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  {RUN_HOUR_EQUIPMENT.map((eq, i) => (
                    <Bar
                      key={eq.field}
                      dataKey={eq.field}
                      name={eq.label}
                      stackId="rh"
                      fill={EQ_COLORS[i % EQ_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Hours Remaining To Next Service">
              <div className="space-y-3 py-1">
                {data.alerts.map((a) => {
                  const pct =
                    a.remaining != null && a.target
                      ? Math.max(0, Math.min(100, (a.remaining / a.target) * 100))
                      : 0;
                  return (
                    <div key={a.field}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{a.label}</span>
                        <span className={a.due ? "text-red-600 font-semibold" : "text-slate-500"}>
                          {fmt(a.remaining)} hrs
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${a.due ? "bg-red-500" : "bg-sky-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <Panel title="Total Run Hours This Month">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {RUN_HOUR_EQUIPMENT.map((eq) => (
                <div key={eq.field} className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{eq.label}</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {fmt(data.runHoursTotal[eq.field], 1)}
                    <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
