import React from "react";
import WidgetCard from "./WidgetCard";
import { formatValue, toNumber } from "../../../utils/formatters";
import { withAlpha } from "../../../utils/colors";

// Top three get solid badges that fade by rank; the rest stay soft
const RANK_STRENGTH = [1, 0.75, 0.55];

const TopListWidget = ({ widget, rows, settings, color, icon, valueField, labelField }) => {
  const limit = Number(settings.limit) || 5;
  const format = settings.format || "number";

  const items = rows
    .map((row) => ({
      label: labelField ? String(row?.[labelField] ?? "—") : "—",
      value: toNumber(row?.[valueField]),
    }))
    .filter((item) => item.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <WidgetCard title={widget.title} icon={icon} color={color}>
      <ol className="h-full overflow-auto space-y-3 pr-1">
        {items.map((item, i) => {
          const strength = RANK_STRENGTH[i];
          return (
            <li key={`${item.label}-${i}`} className="min-w-0">
              <div className="flex items-center gap-2.5 text-sm">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={
                    strength
                      ? { background: withAlpha(color.main, strength), color: "#fff" }
                      : { background: withAlpha(color.main, 0.12), color: color.main }
                  }
                >
                  {i + 1}
                </span>
                <span
                  className={`truncate text-gray-700 dark:text-gray-200 ${i === 0 ? "font-semibold" : ""}`}
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="ml-auto shrink-0 font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatValue(item.value, format, { compact: true })}
                </span>
              </div>
              <div className="ml-[34px] mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(Math.abs(item.value) / max) * 100}%`,
                    background: `linear-gradient(90deg, ${withAlpha(color.main, 0.45)}, ${color.main})`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </WidgetCard>
  );
};

export default TopListWidget;