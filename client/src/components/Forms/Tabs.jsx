import React, { useState, useEffect, useRef } from "react";

const Tabs = ({ tabs, defaultTab, onChange }) => {
  const initialTab = defaultTab || (tabs.length ? tabs[0].key : null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabRefs = useRef({});

  useEffect(() => {
    const current = tabRefs.current[activeTab];
    if (current) {
      setIndicatorStyle({
        width: current.offsetWidth,
        left: current.offsetLeft,
      });
    }
  }, [activeTab]);

  const handleTabClick = (key) => {
    setActiveTab(key);
    if (onChange) {
      onChange(key);
    }
  };

  const currentTab = tabs.find((tab) => tab.key === activeTab);

  return (
    <div className="w-full">
      {/* ===== TAB WRAPPER ===== */}
      <div className="relative px-4 transition-all duration-300 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 rounded-t-xl">
        {/* Sliding Indicator */}
        <span
          className="absolute bottom-0 h-[3px] transition-all duration-300 ease-in-out rounded-full"
          style={{
            ...indicatorStyle,
            backgroundColor: "var(--main-color)",
          }}
        />

        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                ref={(el) => (tabRefs.current[tab.key] = el)}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className="relative py-4 text-sm font-semibold transition-all duration-200"
                style={{
                  color: isActive ? "var(--main-color)" : "var(--menu-text)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--main-hover-color)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--menu-text)";
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {tab.icon && <span className="text-base">{tab.icon}</span>}
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <div className="p-6 transition-all duration-300 bg-white dark:bg-slate-900 shadow-sm border border-t-0 border-gray-200 dark:border-slate-700 rounded-b-xl text-gray-800 dark:text-gray-200">
        {currentTab?.content}
      </div>
    </div>
  );
};

export default Tabs;