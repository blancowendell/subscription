import React from "react";

const FooterStat = ({ label, value }) => {
  return (
    <div className="text-right flex flex-col gap-0.5">
      <p 
        className="text-[9px] font-bold uppercase tracking-widest opacity-80"
        style={{ color: "var(--main-text-color)" }}
      >
        {label}
      </p>
      <p 
        className="text-sm font-bold"
        style={{ color: "var(--main-text-color)" }}
      >
        {value}
      </p>
    </div>
  );
};

export default FooterStat;