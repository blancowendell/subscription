import React from "react";
import { Tooltip } from "@mui/material";
import { TbCopy, TbTrash } from "react-icons/tb";
import { SIZE_PRESETS, getActivePreset } from "../../../../../utils/widgetCatalog";

const idleStyle = { background: "transparent", color: "#6b7280", border: "none", boxShadow: "none" };
const activeStyle = {
  background: "var(--main-color)",
  color: "var(--main-text-color)",
  border: "none",
  boxShadow: "none",
};

// widget-no-drag keeps clicks here from starting a drag
const SelectionToolbar = ({ widget, onResize, onDuplicate, onRemove }) => {
  const active = getActivePreset(widget);

  return (
    <div
      className="widget-no-drag absolute top-2 right-2 z-10 flex items-center gap-0.5 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm cursor-default"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {SIZE_PRESETS.map((preset) => (
        <Tooltip key={preset.key} title={preset.label}>
          <button
            type="button"
            onClick={() => onResize(widget.id, preset.key)}
            aria-pressed={active === preset.key}
            className="px-1.5 py-0.5 rounded text-[11px] font-semibold leading-4 hover:opacity-80"
            style={active === preset.key ? activeStyle : idleStyle}
          >
            {preset.key === "FULL" ? "Full" : preset.key}
          </button>
        </Tooltip>
      ))}

      <span className="w-px h-4 mx-0.5 bg-gray-200 dark:bg-slate-700" />

      <Tooltip title="Duplicate (Ctrl+D)">
        <button
          type="button"
          onClick={() => onDuplicate(widget.id)}
          aria-label="Duplicate"
          className="p-1 rounded hover:opacity-70"
          style={idleStyle}
        >
          <TbCopy size={15} />
        </button>
      </Tooltip>
      <Tooltip title="Remove (Delete)">
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          aria-label="Remove"
          className="p-1 rounded hover:opacity-70"
          style={{ ...idleStyle, color: "#dc2626" }}
        >
          <TbTrash size={15} />
        </button>
      </Tooltip>
    </div>
  );
};

export default SelectionToolbar;
