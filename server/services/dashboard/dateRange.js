// Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD for dashboard data sources.
// Missing or invalid -> today. from after to -> swapped. Longer than MAX_DAYS -> the last MAX_DAYS.
const MAX_DAYS = 366;

const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const parseDay = (value) => {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects dates like 2026-02-31
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

const getDateRange = (req) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let from = parseDay(req.query?.from) || today;
  let to = parseDay(req.query?.to) || (parseDay(req.query?.from) ? from : today);
  if (from > to) [from, to] = [to, from];

  let days = Math.round((to - from) / 86400000) + 1;
  if (days > MAX_DAYS) {
    from = addDays(to, -(MAX_DAYS - 1));
    days = MAX_DAYS;
  }

  return {
    // Use as: column >= from AND column < end  (works for DATE and DATETIME)
    from: toKey(from),
    to: toKey(to),
    end: toKey(addDays(to, 1)),
    days,
    // The same-length period right before, for comparisons
    prevFrom: toKey(addDays(from, -days)),
    fromDate: from,
    toDate: to,
  };
};

// Every day in the range, for charts that show days with no data as 0
const eachDay = (range) =>
  Array.from({ length: range.days }, (_, i) => addDays(range.fromDate, i));

// Every month the range touches
const eachMonth = (range) => {
  const months = [];
  const cursor = new Date(range.fromDate.getFullYear(), range.fromDate.getMonth(), 1);
  const last = new Date(range.toDate.getFullYear(), range.toDate.getMonth(), 1);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

// The range as query params, for passing on to another system
const rangeParams = (req) => {
  const { from, to } = getDateRange(req);
  return { from, to };
};

module.exports = { getDateRange, eachDay, eachMonth, rangeParams, toKey, MAX_DAYS };