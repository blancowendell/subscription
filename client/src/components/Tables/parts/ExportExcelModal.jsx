import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import InfoCircleOutlined from "@ant-design/icons/InfoCircleOutlined";
import CheckOutlined from "@ant-design/icons/CheckOutlined";
import CloseCircleFilled from "@ant-design/icons/CloseCircleFilled";
import FileExcelOutlined from "@ant-design/icons/FileExcelOutlined";
import SearchOutlined from "@ant-design/icons/SearchOutlined";

const toLocalISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const DATE_PRESETS = [
  {
    label: "Today",
    range: () => {
      const today = toLocalISODate(new Date());
      return [today, today];
    },
  },
  {
    label: "Last 7 days",
    range: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      return [toLocalISODate(start), toLocalISODate(end)];
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      return [toLocalISODate(start), toLocalISODate(end)];
    },
  },
  {
    label: "This month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return [toLocalISODate(start), toLocalISODate(now)];
    },
  },
  {
    label: "This year",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return [toLocalISODate(start), toLocalISODate(now)];
    },
  },
];

const StepBadge = ({ n, done, active }) => (
  <span
    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 ${
      done
        ? "bg-green-600 text-white"
        : active
          ? "bg-red-600 text-white"
          : "bg-gray-200 text-gray-500"
    }`}
  >
    {done ? <CheckOutlined style={{ fontSize: 10 }} /> : n}
  </span>
);

const inputClass =
  "w-full px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-500/20 transition-colors";

const ExportExcelModal = ({
  open,
  onClose,
  columns = [],
  isLoadingColumns = false,
  isExporting = false,
  searchTerm = "",
  serverError = "",
  onConfirm,
}) => {
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [columnFilter, setColumnFilter] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");

  const columnsSignature = columns.map((c) => c.key).join("|");

  const dateColumns = useMemo(
    () => columns.filter((c) => c.type === "date"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnsSignature],
  );

  const visibleColumns = useMemo(() => {
    const term = columnFilter.trim().toLowerCase();
    if (!term) return columns;
    return columns.filter((c) => c.label.toLowerCase().includes(term));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsSignature, columnFilter]);

  // Reset state each time the modal opens or the column list changes
  useEffect(() => {
    if (!open) return;
    setSelectedKeys(columns.map((c) => c.key));
    setColumnFilter("");
    setDateColumn("");
    setDateFrom("");
    setDateTo("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, columnsSignature]);

  const hasColumns = selectedKeys.length > 0;
  const hasDateFilter = !!dateColumn;
  const hasDateValues = !!dateFrom || !!dateTo;
  const canExport =
    hasColumns &&
    !isExporting &&
    !isLoadingColumns &&
    columns.length > 0 &&
    (!hasDateFilter || hasDateValues);

  const allVisibleSelected =
    visibleColumns.length > 0 &&
    visibleColumns.every((c) => selectedKeys.includes(c.key));

  const handleClose = () => {
    if (isExporting) return;
    onClose();
  };

  const toggleColumn = (key) => {
    setError("");
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleAllVisible = () => {
    setError("");
    const visibleKeys = visibleColumns.map((c) => c.key);
    if (allVisibleSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !visibleKeys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  const applyPreset = (preset) => {
    const [from, to] = preset.range();
    setDateFrom(from);
    setDateTo(to);
    setError("");
  };

  const isPresetActive = (preset) => {
    const [from, to] = preset.range();
    return dateFrom === from && dateTo === to;
  };

  const handleDateColumnChange = (value) => {
    setDateColumn(value);
    setError("");
    if (!value) {
      setDateFrom("");
      setDateTo("");
    }
  };

  const handleConfirm = () => {
    const orderedSelection = columns
      .filter((c) => selectedKeys.includes(c.key))
      .map((c) => c.key);

    if (orderedSelection.length === 0) {
      setError("Please select at least one column.");
      return;
    }

    if (dateColumn) {
      if (!dateFrom && !dateTo) {
        setError("Please pick a From date, a To date, or both.");
        return;
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        setError("From date cannot be after To date.");
        return;
      }
    }

    setError("");
    onConfirm({
      columns: orderedSelection,
      dateColumn: dateColumn || null,
      dateFrom: dateColumn ? dateFrom || null : null,
      dateTo: dateColumn ? dateTo || null : null,
    });
  };

  const stepCardClass = (active) =>
    `rounded-xl p-4 flex flex-col gap-3 border transition-colors ${
      active
        ? "border-red-300 bg-red-50/40 dark:bg-red-500/5"
        : "border-gray-200 dark:border-slate-700"
    }`;

  const displayedError = error || serverError;

  const footerHint = !hasColumns
    ? "Select at least one column in Step 1 to enable export."
    : hasDateFilter && !hasDateValues
      ? "Pick a From or To date in Step 2, or remove the date filter."
      : null;

  return (
    <Modal
      title={
        <span className="dark:text-white font-semibold">Export to Excel</span>
      }
      open={open}
      onCancel={handleClose}
      centered
      maskClosable={false}
      keyboard={!isExporting}
      closable={!isExporting}
      footer={null}
      width={720}
      getContainer={() => document.body}
      styles={{
        content: {
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
        },
        header: {
          backgroundColor: "transparent",
          marginBottom: "20px",
        },
        body: {
          backgroundColor: "transparent",
        },
      }}
      className="dark:bg-slate-900 rounded-xl overflow-hidden"
    >
      <div className="dark:text-gray-300 flex flex-col gap-4 py-2">
        {/* Step 1 — Columns */}
        <div className={stepCardClass(!hasDateFilter)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StepBadge n={1} done={hasColumns} active={!hasColumns} />
              <span className="text-sm font-semibold">
                Choose the columns to include
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {selectedKeys.length} of {columns.length} selected
            </span>
          </div>

          {isLoadingColumns ? (
            <div className="py-8 flex flex-col items-center gap-3 text-[13px] text-gray-500">
              <span className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              Loading columns...
            </div>
          ) : columns.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-gray-500">
              No columns available.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={columnFilter}
                    onChange={(e) => setColumnFilter(e.target.value)}
                    placeholder="Find a column..."
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  disabled={visibleColumns.length === 0}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {allVisibleSelected ? "Clear" : "Select all"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {visibleColumns.map((col) => {
                  const checked = selectedKeys.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer select-none transition-colors ${
                        checked
                          ? "border-red-300 bg-white dark:bg-slate-800"
                          : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 cursor-pointer accent-red-600"
                      />
                      <span
                        className={`text-sm ${
                          checked ? "font-medium" : "text-gray-500"
                        }`}
                      >
                        {col.label}
                      </span>
                      {col.type === "date" && (
                        <span className="ml-auto text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          date
                        </span>
                      )}
                    </label>
                  );
                })}
                {visibleColumns.length === 0 && (
                  <div className="col-span-full py-4 text-center text-[13px] text-gray-500">
                    No column matches "{columnFilter}".
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Step 2 — Date range */}
        <div className={stepCardClass(hasDateFilter)}>
          <div className="flex items-center gap-2">
            <StepBadge
              n={2}
              done={hasDateFilter && hasDateValues}
              active={hasDateFilter && !hasDateValues}
            />
            <span className="text-sm font-semibold">
              Filter by date range{" "}
              <span className="font-normal text-gray-500">(optional)</span>
            </span>
          </div>

          {dateColumns.length === 0 ? (
            <p className="text-[13px] text-gray-500 m-0">
              This table has no date columns to filter by.
            </p>
          ) : (
            <>
              <div className="flex gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[13px] px-3 py-2">
                <InfoCircleOutlined className="mt-0.5 shrink-0" />
                <span>
                  Pick which date to filter on, then set the range. Leave it on
                  "No date filter" to export every record.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Date column
                </label>
                <select
                  value={dateColumn}
                  onChange={(e) => handleDateColumnChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No date filter (export all dates)</option>
                  {dateColumns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasDateFilter && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                        From
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setError("");
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                        To
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setError("");
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map((preset) => {
                      const active = isPresetActive(preset);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            active
                              ? "bg-red-600 border-red-600 text-white"
                              : "border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {searchTerm && (
          <p className="text-[13px] text-gray-500 m-0">
            Current search filter will also apply:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              "{searchTerm}"
            </span>
          </p>
        )}

        {displayedError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-[13px] px-3 py-2">
            {displayedError}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-2">
          <div className="flex justify-between items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-md flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm disabled:opacity-50"
            >
              <CloseCircleFilled /> Cancel
            </button>

            <button
              type="button"
              disabled={!canExport}
              onClick={() => canExport && handleConfirm()}
              className="px-5 py-2 rounded-md flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileExcelOutlined />
              )}
              {isExporting ? "Exporting..." : "Export to Excel"}
            </button>
          </div>

          {footerHint && (
            <p className="text-xs text-gray-500 text-right m-0">{footerHint}</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExportExcelModal;