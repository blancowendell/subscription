import React, { useState, useMemo } from "react";
import { Pagination } from "antd";
import SearchForm from "../../Tables/parts/SearchForm";
import Lottie from "lottie-react";
import noDataAnimation from "../../../assets/animations/no-data.json";

const ModalTable = ({
  headers = [],
  keys = [],
  data = [],
  rowsPerPage = 10,
  maxHeight = "350px",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return data.filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <SearchForm
          searchTerm={searchTerm}
          handleSearch={handleSearch}
          handleSubmit={(e) => e.preventDefault()}
        />
      </div>

      <div
        className="overflow-auto border border-gray-200 dark:border-slate-800 rounded-lg transition-colors"
        style={{ maxHeight }}
      >
        <table className="min-w-full text-sm text-left table-fixed">
          <thead
            className="text-xs uppercase sticky top-0 z-10"
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--main-text-color)",
            }}
          >
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-slate-900 transition-colors">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800"
                >
                  {keys.map((key, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-4 py-3 text-gray-700 dark:text-gray-300"
                    >
                      {row[key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="text-center py-16 dark:bg-slate-900">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-40 h-40 opacity-80">
                      <Lottie animationData={noDataAnimation} loop autoplay />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">No Data Available</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center pt-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages || 1}
        </p>

        <Pagination
          current={currentPage}
          total={filteredData.length}
          pageSize={rowsPerPage}
          onChange={setCurrentPage}
          showSizeChanger={false}
          className="dark:text-gray-300"
        />
      </div>
    </div>
  );
};

export default ModalTable;