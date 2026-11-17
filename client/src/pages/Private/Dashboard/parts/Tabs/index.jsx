import React from "react";
import { TbPlus } from "react-icons/tb";

// One tab per dashboard, plus a button to add another.
// Inline background/border keeps the app's global button styles out.
const DashboardTabs = ({ dashboards, activeId, onSelect, onNew, creating, disabled }) => (
  <div className="flex items-end gap-1 overflow-x-auto min-w-0" role="tablist" aria-label="Your dashboards">
    {dashboards.map((d) => {
      const active = d.id === activeId;
      return (
        <button
          key={d.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(d.id)}
          disabled={disabled}
          className={`shrink-0 max-w-[220px] truncate px-4 py-3 text-sm transition-colors ${
            active
              ? "font-semibold text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: `3px solid ${active ? "var(--main-color)" : "transparent"}`,
            borderRadius: 0,
            boxShadow: "none",
          }}
          title={d.title}
        >
          {d.title}
        </button>
      );
    })}

    <button
      type="button"
      onClick={onNew}
      disabled={creating || disabled}
      className="shrink-0 ml-1 mb-1.5 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[var(--main-color)] disabled:opacity-50"
      style={{ background: "transparent", border: "none", boxShadow: "none" }}
    >
      <TbPlus size={15} />
      {creating ? "Creating…" : "New dashboard"}
    </button>
  </div>
);

export default DashboardTabs;