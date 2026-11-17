import React from "react";
import dayjs from "dayjs";
import { TbCalendarEvent } from "react-icons/tb";
import FloatingDateRangePicker from "../../../../../../components/Forms/DateRangePicker";
import { RANGE_PRESETS, customRange, describeRange, presetRange } from "../../../utils/dateRange";

// Date range for every widget on the dashboard: quick picks + a calendar for anything else
const DateFilter = ({ range, onChange }) => {
  const handlePicker = (values) => {
    // Clearing the calendar goes back to today
    if (!values || !values[0] || !values[1]) {
      onChange(presetRange("today"));
      return;
    }
    onChange(customRange(values[0], values[1]));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--main-color) 16%, transparent)",
            color: "var(--main-color)",
          }}
        >
          <TbCalendarEvent size={16} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Showing data for
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {describeRange(range)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date ranges">
        {RANGE_PRESETS.map((preset) => {
          const active = range.preset === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(presetRange(preset.key))}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                active
                  ? "font-semibold"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
              style={
                active
                  ? {
                      background: "var(--main-color)",
                      color: "var(--main-text-color)",
                      border: "1px solid var(--main-color)",
                      boxShadow: "none",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid rgba(148, 163, 184, 0.45)",
                      boxShadow: "none",
                    }
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* The picker brings its own outer margins; the dashboard header doesn't need them */}
      <div className="[&>div]:!my-0">
        <FloatingDateRangePicker
          id="dashboard-date-range"
          value={[dayjs(range.from), dayjs(range.to)]}
          onChange={handlePicker}
        />
      </div>
    </div>
  );
};

export default DateFilter;