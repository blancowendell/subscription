const numberFormat = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const pesoFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});
const pesoWhole = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[,₱\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const formatValue = (value, format = "number", { compact = false } = {}) => {
  const n = toNumber(value);
  if (n === null) {
    return value === null || value === undefined || value === "" ? "—" : String(value);
  }

  const useCompact = compact && Math.abs(n) >= 10000;

  if (format === "percent") return `${numberFormat.format(n)}%`;
  if (format === "currency") {
    if (useCompact) return `₱${compactFormat.format(n)}`;
    return compact ? pesoWhole.format(n) : pesoFormat.format(n);
  }
  return useCompact ? compactFormat.format(n) : numberFormat.format(n);
};

export const humanizeField = (name) => {
  const text = String(name || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// "auto" = the single value if there's one row, otherwise the total
export const aggregate = (rows, field, mode = "auto") => {
  if (mode === "count") return rows.length;

  const values = rows.map((row) => toNumber(row?.[field])).filter((v) => v !== null);
  if (values.length === 0) return null;

  const resolved = mode === "auto" ? (values.length === 1 ? "first" : "sum") : mode;
  const sum = () => values.reduce((a, b) => a + b, 0);

  switch (resolved) {
    case "first":
      return values[0];
    case "average":
      return sum() / values.length;
    case "max":
      return Math.max(...values);
    case "min":
      return Math.min(...values);
    default:
      return sum();
  }
};

export const percentChange = (current, previous) => {
  const cur = toNumber(current);
  const prev = toNumber(previous);
  if (cur === null || prev === null || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

export const formatChange = (pct) => {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null;
  return {
    text: `${pct > 0 ? "+" : ""}${oneDecimal.format(pct)}%`,
    tone: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
  };
};