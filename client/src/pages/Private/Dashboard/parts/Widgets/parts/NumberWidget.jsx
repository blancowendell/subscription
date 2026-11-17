import React from "react";
import { TbArrowDownRight, TbArrowUpRight, TbMinus } from "react-icons/tb";
import WidgetCard from "./WidgetCard";
import { aggregate, formatChange, formatValue, percentChange } from "../../../utils/formatters";
import { withAlpha } from "../../../utils/colors";

const TONE_CLASSES = {
  good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  bad: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  flat: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
};

const NumberWidget = ({ widget, rows, settings, color, icon: Icon, valueField, compareField }) => {
  const format = settings.format || "number";
  const mode = settings.aggregate || "auto";

  const value = aggregate(rows, valueField, mode);
  const previous = compareField ? aggregate(rows, compareField, mode) : null;
  const change =
    previous !== null && value !== null ? formatChange(percentChange(value, previous)) : null;

  // Some numbers are better when they go down (overdue invoices, returns)
  let tone = "flat";
  if (change && change.tone !== "flat") {
    tone = (change.tone === "up") !== Boolean(settings.lowerIsBetter) ? "good" : "bad";
  }

  let Arrow = TbMinus;
  if (change?.tone === "up") Arrow = TbArrowUpRight;
  if (change?.tone === "down") Arrow = TbArrowDownRight;

  const subtitle = settings.subtitle || (change ? "vs previous" : "");

  return (
    <WidgetCard title={widget.title} icon={Icon} color={color}>
      {/* Large faded icon in the corner gives each number card its own character */}
      {Icon && (
        <Icon
          aria-hidden="true"
          className="absolute -right-3 -bottom-4 pointer-events-none"
          size={96}
          style={{ color: withAlpha(color.main, 0.08), transform: "rotate(-12deg)" }}
        />
      )}

      <div className="relative h-full flex flex-col justify-center min-w-0">
        <div
          className="text-[34px] font-black tracking-tight leading-none text-gray-900 dark:text-white truncate tabular-nums"
          title={formatValue(value, format)}
        >
          {formatValue(value, format, { compact: true })}
        </div>

        {(change || subtitle) && (
          <div className="flex items-center gap-2 mt-2.5 text-xs min-w-0">
            {change && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold shrink-0 ${TONE_CLASSES[tone]}`}
              >
                <Arrow size={13} />
                {change.text}
              </span>
            )}
            {subtitle && (
              <span className="text-gray-500 dark:text-gray-400 truncate">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default NumberWidget;