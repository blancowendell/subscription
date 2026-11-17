import React from "react";
import { TbBan } from "react-icons/tb";
import { ICON_OPTIONS } from "../../../../../../utils/widgetCatalog";

const IconPicker = ({ value, onChange }) => {
  const options = [{ key: "", label: "No icon", icon: TbBan }, ...ICON_OPTIONS];

  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Icon</div>
      <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Icon">
        {options.map((option) => {
          const Icon = option.icon;
          const active = (value || "") === option.key;
          return (
            <button
              key={option.key || "none"}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(option.key)}
              className={`aspect-square flex items-center justify-center rounded-lg border transition-colors ${
                active
                  ? "border-[var(--main-color)] text-[var(--main-color)]"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IconPicker;
