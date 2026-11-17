import React from "react";
import { TbPlus, TbX } from "react-icons/tb";

const MAX_COLUMNS = 8;
const MAX_ROWS = 50;

const cellClass =
  "w-full min-w-[80px] px-2 py-1 text-xs rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[var(--main-color)]";

// Type-your-own table: headers + rows, saved as tableColumns / tableData
const StaticTableEditor = ({ columns, rows, onChange }) => {
  const safeColumns = columns.length ? columns : ["Column 1"];
  const safeRows = rows.map((row) => safeColumns.map((_, i) => (Array.isArray(row) ? row[i] ?? "" : "")));

  const setHeader = (index, text) =>
    onChange(safeColumns.map((c, i) => (i === index ? text : c)), safeRows, "header");

  const setCell = (rowIndex, colIndex, text) =>
    onChange(
      safeColumns,
      safeRows.map((row, r) => (r === rowIndex ? row.map((c, i) => (i === colIndex ? text : c)) : row)),
      "cell"
    );

  const addColumn = () =>
    onChange([...safeColumns, `Column ${safeColumns.length + 1}`], safeRows.map((row) => [...row, ""]));

  const removeColumn = (index) =>
    onChange(
      safeColumns.filter((_, i) => i !== index),
      safeRows.map((row) => row.filter((_, i) => i !== index))
    );

  const addRow = () => onChange(safeColumns, [...safeRows, safeColumns.map(() => "")]);

  const removeRow = (index) => onChange(safeColumns, safeRows.filter((_, i) => i !== index));

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              {safeColumns.map((column, i) => (
                <th key={i} className="align-top">
                  <div className="flex items-center gap-0.5">
                    <input
                      value={column}
                      onChange={(e) => setHeader(i, e.target.value)}
                      aria-label={`Column ${i + 1} name`}
                      className={`${cellClass} font-semibold`}
                    />
                    {safeColumns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(i)}
                        aria-label={`Remove column ${column}`}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TbX size={13} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      aria-label={`Row ${r + 1}, ${safeColumns[c]}`}
                      className={cellClass}
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    aria-label={`Remove row ${r + 1}`}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <TbX size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 mt-1">
        <button
          type="button"
          onClick={addRow}
          disabled={safeRows.length >= MAX_ROWS}
          className="flex items-center gap-1 text-xs font-medium text-[var(--main-color)] disabled:opacity-40"
        >
          <TbPlus size={13} /> Add row
        </button>
        <button
          type="button"
          onClick={addColumn}
          disabled={safeColumns.length >= MAX_COLUMNS}
          className="flex items-center gap-1 text-xs font-medium text-[var(--main-color)] disabled:opacity-40"
        >
          <TbPlus size={13} /> Add column
        </button>
      </div>
    </div>
  );
};

export default StaticTableEditor;
