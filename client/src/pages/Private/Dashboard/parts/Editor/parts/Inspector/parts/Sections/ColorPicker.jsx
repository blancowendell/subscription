import React from "react";
import { TbCheck } from "react-icons/tb";
import { COLORS } from "../../../../../../utils/widgetCatalog";

const ColorPicker = ({ value, onChange }) => (
  <div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Color</div>
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
      {COLORS.map((color) => {
        const active = (value || "blue") === color.key;
        return (
          <button
            key={color.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.key)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--main-color)]"
            style={{
              background: color.main,
              boxShadow: active ? `0 0 0 2px #fff, 0 0 0 4px ${color.main}` : undefined,
            }}
          >
            {active && <TbCheck size={14} />}
          </button>
        );
      })}
    </div>
  </div>
);

export default ColorPicker;
