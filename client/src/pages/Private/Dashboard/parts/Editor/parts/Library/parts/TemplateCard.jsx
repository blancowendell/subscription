import React, { useState } from "react";
import { btnPrimary, btnSecondary } from "../../../../../utils/buttonStyles";

const TYPE_SHADES = {
  card: "bg-gray-300 dark:bg-slate-600",
  graph: "bg-gray-400 dark:bg-slate-500",
  table: "bg-gray-200 dark:bg-slate-700",
  leaderboard: "bg-gray-300 dark:bg-slate-600",
  progress: "bg-gray-300 dark:bg-slate-600",
  text: "bg-gray-200 dark:bg-slate-700",
};

// Miniature of the template's layout
const Preview = ({ widgets }) => {
  const rows = Math.max(...widgets.map((w) => w.y + w.h), 1);
  return (
    <div
      className="grid gap-[2px] p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60"
      style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gridTemplateRows: `repeat(${rows}, 3px)` }}
      aria-hidden="true"
    >
      {widgets.map((w, i) => (
        <div
          key={i}
          className={`rounded-[3px] ${TYPE_SHADES[w.type] || TYPE_SHADES.card}`}
          style={{ gridColumn: `${w.x + 1} / span ${w.w}`, gridRow: `${w.y + 1} / span ${w.h}` }}
        />
      ))}
    </div>
  );
};

const TemplateCard = ({ template, needsConfirm, onUse }) => {
  const [confirming, setConfirming] = useState(false);

  const handleUse = () => {
    if (needsConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onUse(template.key);
  };

  return (
    <div className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <Preview widgets={template.widgets} />
      <div className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
        {template.name}
      </div>
      <div className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        {template.description}
      </div>

      {confirming && (
        <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
          This replaces everything on your dashboard. You can undo it.
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`${btnSecondary} !px-3 !py-1.5 !text-xs`}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleUse}
          className={`${confirming ? btnPrimary : btnSecondary} !px-3 !py-1.5 !text-xs`}
        >
          {confirming ? "Replace" : "Use template"}
        </button>
      </div>
    </div>
  );
};

export default TemplateCard;