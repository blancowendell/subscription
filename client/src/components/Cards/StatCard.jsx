import React from "react";

const StatCard = ({ icon: Icon, label, value, iconColorClass = "text-blue-500", badge = false }) => {
  return (
    <div 
      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "rgba(128,128,128,0.1)" }}
      className="p-4 rounded-2xl border flex items-center gap-4 transition-all hover:shadow-md"
    >
      {/* Icon Wrapper - adapts background for dark mode */}
      <div className={`p-3 rounded-xl shadow-sm bg-white dark:bg-white/5 ${iconColorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="overflow-hidden">
        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 truncate tracking-wider">
          {label}
        </p>
        
        {badge ? (
          <div className="mt-0.5">
            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-black uppercase inline-block">
              {value}
            </span>
          </div>
        ) : (
          <p style={{ color: "var(--text-base)" }} className="font-bold text-sm truncate">
            {value}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;