import React from "react";
import { CHART_TYPES } from "../../../../../../utils/widgetCatalog";

const ChartTypePicker = ({ value, onChange }) => (
  <div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Chart type</div>
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Chart type">
      {CHART_TYPES.map((option) => {
        const Icon = option.icon;
        const active = (value || "bar") === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-[11px] transition-colors ${
              active
                ? "border-[var(--main-color)] text-[var(--main-color)] font-semibold"
                : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
            }`}
          >
            <Icon size={18} />
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default ChartTypePicker;
