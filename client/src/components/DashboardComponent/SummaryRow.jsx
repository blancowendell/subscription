import React from "react";

const SummaryRow = ({
  label,
  value,
  subLabel,
  percentage,
  trend,

  /* =========================
     CURRENCY OPTIONS
     ========================= */
  isPeso = false,          // backward compatibility
  isCurrency = false,      // explicit opt-in
  currencySymbol = "₱",
}) => {
  /* =========================
     NUMBER FORMATTER
     ========================= */
  const formatCurrency = (val) => {
    const number = Number(val);
    if (Number.isNaN(number)) return val;

    return `${currencySymbol}${new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number)}`;
  };

  const formattedValue =
    isCurrency || isPeso
      ? formatCurrency(value)
      : value;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <div>
          <p className="text-gray-600 font-medium">{label}</p>
          {subLabel && (
            <p className="text-xs text-gray-400">{subLabel}</p>
          )}
        </div>

        <div className="text-right">
          <p className="font-semibold">{formattedValue}</p>

          {trend && percentage !== undefined && (
            <p
              className={`text-xs font-medium ${
                trend === "up"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {trend === "up" ? "▲" : "▼"} {percentage}%
            </p>
          )}
        </div>
      </div>

      {percentage !== undefined && (
        <div className="w-full bg-gray-100 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${
              trend === "down"
                ? "bg-red-500"
                : "bg-green-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SummaryRow;
