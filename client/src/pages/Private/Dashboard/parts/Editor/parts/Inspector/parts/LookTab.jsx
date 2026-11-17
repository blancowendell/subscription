import React from "react";
import FloatingInput from "../../../../../../../../components/Forms/FloatingInput";
import FloatingTextArea from "../../../../../../../../components/Forms/FloatingTextArea";
import ColorPicker from "./Sections/ColorPicker";
import IconPicker from "./Sections/IconPicker";
import { SIZE_PRESETS, getActivePreset } from "../../../../../utils/widgetCatalog";

const LookTab = ({ widget, onUpdate, onUpdateSettings, onResize }) => {
  const settings = widget.settings || {};
  const activePreset = getActivePreset(widget);

  return (
    <div className="flex flex-col gap-5">
      {widget.type === "text" && (
        <FloatingTextArea
          id={`note-${widget.id}`}
          label="Note"
          value={widget.content || ""}
          onChange={(e) => onUpdate(widget.id, { content: e.target.value }, `${widget.id}:content`)}
          length={500}
          textarea
          rows={5}
        />
      )}

      {widget.type === "card" && (
        <FloatingInput
          id={`subtitle-${widget.id}`}
          label="Small text under the number"
          value={settings.subtitle || ""}
          onChange={(e) =>
            onUpdateSettings(widget.id, { subtitle: e.target.value }, `${widget.id}:subtitle`)
          }
          length={60}
        />
      )}

      <ColorPicker
        value={settings.color}
        onChange={(color) => onUpdateSettings(widget.id, { color })}
      />

      <IconPicker value={widget.icon} onChange={(icon) => onUpdate(widget.id, { icon })} />

      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Size</div>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZE_PRESETS.map((preset) => {
            const active = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={active}
                onClick={() => onResize(widget.id, preset.key)}
                className={`py-1.5 rounded-lg border text-[11px] transition-colors ${
                  active
                    ? "border-[var(--main-color)] text-[var(--main-color)] font-semibold"
                    : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          Or drag the bottom-right corner of the widget.
        </p>
      </div>
    </div>
  );
};

export default LookTab;