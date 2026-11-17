import React, { useState } from "react";
import WidgetTile from "./parts/WidgetTile";
import TemplateCard from "./parts/TemplateCard";
import { WIDGET_TYPES } from "../../../../utils/widgetCatalog";
import { TEMPLATES } from "../../../../utils/templates";

const TABS = [
  { key: "widgets", label: "Widgets" },
  { key: "templates", label: "Templates" },
];

const Library = ({ hasWidgets, onAdd, onDragStart, onDragEnd, onUseTemplate }) => {
  const [tab, setTab] = useState("widgets");

  return (
    <aside className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex gap-4 border-b border-gray-100 dark:border-slate-800 mb-3" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`pb-2 -mb-px text-sm border-b-2 transition-colors ${
                active
                  ? "font-semibold text-gray-900 dark:text-white border-[var(--main-color)]"
                  : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "widgets" ? (
        <>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
            Drag onto your dashboard, or click to add.
          </p>
          <div className="flex flex-col gap-2">
            {WIDGET_TYPES.map((item) => (
              <WidgetTile
                key={item.type}
                item={item}
                onAdd={onAdd}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
            Start from a ready-made layout, then pick the information for each widget.
          </p>
          <div className="flex flex-col gap-2">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.key}
                template={template}
                needsConfirm={hasWidgets}
                onUse={onUseTemplate}
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
};

export default Library;
