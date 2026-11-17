import React from "react";

// Drag onto the canvas to place it, or click / press Enter to add it at the bottom
const WidgetTile = ({ item, onAdd, onDragStart, onDragEnd }) => {
  const Icon = item.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      unselectable="on"
      onDragStart={(e) => {
        // Firefox needs data set for the drag to start
        e.dataTransfer.setData("text/plain", item.type);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart(item.type);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onAdd(item.type)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd(item.type);
        }
      }}
      className="group flex items-start gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-grab active:cursor-grabbing hover:border-[var(--main-color)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--main-color)] transition-colors"
    >
      <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 group-hover:text-[var(--main-color)]">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
          {item.label}
        </span>
        <span className="block text-[11px] leading-snug text-gray-500 dark:text-gray-400">
          {item.description}
        </span>
      </span>
    </div>
  );
};

export default WidgetTile;
