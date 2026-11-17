import React from "react";

const DataField = ({ label, value, icon: Icon }) => {
  return (
    <div className="flex items-start gap-3 p-1">
      {Icon && (
        <div 
          className="mt-1 p-1.5 rounded-lg opacity-80"
          style={{ 
            backgroundColor: "var(--main-color)", 
            color: "var(--main-text-color)",
            filter: "brightness(1.1)"
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <p 
          className="text-[9px] font-bold uppercase tracking-widest opacity-50"
          style={{ color: "var(--menu-text)" }}
        >
          {label}
        </p>
        <p 
          className="text-[13px] font-bold transition-colors duration-200"
          style={{ color: "var(--text-base)" }}
        >
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
};

export default DataField;