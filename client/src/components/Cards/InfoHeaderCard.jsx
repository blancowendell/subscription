import React from "react";

const InfoHeaderCard = ({
  label,
  value,
  description,
  status,
  icon: Icon, // Added icon support
  trend, // Optional: e.g., "up", "down"
}) => {
  return (
    <div
      className="rounded-2xl p-5 flex justify-between items-start transition-all duration-300 hover:shadow-md hover:-translate-y-1 group"
      style={{
        // Using a gradient for a more modern, depth-filled look
        background:
          "linear-gradient(135deg, rgba(228, 42, 36, 0.08) 0%, rgba(228, 42, 36, 0.03) 100%)",
        border: "1px solid rgba(228, 42, 36, 0.2)",
        backdropFilter: "blur(10px)", // Modern glassmorphism effect
      }}
    >
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 mb-1">
          {Icon && (
            <div
              className="p-1.5 rounded-lg transition-colors group-hover:bg-white/20"
              style={{ color: "var(--main-color)" }}
            >
              <Icon size={18} />
            </div>
          )}
          <p
            className="text-[10px] uppercase tracking-[0.1em] font-black opacity-70"
            style={{ color: "var(--main-color)" }}
          >
            {label}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <h3
            className="text-2xl font-black tracking-tight"
            style={{ color: "var(--main-color)" }}
          >
            {value || "—"}
          </h3>

          {trend && (
            <span
              className={`text-[10px] font-bold ${trend === "up" ? "text-green-500" : "text-red-500"}`}
            >
              {trend === "up" ? "▲" : "▼"}
            </span>
          )}
        </div>

        {description && (
          <p
            className="text-[11px] leading-relaxed font-medium opacity-80"
            style={{ color: "var(--main-color)" }}
          >
            {description}
          </p>
        )}
      </div>

      {status && (
        <div className="flex flex-col items-end gap-2">
          <span
            className="text-[10px] px-3 py-1 rounded-full font-bold shadow-sm uppercase tracking-wider"
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--main-text-color)",
            }}
          >
            {status}
          </span>
          {/* Subtle indicator dot */}
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{
                  backgroundColor:
                    i === 1 ? "var(--main-color)" : "rgba(0,0,0,0.1)",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoHeaderCard;
