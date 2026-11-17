import React from "react";
import { LuLoader, LuCheck, LuX } from "react-icons/lu";

// Reusable progress card
// status:  "running" | "success" | "error"
// percent: 0-100, or null for an indeterminate (pulsing) bar
// details: [{ label, value }]
// actions: optional buttons shown at the bottom
const ProgressCard = ({
  title,
  status = "running",
  percent = null,
  message = "",
  details = [],
  actions = null,
  onClose,
}) => {
  const isRunning = status === "running";
  const hasPercent = typeof percent === "number" && !isNaN(percent);
  const width = hasPercent ? Math.max(0, Math.min(100, percent)) : 100;

  const barColor =
    status === "success" ? "#16a34a" : status === "error" ? "#dc2626" : "var(--main-color)";

  const StatusIcon = status === "success" ? LuCheck : status === "error" ? LuX : LuLoader;

  const iconClass =
    status === "success"
      ? "text-green-600"
      : status === "error"
        ? "text-red-600"
        : "text-[var(--main-color)] animate-spin";

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <StatusIcon className={`text-lg ${iconClass}`} />
          <span className="font-semibold">{title}</span>
        </div>

        <div className="flex items-center space-x-3">
          {hasPercent && <span className="text-sm font-mono">{Math.floor(width)}%</span>}
          {!isRunning && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              title="Dismiss"
            >
              <LuX />
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isRunning && !hasPercent ? "animate-pulse" : ""
          }`}
          style={{ width: `${width}%`, backgroundColor: barColor }}
        />
      </div>

      {message && (
        <div
          className={`mt-2 text-sm ${
            status === "error" ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {message}
        </div>
      )}

      {details.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
          {details.map((d) => (
            <div key={d.label} className="break-all">
              <div className="uppercase tracking-wide">{d.label}</div>
              <div className="font-mono text-gray-800 dark:text-gray-200">{d.value}</div>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="mt-3 flex justify-end space-x-2">{actions}</div>}
    </div>
  );
};

export default ProgressCard;