export function fmt(n, dp = 0) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function monthLabel(month) {
  if (!month) return "";
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dayLabel(dateStr) {
  if (!dateStr) return "";
  return dateStr.slice(8, 10); // day-of-month
}

// DD/MM/YY, for trend chart tooltips (the axis itself uses the shorter dayLabel).
export function fullDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y.slice(2)}`;
}
