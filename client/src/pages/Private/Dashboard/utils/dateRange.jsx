import { createContext, useContext } from "react";
import dayjs from "dayjs";

export const DATE_FORMAT = "YYYY-MM-DD";

// Quick picks shown as chips above the calendar
export const RANGE_PRESETS = [
  { key: "today", label: "Today", get: () => [dayjs(), dayjs()] },
  {
    key: "yesterday",
    label: "Yesterday",
    get: () => [dayjs().subtract(1, "day"), dayjs().subtract(1, "day")],
  },
  { key: "last7", label: "Last 7 days", get: () => [dayjs().subtract(6, "day"), dayjs()] },
  { key: "thisMonth", label: "This month", get: () => [dayjs().startOf("month"), dayjs()] },
  {
    key: "lastMonth",
    label: "Last month",
    get: () => [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ],
  },
];

export const presetRange = (key) => {
  const preset = RANGE_PRESETS.find((p) => p.key === key) || RANGE_PRESETS[0];
  const [from, to] = preset.get();
  return { preset: preset.key, from: from.format(DATE_FORMAT), to: to.format(DATE_FORMAT) };
};

export const customRange = (start, end) => {
  const [from, to] = start.isAfter(end) ? [end, start] : [start, end];
  return { preset: "custom", from: from.format(DATE_FORMAT), to: to.format(DATE_FORMAT) };
};

// "Fri, Oct 30, 2026" · "Oct 1 – Oct 30, 2026" · "Dec 1, 2025 – Jan 5, 2026"
export const describeRange = ({ from, to }) => {
  const a = dayjs(from);
  const b = dayjs(to);
  if (a.isSame(b, "day")) return a.format("ddd, MMM D, YYYY");
  if (a.isSame(b, "year")) return `${a.format("MMM D")} – ${b.format("MMM D, YYYY")}`;
  return `${a.format("MMM D, YYYY")} – ${b.format("MMM D, YYYY")}`;
};

// The dashboard's selected range. Every widget reads it; without a provider it's today.
const DashboardRangeContext = createContext(presetRange("today"));

export const DashboardRangeProvider = DashboardRangeContext.Provider;

export const useDashboardRange = () => useContext(DashboardRangeContext);