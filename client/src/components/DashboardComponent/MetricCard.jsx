import React from "react";

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  isPeso = false,
  isCurrency = false,
  currencySymbol = "₱",
  accentColor = "var(--main-color)",
  delta = null,
}) => {
  const shouldFormatAsCurrency = isCurrency || isPeso;

  const formattedValue =
    value !== null && value !== undefined
      ? shouldFormatAsCurrency
        ? `${currencySymbol}${Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : Number(value).toLocaleString()
      : "--";

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between overflow-hidden shadow-sm transition-all duration-300">
      {/* 🔹 LEFT CONTENT */}
      <div className="z-10">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </p>
        <p className="text-2xl font-black mt-1 text-gray-800 dark:text-white tracking-tighter">
          {formattedValue}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* 🔹 ICON */}
      {Icon && (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
          }}
        >
          <Icon size={24} />
        </div>
      )}

      {/* 🔹 DELTA ANIMATION */}
      {delta !== null && delta > 0 && (
        <div className="absolute top-3 right-3 text-green-600 dark:text-green-400 font-bold text-xs animate-metric-delta pointer-events-none">
          +{shouldFormatAsCurrency
            ? `${currencySymbol}${Number(delta).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : Number(delta).toLocaleString()}
        </div>
      )}
      
      {/* Subtle Background Accent for Dark Mode depth */}
      <div 
        className="absolute -right-2 -bottom-2 w-16 h-16 opacity-[0.03] dark:opacity-[0.05] rounded-full"
        style={{ backgroundColor: accentColor }}
      ></div>
    </div>
  );
};

export default MetricCard;