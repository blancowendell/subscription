import React from "react";
import { withAlpha } from "../../../utils/colors";
import { TbAlertTriangle, TbClick, TbDatabaseOff, TbLock } from "react-icons/tb";

const STATE_ICONS = {
  error: TbAlertTriangle,
  empty: TbDatabaseOff,
  setup: TbClick,
  locked: TbLock,
};
const LoadingState = () => (
  <div className="h-full w-full flex flex-col justify-center gap-2 animate-pulse">
    <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
    <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
  </div>
);

const MessageState = ({ state, message, onRetry, color }) => {
  const Icon = STATE_ICONS[state] || TbDatabaseOff;
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center gap-1 px-2">
      <Icon size={22} className={state === "error" ? "text-red-500" : "text-gray-400"} />
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium mt-1 hover:underline"
          style={{ color: color.main }}
        >
          Try again
        </button>
      )}
    </div>
  );
};

// Shared shell: a thin accent line in the widget's color, a soft glow in the
// top-right corner, and the icon + title header.
const WidgetCard = ({
  title,
  icon: Icon,
  color,
  state = null,
  message = "",
  onRetry,
  tint = false,
  headerRight,
  children,
}) => {
  const layers = [
    `radial-gradient(circle at 100% 0%, ${withAlpha(color.main, 0.12)} 0%, transparent 45%)`,
  ];
  if (tint) layers.push(`linear-gradient(${color.soft}, ${color.soft})`);

  return (
    <div
      className="relative h-full w-full flex flex-col rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ backgroundImage: layers.join(", ") }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${color.main}, ${withAlpha(color.main, 0.15)})` }}
      />

      {(title || Icon || headerRight) && (
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-1 min-w-0">
          {Icon && (
            <span
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: withAlpha(color.main, 0.14), color: color.main }}
            >
              <Icon size={17} />
            </span>
          )}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
            {title}
          </div>
          {headerRight && <div className="ml-auto shrink-0">{headerRight}</div>}
        </div>
      )}

      <div className="relative flex-1 min-h-0 px-4 pb-4 pt-1">
        {state === "loading" ? (
          <LoadingState />
        ) : state ? (
          <MessageState state={state} message={message} onRetry={onRetry} color={color} />
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default WidgetCard;