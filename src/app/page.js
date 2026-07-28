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
import { fmt, dayLabel, fullDateLabel } from "@/lib/format";
import { ROLES } from "@/lib/roles";

const EQ_COLORS = [
  "#0ea5e9",
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

// Card `color` theme per equipment, in lockstep with EQ_COLORS above.
const EQ_CARD_THEMES = ["sky", "indigo", "teal", "amber", "rose", "violet"];

const CARD_THEMES = {
  amber: { bar: "bg-amber-300", value: "text-amber-600" },
  orange: { bar: "bg-orange-300", value: "text-orange-600" },
  teal: { bar: "bg-teal-300", value: "text-teal-600" },
  cyan: { bar: "bg-cyan-300", value: "text-cyan-600" },
  emerald: { bar: "bg-emerald-300", value: "text-emerald-600" },
  sky: { bar: "bg-sky-300", value: "text-sky-600" },
  indigo: { bar: "bg-indigo-300", value: "text-indigo-600" },
  violet: { bar: "bg-violet-300", value: "text-violet-600" },
  blue: { bar: "bg-blue-300", value: "text-blue-600" },
  fuchsia: { bar: "bg-fuchsia-300", value: "text-fuchsia-600" },
  rose: { bar: "bg-rose-300", value: "text-rose-600" },
};

// Trend colors stay in lockstep with the KPI card colors above.
const TREND_COLORS = {
  diesel: "#f59e0b",
  nepa: "#f43f5e",
  milling: "#d946ef",
  utility: "#3b82f6",
};

const LOGO_CLASS = "object-contain drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)]";

// Trend chart tooltips show the full date, while the axis itself just shows
// the day-of-month (via dayLabel) to keep tick labels compact.
function trendTooltipLabel(_label, payload) {
  const date = payload?.[0]?.payload?.date;
  return date ? fullDateLabel(date) : _label;
}

const STOCK_GAUGE_MAX = 45000;
const STOCK_GAUGE_BANDS = [
  { from: 0, to: 0.15, base: "#dc2626", light: "#f87171" },
  { from: 0.15, to: 0.35, base: "#ea580c", light: "#fb923c" },
  { from: 0.35, to: 0.6, base: "#ca8a04", light: "#fde047" },
  { from: 0.6, to: 1, base: "#16a34a", light: "#4ade80" },
];

// 3D-style fuel gauge (E..F) for the Current Total Stock card. The needle
// rotates to `value` on a 0..max scale, clamping at F if value exceeds max.
function StockGauge({ value, max = STOCK_GAUGE_MAX }) {
  const ratio = Math.max(0, Math.min(1, (value ?? 0) / max));
  const angle = ratio * 180 - 90;
  const cx = 64;
  const cy = 62;
  const r = 44;
  const bandWidth = 11;
  const bezelR = r + bandWidth / 2 + 5;

  function pt(fraction, radius) {
    const a = (fraction * 180 * Math.PI) / 180;
    return [cx - radius * Math.cos(a), cy - radius * Math.sin(a)];
  }

  const [bx0, by0] = pt(0, bezelR);
  const [bx1, by1] = pt(1, bezelR);

  return (
    <svg width="90" height="56" viewBox="0 0 128 80">
      <defs>
        {STOCK_GAUGE_BANDS.map((b, i) => (
          <linearGradient key={i} id={`stock-gauge-band${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={b.light} />
            <stop offset="55%" stopColor={b.base} />
            <stop offset="100%" stopColor={b.base} stopOpacity="0.75" />
          </linearGradient>
        ))}
        <radialGradient id="stock-gauge-bezel" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>
        <radialGradient id="stock-gauge-face" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
        <radialGradient id="stock-gauge-hub" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <linearGradient id="stock-gauge-needle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="55%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <filter id="stock-gauge-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.3" floodColor="#0f172a" floodOpacity="0.35" />
        </filter>
      </defs>

      <path
        d={`M ${bx0} ${by0} A ${bezelR} ${bezelR} 0 0 1 ${bx1} ${by1} L ${cx} ${cy} Z`}
        fill="url(#stock-gauge-bezel)"
        filter="url(#stock-gauge-shadow)"
      />
      <circle cx={cx} cy={cy} r={r - bandWidth / 2 - 1} fill="url(#stock-gauge-face)" />

      {STOCK_GAUGE_BANDS.map((b, i) => {
        const [x0, y0] = pt(b.from, r);
        const [x1, y1] = pt(b.to, r);
        const large = b.to - b.from > 0.5 ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
            stroke={`url(#stock-gauge-band${i})`}
            strokeWidth={bandWidth}
            fill="none"
          />
        );
      })}
      {[0, 0.15, 0.35, 0.6, 1].map((f, i) => {
        const [ix, iy] = pt(f, r - bandWidth / 2 - 0.5);
        const [ox, oy] = pt(f, r + bandWidth / 2 + 0.5);
        return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#ffffff" strokeWidth="1.4" />;
      })}

      <text x={cx - r - bandWidth / 2 - 2} y={cy + 15} fontSize="13" fontWeight="800" fill="#dc2626" textAnchor="middle" fontFamily="Georgia, serif">
        E
      </text>
      <text x={cx + r + bandWidth / 2 + 2} y={cy + 15} fontSize="13" fontWeight="800" fill="#16a34a" textAnchor="middle" fontFamily="Georgia, serif">
        F
      </text>

      <g filter="url(#stock-gauge-shadow)" transform={`rotate(${angle} ${cx} ${cy})`}>
        <path d={`M ${cx - 2} ${cy} L ${cx} ${cy - r + 8} L ${cx + 2} ${cy} Z`} fill="url(#stock-gauge-needle)" />
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 9} stroke="#fecaca" strokeWidth="0.6" strokeOpacity="0.8" />
      </g>
      <circle cx={cx} cy={cy} r={6} fill="url(#stock-gauge-hub)" filter="url(#stock-gauge-shadow)" />
      <circle cx={cx - 1.6} cy={cy - 1.8} r={1.6} fill="#f8fafc" fillOpacity="0.9" />
    </svg>
  );
}

// Generic "hours run" glyph shared by the equipment KPI cards below — there's
// no dedicated per-machine art in /icons, so color + label do the differentiating.
function StopwatchIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13 L12 8.5" />
      <path d="M12 13 L15 15" />
      <path d="M9 2 h6" />
      <path d="M12 2 v2.5" />
      <path d="M19 5 l1.5 -1.5" />
    </svg>
  );
}

function Card({ label, value, unit, color = "sky", logo, compact = false }) {
  const theme = CARD_THEMES[color] ?? CARD_THEMES.sky;

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className={`absolute inset-x-0 top-0 h-1 z-10 ${theme.bar}`} />
        <div className="flex items-center gap-3 px-3 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center">{logo}</div>
          <div className="min-w-0">
            <div className="mb-0.5 truncate text-[11px] font-semibold uppercase leading-[1.3] tracking-wide text-slate-500">
              {label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-[19px] font-bold leading-none ${theme.value}`}>{value}</span>
              {unit && <span className="text-[12px] font-medium text-slate-400">{unit}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 z-10 ${theme.bar}`} />
      <div className="absolute inset-x-0 top-[10px] flex h-24 items-start justify-center">
        {logo}
      </div>
      <div className="absolute inset-x-0 bottom-[10px] flex flex-col items-center px-2 text-center">
        <div className="mb-0.5 text-[11px] font-semibold uppercase leading-[1.35] tracking-wide text-slate-500">
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-[22px] font-bold leading-none ${theme.value}`}>{value}</span>
          {unit && <span className="text-[12.5px] font-medium text-slate-400">{unit}</span>}
        </div>
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
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            <Card
              label={<>Diesel<br />Consumed</>}
              value={fmt(t.dieselConsumed)}
              unit="Liters"
              color="amber"
              // eslint-disable-next-line @next/next/no-img-element
              logo={<img src="/icons/fuel-gun.png" alt="" className={`h-[54px] w-[54px] ${LOGO_CLASS}`} />}
            />
            <Card
              label={<>Diesel<br />Received</>}
              value={fmt(t.dieselReceived)}
              unit="Liters"
              color="orange"
              // eslint-disable-next-line @next/next/no-img-element
              logo={<img src="/icons/diesel-received.png" alt="" className={`h-[48px] w-[86px] ${LOGO_CLASS}`} />}
            />
            <Card
              label={<>Main Tank<br />Stock</>}
              value={fmt(data.latestDieselStock)}
              unit="Liters"
              color="teal"
              // eslint-disable-next-line @next/next/no-img-element
              logo={<img src="/icons/main-tank.png" alt="" className={`h-[65px] w-[65px] ${LOGO_CLASS}`} />}
            />
            <Card
              label={<>Service Tank<br />Stock</>}
              value={fmt(data.latestServiceTank)}
              unit="Liters"
              color="cyan"
              logo={
                <div className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/service-tank.png" alt="" className={`h-[47px] w-[47px] ${LOGO_CLASS}`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/service-tank.png" alt="" className={`-ml-[19px] h-[47px] w-[47px] ${LOGO_CLASS}`} />
                </div>
              }
            />
            <Card
              label={<>Current Total<br />Stock</>}
              value={fmt(data.latestTotalStock)}
              unit="Liters"
              color="emerald"
              logo={<StockGauge value={data.latestTotalStock} />}
            />
            <Card
              label={<>NEPA Power<br />Consumption</>}
              value={fmt(t.nepaKwh)}
              unit="KWH"
              color="rose"
              // eslint-disable-next-line @next/next/no-img-element
              logo={<img src="/icons/nepa-power.png" alt="" className={`h-[77px] w-[77px] ${LOGO_CLASS}`} />}
            />
            {isAdmin && (
              <>
                <Card
                  label={<>Milling Power<br />Consumption</>}
                  value={fmt(t.ebMilling)}
                  unit="KWH"
                  color="fuchsia"
                  // eslint-disable-next-line @next/next/no-img-element
                  logo={<img src="/icons/milling.png" alt="" className={`h-[52px] w-[83px] ${LOGO_CLASS}`} />}
                />
                <Card
                  label={<>Utility Power<br />Consumption</>}
                  value={fmt(t.ebUtility)}
                  unit="KWH"
                  color="blue"
                  // eslint-disable-next-line @next/next/no-img-element
                  logo={<img src="/icons/utility.png" alt="" className={`h-[45px] w-[110px] ${LOGO_CLASS}`} />}
                />
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
                  <Tooltip labelFormatter={trendTooltipLabel} />
                  <Bar dataKey="dieselConsumption" name="Diesel (L)" fill={TREND_COLORS.diesel} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Daily Power Consumption (KWH)">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={trendTooltipLabel} />
                  <Legend />
                  <Line type="monotone" dataKey="nepaConsumption" name="NEPA" stroke={TREND_COLORS.nepa} dot={false} strokeWidth={2} />
                  {isAdmin && <Line type="monotone" dataKey="ebMilling" name="Milling" stroke={TREND_COLORS.milling} dot={false} strokeWidth={2} />}
                  {isAdmin && <Line type="monotone" dataKey="ebUtility" name="Utility" stroke={TREND_COLORS.utility} dot={false} strokeWidth={2} />}
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Daily Equipment Run Hours">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={trendTooltipLabel} />
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
                  const scaleMin = a.scaleMin ?? 0;
                  const scaleMax = a.scaleMax;
                  const pct =
                    a.remaining != null && scaleMax != null && scaleMax > scaleMin
                      ? Math.max(0, Math.min(100, ((a.remaining - scaleMin) / (scaleMax - scaleMin)) * 100))
                      : 0;
                  const days = a.remaining != null ? a.remaining / 24 : null;
                  return (
                    <div key={a.field}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{a.label}</span>
                        <span className={a.due ? "text-red-600 font-semibold" : "text-slate-500"}>
                          {fmt(a.remaining)} hrs
                          {days != null && <span> = {fmt(days, 0)} days</span>}
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
              {RUN_HOUR_EQUIPMENT.map((eq, i) => {
                const theme = EQ_CARD_THEMES[i % EQ_CARD_THEMES.length];
                return (
                  <Card
                    key={eq.field}
                    label={eq.label}
                    value={fmt(data.runHoursTotal[eq.field], 1)}
                    unit="hrs"
                    color={theme}
                    compact
                    logo={<StopwatchIcon className={`h-7 w-7 ${CARD_THEMES[theme].value} opacity-70`} />}
                  />
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
