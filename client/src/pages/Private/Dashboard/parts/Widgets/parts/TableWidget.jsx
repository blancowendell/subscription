import React from "react";
import WidgetCard from "./WidgetCard";
import { formatValue } from "../../../utils/formatters";

const MAX_ROWS = 100;
const MAX_COLUMNS = 12;

const TableWidget = ({ widget, rows, fields, settings, color, icon }) => {
  const chosen = Array.isArray(settings.columns)
    ? settings.columns.map((name) => fields.find((f) => f.name === name)).filter(Boolean)
    : [];
  const columns = (chosen.length ? chosen : fields).slice(0, MAX_COLUMNS);
  const visible = rows.slice(0, MAX_ROWS);

  return (
    <WidgetCard title={widget.title} icon={icon} color={color}>
      <div className="h-full flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-gray-100 dark:border-slate-800">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className={`sticky top-0 z-[1] px-3 py-2 font-semibold whitespace-nowrap bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 ${
                      col.kind === "number" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                >
                  {columns.map((col) => (
                    <td
                      key={col.name}
                      className={`px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200 ${
                        col.kind === "number" ? "text-right tabular-nums" : "text-left"
                      }`}
                    >
                      {col.kind === "number"
                        ? formatValue(row?.[col.name], settings.format || "number")
                        : String(row?.[col.name] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > MAX_ROWS && (
          <div className="pt-2 text-[11px] text-gray-400">
            Showing {MAX_ROWS} of {rows.length.toLocaleString()} rows
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default TableWidget;
