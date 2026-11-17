import React, { useState } from "react";

const TabularTabs = ({ tabs, defaultKey = "" }) => {
  const [activeKey, setActiveKey] = useState(defaultKey || tabs[0]?.key);

  return (
    <div className="w-full">
      {/* Optional: Small inline style for smooth content transition 
        If you already have animations in your tailwind.config, you can remove this.
      */}
      <style>{`
        @keyframes tabFadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tab-content { animation: tabFadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Tab Header List */}
      <div
        role="tablist"
        className="flex space-x-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto custom-scrollbar"
      >
        {tabs.map(({ key, label, icon, count, description }) => {
          const isActive = activeKey === key;

          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveKey(key)}
              title={description || label} // Shows informative tooltip on hover
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-300 outline-none rounded-t-xl group
                ${
                  isActive
                    ? "bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-slate-800/50"
                }
              `}
              style={{
                // Keeps your custom color dynamic
                color: isActive ? "var(--main-color)" : "",
                borderBottom: isActive
                  ? "3px solid var(--main-color)"
                  : "3px solid transparent",
              }}
            >
              {/* Icon with subtle scale animation on hover/active */}
              {icon && (
                <span
                  className={`transition-transform duration-300 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {icon}
                </span>
              )}
              
              <span>{label}</span>

              {/* Informative Badge / Count (Optional) */}
              {count !== undefined && (
                <span
                  className={`ml-1.5 px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                    isActive
                      ? "border-[var(--main-color)] text-[var(--main-color)] bg-[var(--main-color)]/10"
                      : "border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="mt-5">
        {tabs.map(
          ({ key, content }) =>
            activeKey === key && (
              <div
                key={key}
                role="tabpanel"
                className="animate-tab-content"
              >
                {content}
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default TabularTabs;