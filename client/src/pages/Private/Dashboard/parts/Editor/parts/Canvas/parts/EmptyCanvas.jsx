import React from "react";
import { TbDragDrop } from "react-icons/tb";
import { TEMPLATES } from "../../../../../utils/templates";

// Sits over the empty grid; only the buttons take clicks so drops still land
const EmptyCanvas = ({ onUseTemplate }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
    <div className="text-center max-w-md">
      <TbDragDrop size={34} className="mx-auto text-gray-400" />
      <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
        Start your dashboard
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Drag a widget from the left and drop it here, or start from a template.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 pointer-events-auto">
        {TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => onUseTemplate(template.key)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 hover:border-[var(--main-color)]"
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default EmptyCanvas;
