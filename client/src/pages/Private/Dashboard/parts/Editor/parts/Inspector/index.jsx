import React, { useEffect, useState } from "react";
import { Button } from "@mui/material";
import FloatingInput from "../../../../../../../components/Forms/FloatingInput";
import { TbPointer } from "react-icons/tb";
import { FaCopy, FaTrash } from "react-icons/fa";
import { btnDanger, btnSecondary } from "../../../../utils/buttonStyles";
import DataTab from "./parts/DataTab";
import LookTab from "./parts/LookTab";
import { getWidgetType } from "../../../../utils/widgetCatalog";


const TIPS = [
  "Drag a widget to move it. Others make room.",
  "Drag the bottom-right corner to resize, or use Small, Medium, Large or Full.",
  "Delete removes the selected widget. Ctrl+Z undoes it.",
  "Preview shows exactly what you'll see after saving.",
];

const panelClass =
  "rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4";

const Inspector = ({ widget, onUpdate, onUpdateSettings, onResize, onDuplicate, onRemove }) => {
  const [tab, setTab] = useState("data");
  const widgetId = widget?.id;
  const widgetType = widget?.type;

  useEffect(() => {
    setTab(widgetType === "text" ? "look" : "data");
  }, [widgetId, widgetType]);

  if (!widget) {
    return (
      <aside className={panelClass}>
        <TbPointer size={24} className="text-gray-400" />
        <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          Select a widget
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click any widget to change its information and look.
        </p>
        <ul className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400 list-disc pl-4">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </aside>
    );
  }

  const meta = getWidgetType(widget.type);
  const TypeIcon = meta?.icon;
  const tabs =
    widget.type === "text"
      ? [{ key: "look", label: "Look" }]
      : [
          { key: "data", label: "Data" },
          { key: "look", label: "Look" },
        ];

  return (
    <aside className={`${panelClass} flex flex-col gap-5`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {TypeIcon && <TypeIcon size={16} />}
        {meta?.label || widget.type}
      </div>

      <FloatingInput
        id={`title-${widget.id}`}
        label="Title"
        value={widget.title || ""}
        onChange={(e) => onUpdate(widget.id, { title: e.target.value }, `${widget.id}:title`)}
        length={100}
      />

      {tabs.length > 1 && (
        <div className="flex gap-4 border-b border-gray-100 dark:border-slate-800" role="tablist">
          {tabs.map((t) => {
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
      )}

      {tab === "data" && widget.type !== "text" ? (
        <DataTab widget={widget} onUpdate={onUpdate} onUpdateSettings={onUpdateSettings} />
      ) : (
        <LookTab
          widget={widget}
          onUpdate={onUpdate}
          onUpdateSettings={onUpdateSettings}
          onResize={onResize}
        />
      )}

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-800 flex justify-between gap-3">
        <button type="button" onClick={() => onDuplicate(widget.id)} className={btnSecondary}>
          <FaCopy /> Duplicate
        </button>
        <button type="button" onClick={() => onRemove(widget.id)} className={btnDanger}>
          <FaTrash /> Remove
        </button>
      </div>
    </aside>
  );
};

export default Inspector;