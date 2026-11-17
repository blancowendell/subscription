import React from "react";
import WidgetCard from "./WidgetCard";
import { formatValue, toNumber } from "../../../utils/formatters";
import { withAlpha } from "../../../utils/colors";

const ProgressWidget = ({
  widget,
  rows,
  settings,
  color,
  icon,
  valueField,
  labelField,
  targetField,
}) => {
  const limit = Number(settings.limit) || 8;
  const format = settings.format || "number";

  const items = rows.slice(0, limit).map((row) => ({
    label: labelField ? String(row?.[labelField] ?? "—") : "—",
    value: toNumber(row?.[valueField]) ?? 0,
    target: targetField ? toNumber(row?.[targetField]) : null,
  }));

  const max = Math.max(...items.map((item) => item.target ?? item.value), 1);

  return (
    <WidgetCard title={widget.title} icon={icon} color={color}>
      <div className="h-full overflow-auto space-y-3 pr-1">
        {items.map((item, i) => {
          const base = item.target && item.target > 0 ? item.target : max;
          const pct = Math.min(100, Math.max(0, (item.value / base) * 100));

          return (
            <div key={`${item.label}-${i}`} className="min-w-0">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="truncate text-gray-700 dark:text-gray-200">{item.label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                  {formatValue(item.value, format, { compact: true })}
                  {item.target ? ` of ${formatValue(item.target, format, { compact: true })}` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${withAlpha(color.main, 0.45)}, ${color.main})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
};

export default ProgressWidget;