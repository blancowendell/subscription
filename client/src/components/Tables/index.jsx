import React, { useState, useMemo, useEffect, useRef } from "react";
import noDataAnimation from "../../assets/animations/no-data.json";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import excelIcon from "../../assets/images/xlsx.png";
import pdfIcon from "../../assets/images/pdf.png";
import ActionDropdown from "./parts/DropdownActions.jsx";
import TablePagination from "./parts/TablePagination.jsx";
import TableContent from "./parts/TableContent.jsx";
import SearchForm from "./parts/SearchForm.jsx";
import ExportExcelModal from "./parts/ExportExcelModal.jsx";

const EMPTY_ARRAY = [];

const toDateKey = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const Table = ({
  headers,
  keys,
  data,
  isLoading = false,
  rowsPerPage = 10,
  serverSide = false,
  serverTotalPages = 1,
  withImage = false,
  withEdit = false,
  withView = false,
  withDelete = false,
  withActions = true,
  dropdownItems = [],
  onItemClick,
  onEditClick,
  onViewClick,
  onDeleteClick,
  onRowClick,
  customActionsRenderer,
  headerExtra,
  footerSummary,
  currentPage: controlledPage,
  onPageChange: onExternalPageChange,
  onExternalSearch,
  // ===== Export options =====
  // async ({ columns, dateColumn, dateFrom, dateTo, search }) => void
  // If omitted, export runs client-side on the loaded data.
  onExportExcel,
  // Static list: [{ key, label, type: "text" | "date" }]
  exportColumns,
  // Async loader returning the same shape; called on first modal open.
  fetchExportColumns,
  // Client-side only: which keys should be treated as dates.
  exportDateKeys = EMPTY_ARRAY,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(controlledPage || 1);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportError, setExportError] = useState("");
  const [remoteExportColumns, setRemoteExportColumns] = useState(null);
  const [isLoadingExportColumns, setIsLoadingExportColumns] = useState(false);

  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (controlledPage !== undefined) setCurrentPage(controlledPage);
  }, [controlledPage]);

  const handlePageChange = (page) => {
    if (onExternalPageChange) onExternalPageChange(page);
    setCurrentPage(page);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (serverSide && onExternalSearch) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        onExternalSearch(val);
        setCurrentPage(1);
      }, 500);
    } else if (!serverSide) {
      setCurrentPage(1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serverSide && onExternalSearch) {
      onExternalSearch(searchTerm);
      setCurrentPage(1);
    }
  };

  const filteredData = useMemo(() => {
    if (serverSide) return data;

    return data.filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm, serverSide]);

  const totalPages = serverSide
    ? serverTotalPages
    : Math.ceil(filteredData.length / rowsPerPage);

  const paginatedData = serverSide
    ? data
    : filteredData.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
      );

  // ===== Export columns =====
  const derivedExportColumns = useMemo(
    () =>
      headers
        .map((label, idx) => ({
          key: keys[idx],
          label,
          type: exportDateKeys.includes(keys[idx]) ? "date" : "text",
        }))
        .filter((c) => c.key !== "actions"),
    [headers, keys, exportDateKeys],
  );

  const resolvedExportColumns =
    exportColumns ||
    remoteExportColumns ||
    (fetchExportColumns ? EMPTY_ARRAY : derivedExportColumns);

  const loadRemoteExportColumns = async () => {
    setIsLoadingExportColumns(true);
    try {
      const cols = await fetchExportColumns();
      setRemoteExportColumns(Array.isArray(cols) ? cols : []);
    } catch (err) {
      console.error("Failed to load export columns:", err);
      setRemoteExportColumns(null);
      setExportError("Failed to load columns. Close and try again.");
    } finally {
      setIsLoadingExportColumns(false);
    }
  };

  const openExportModal = () => {
    setExportError("");
    setIsExportModalOpen(true);
    if (!exportColumns && fetchExportColumns && remoteExportColumns === null) {
      loadRemoteExportColumns();
    }
  };

  const closeExportModal = () => {
    if (isExportingExcel) return;
    setIsExportModalOpen(false);
    setExportError("");
  };

  // ===== Client-side export (fallback when no onExportExcel) =====
  const exportExcelClientSide = async ({
    columns,
    dateColumn,
    dateFrom,
    dateTo,
  }) => {
    const getCSSVariable = (name) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const hexToARGB = (hex) => {
      hex = hex.replace("#", "");
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((h) => h + h)
          .join("");
      }
      return `FF${hex.toUpperCase()}`;
    };

    const selectedColumns = resolvedExportColumns.filter((c) =>
      columns.includes(c.key),
    );

    let rows = filteredData;
    if (dateColumn) {
      rows = rows.filter((item) => {
        const key = toDateKey(item[dateColumn]);
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
        return true;
      });
    }

    if (rows.length === 0) {
      throw new Error("No records found for the selected filters.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Exported Data");

    const mainColor = getCSSVariable("--main-color") || "#4F81BD";
    const textColor = getCSSVariable("--main-text-color") || "#FFFFFF";

    const headerRow = worksheet.addRow(
      selectedColumns.map((c) => c.label.toUpperCase()),
    );
    headerRow.height = 25;

    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: hexToARGB(textColor) } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: hexToARGB(mainColor) },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      worksheet.getColumn(colNumber).width = 22;
    });

    rows.forEach((item) => {
      const dataRow = worksheet.addRow(
        selectedColumns.map((c) =>
          item[c.key] !== undefined && item[c.key] !== null ? item[c.key] : "",
        ),
      );

      dataRow.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Table_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleConfirmExport = async (options) => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    setExportError("");
    try {
      if (onExportExcel) {
        await onExportExcel({ ...options, search: searchTerm });
      } else {
        await exportExcelClientSide(options);
      }
      setIsExportModalOpen(false);
    } catch (err) {
      console.error("Excel export failed:", err);
      setExportError(err?.message || "Export failed.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Exported Table", 14, 10);

    doc.autoTable({
      head: [Object.keys(data[0] || {})],
      body: data.map((row) => Object.values(row)),
    });

    doc.save("data.pdf");
  };

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 70%, 80%)`;
  };

  const getContrastColor = (hsl) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.color = hsl;
    document.body.appendChild(tempDiv);
    const rgb = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    const [r, g, b] = rgb.match(/\d+/g).map(Number).slice(0, 3);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "text-black" : "text-white";
  };

  const renderAvatar = (name = "", image) => {
    if (image) {
      return <img src={image} alt={name} className="w-10 h-10 rounded-full" />;
    }

    const nameParts = name.trim().split(" ");
    const initials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
        : nameParts[0]?.[0] || "?";

    const bgColor = stringToColor(name);
    const textColor = getContrastColor(bgColor);

    return (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${textColor}`}
        style={{ backgroundColor: bgColor }}
      >
        {initials.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 py-10 rounded-xl shadow-md border border-[rgba(0,0,0,0.1)] dark:border-slate-800 h-[800px] flex flex-col transition-colors duration-300">
      <div className="mb-4 flex justify-between items-center w-full">
        <div className="flex space-x-2 me-4">
          <button
            onClick={openExportModal}
            disabled={isExportingExcel}
            title="Export to Excel"
            className={`p-3 rounded-lg border border-[rgba(0,0,0,0.1)] bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:border-green-800 dark:hover:bg-green-900/50 transition-colors ${
              isExportingExcel ? "opacity-50 cursor-wait" : ""
            }`}
          >
            <img src={excelIcon} alt="Export to Excel" className="w-5 h-5" />
          </button>

          <button
            onClick={handleExportPDF}
            title="Export to PDF"
            className="p-3 rounded-lg border border-[rgba(0,0,0,0.1)] bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:border-red-800 dark:hover:bg-red-900/50 transition-colors"
          >
            <img src={pdfIcon} alt="Export to PDF" className="w-5 h-5" />
          </button>

          {withActions && (
            <ActionDropdown items={dropdownItems} onItemClick={onItemClick} />
          )}
        </div>

        <div className="flex items-center gap-3">
          {headerExtra && <div className="dark:text-white">{headerExtra}</div>}{" "}
          <SearchForm
            searchTerm={searchTerm}
            handleSearch={handleSearch}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>

      <TableContent
        headers={headers}
        keys={keys}
        paginatedData={paginatedData}
        isLoading={isLoading}
        onRowClick={onRowClick}
        onEditClick={onEditClick}
        onViewClick={onViewClick}
        onDeleteClick={onDeleteClick}
        withEdit={withEdit}
        withView={withView}
        withDelete={withDelete}
        withImage={withImage}
        renderAvatar={renderAvatar}
        noDataAnimation={noDataAnimation}
        customActionsRenderer={customActionsRenderer}
      />

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        footerSummary={footerSummary}
      />

      <ExportExcelModal
        open={isExportModalOpen}
        onClose={closeExportModal}
        columns={resolvedExportColumns}
        isLoadingColumns={isLoadingExportColumns}
        isExporting={isExportingExcel}
        searchTerm={searchTerm}
        serverError={exportError}
        onConfirm={handleConfirmExport}
      />
    </div>
  );
};

export default Table;