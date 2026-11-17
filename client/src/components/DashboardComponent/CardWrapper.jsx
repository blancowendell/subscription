import React from "react";

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-5 shadow-sm transition-all duration-300">
    {title && (
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-slate-100 tracking-tight">
        {title}
      </h3>
    )}
    <div className="w-full">
      {children}
    </div>
  </div>
);

export default Card;