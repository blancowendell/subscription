const { TransactionWithConnection } = require("../connections/sqlhelper");

const RESET_PERIODS = ["NEVER", "YEARLY", "MONTHLY", "DAILY"];

const pad2 = (n) => String(n).padStart(2, "0");

// Identifies the current reset period; null means the counter never resets
const periodKey = (resetPeriod, date = new Date()) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  switch (resetPeriod) {
    case "YEARLY":
      return `${y}`;
    case "MONTHLY":
      return `${y}${m}`;
    case "DAILY":
      return `${y}${m}${d}`;
    default:
      return null;
  }
};

// A reset needs the matching date parts in the format, or numbers would repeat
const resetRuleError = ({ reset_period, include_year, include_month, include_day }) => {
  if (reset_period === "YEARLY" && !include_year) return "A yearly reset needs the year in the format.";
  if (reset_period === "MONTHLY" && !(include_year && include_month))
    return "A monthly reset needs the year and month in the format.";
  if (reset_period === "DAILY" && !(include_year && include_month && include_day))
    return "A daily reset needs the year, month and day in the format.";
  return null;
};

// Row (ms_ prefixed) -> plain settings
const fromRow = (row) => ({
  prefix: row.ms_prefix ?? "",
  separator: row.ms_separator ?? "",
  padding_length: Number(row.ms_padding_length) || 0,
  include_year: Boolean(Number(row.ms_include_year)),
  year_format: row.ms_year_format || "YYYY",
  include_month: Boolean(Number(row.ms_include_month)),
  include_day: Boolean(Number(row.ms_include_day)),
});

const formatSequence = (settings, number, date = new Date()) => {
  const dateParts = [];
  if (settings.include_year) {
    const fullYear = String(date.getFullYear());
    dateParts.push(settings.year_format === "YY" ? fullYear.slice(-2) : fullYear);
  }
  if (settings.include_month) dateParts.push(pad2(date.getMonth() + 1));
  if (settings.include_day) dateParts.push(pad2(date.getDate()));

  const separator = settings.separator || "";
  const datePart = dateParts.join(separator);
  const paddedNum = String(number).padStart(settings.padding_length, "0");
  return `${settings.prefix}${datePart ? datePart + separator : ""}${paddedNum}`;
};

// The number the next call will issue
const nextNumberFor = (row, key) => {
  const unused = row.ms_current_number === null || row.ms_current_number === undefined;
  const periodChanged = row.ms_reset_period !== "NEVER" && row.ms_period_key !== key;
  return unused || periodChanged ? Number(row.ms_start_number) : Number(row.ms_current_number) + 1;
};

// What the next issued value will look like, without issuing it
const previewNext = (row, date = new Date()) =>
  formatSequence(fromRow(row), nextNumberFor(row, periodKey(row.ms_reset_period, date)), date);

// Issues `count` consecutive values. The row is locked for the duration,
// so concurrent callers never receive the same number.
// If the caller's own insert fails afterwards, those numbers are skipped (a gap), never reused.
const reserveSequence = async ({ id, code, count = 1 }) => {
  if (!id && !code) throw new Error("A sequence id or code is required.");
  if (!Number.isInteger(count) || count < 1) throw new Error("Count must be a positive whole number.");

  const values = [];

  await TransactionWithConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT * FROM maintenance_sequence WHERE ${id ? "ms_id" : "ms_code"} = ? FOR UPDATE`,
      [id || code],
    );

    if (rows.length === 0) throw new Error(`Sequence "${id || code}" not found.`);
    const row = rows[0];
    if (row.ms_status !== "ACTIVE") throw new Error(`Sequence "${row.ms_name}" is inactive.`);

    const now = new Date();
    const key = periodKey(row.ms_reset_period, now);
    const first = nextNumberFor(row, key);
    const settings = fromRow(row);

    for (let i = 0; i < count; i++) {
      values.push(formatSequence(settings, first + i, now));
    }

    await connection.execute(
      `UPDATE maintenance_sequence SET ms_current_number = ?, ms_period_key = ? WHERE ms_id = ?`,
      [first + count - 1, key, row.ms_id],
    );
  });

  return values;
};

// One value: await nextSequence({ code: "INVOICE" }) or nextSequence({ id: 3 })
const nextSequence = async (options) => (await reserveSequence({ ...options, count: 1 }))[0];

module.exports = {
  RESET_PERIODS,
  periodKey,
  resetRuleError,
  formatSequence,
  previewNext,
  reserveSequence,
  nextSequence,
};