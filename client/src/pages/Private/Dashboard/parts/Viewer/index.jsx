import React from "react";
import { TbPlus, TbRefresh } from "react-icons/tb";
import { btnPrimary, btnSecondary } from "../../utils/buttonStyles";
import Widget from "../Widgets";
import { GRID_COLS, GRID_MARGIN, ROW_HEIGHT } from "../../utils/widgetCatalog";
import { gridPlacement } from "../../utils/layoutEngine";

const heightInPx = (rows) => rows * ROW_HEIGHT + (rows - 1) * GRID_MARGIN[1];

// Phones get each widget full width, in reading order, with a sensible height
const stackedHeight = (widget) => {
  if (widget.type === "card") return 130;
  if (widget.type === "text") return Math.max(120, heightInPx(widget.h));
  return Math.max(280, heightInPx(widget.h));
};

const Viewer = ({
  widgets,
  stacked = false,
  loading = false,
  error = null,
  onRetry,
  onStart,
  canEdit = true,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-[var(--main-color)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <p className="text-gray-600 dark:text-gray-300">{error}</p>
        <button type="button" onClick={onRetry} className={btnSecondary}>
          <TbRefresh size={16} /> Try again
        </button>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Build your dashboard
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
          Put the numbers, charts and lists you check every day in one place. Start from a
          template or add widgets one by one.
        </p>
        {canEdit && onStart && (
          <button type="button" onClick={onStart} className={`${btnPrimary} mt-5`}>
            <TbPlus size={16} /> Start building
          </button>
        )}
      </div>
    );
  }

  if (stacked) {
    const ordered = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
    return (
      <div className="flex flex-col gap-4">
        {ordered.map((w) => (
          <div key={w.id} style={{ height: stackedHeight(w) }}>
            <Widget widget={w} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid min-w-0"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_HEIGHT}px`,
        gap: `${GRID_MARGIN[1]}px ${GRID_MARGIN[0]}px`,
      }}
    >
      {widgets.map((w) => (
        <div key={w.id} className="min-w-0" style={gridPlacement(w)}>
          <Widget widget={w} />
        </div>
      ))}
    </div>
  );
};

export default Viewer;