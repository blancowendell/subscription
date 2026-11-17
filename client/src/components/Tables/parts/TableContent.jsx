// import React from "react";

import React from "react";
import Lottie from "lottie-react";
import { Pencil, Eye } from "lucide-react";
import DeleteConfirmButton from "../../Buttons/PopconfirmDelete.jsx";

const TableContent = ({
  headers,
  keys,
  paginatedData,
  isLoading = false,
  onRowClick,
  onEditClick,
  onViewClick,
  onDeleteClick,
  withEdit = false,
  withView = false,
  withDelete = false,
  withImage = false,
  renderAvatar,
  noDataAnimation,
  customActionsRenderer,
}) => {
  // --- Skeleton Row Component ---
  const SkeletonRow = () => (
    <tr className="animate-pulse border-b border-gray-100 dark:border-slate-800">
      {headers.map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto flex-1 rounded-t-lg shadow border border-gray-200 dark:border-slate-800 transition-colors">
      <table className="min-w-full text-sm text-left table-fixed">
        <thead
          className="text-[var(--main-text-color)] uppercase text-xs font-semibold sticky top-0 z-[5]"
          style={{ backgroundColor: "var(--main-color)" }}
        >
          <tr>
            {headers.map((header, index) => {
              const isFirst = index === 0;
              const isLast = index === headers.length - 1;
              return (
                <th
                  key={index}
                  className={`px-4 py-3 bg-[var(--main-color)] text-[var(--main-text-color)] ${
                    isFirst ? "rounded-tl-lg" : ""
                  } ${isLast ? "rounded-tr-lg" : ""}`}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* 1. Show Skeleton if Loading */}
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <SkeletonRow key={`skel-${i}`} />
            ))
          ) : /* 2. Show Data if it exists */
          paginatedData.length > 0 ? (
            paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-slate-800 text-gray-700 dark:text-gray-300"
                onClick={() => onRowClick && onRowClick(row)}
              >
                {keys.map((key, colIndex) => {
                  let content;

                  if (key === "actions") {
                    content = (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customActionsRenderer ? (
                          customActionsRenderer(row)
                        ) : (
                          <>
                            {withEdit && (
                              <button
                                className="text-blue-500 hover:text-blue-700"
                                onClick={() => onEditClick(row)}
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {withView && (
                              <button
                                className="text-green-500 hover:text-green-700"
                                onClick={() => onViewClick && onViewClick(row)}
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {withDelete && (
                              <DeleteConfirmButton
                                onConfirm={() =>
                                  onDeleteClick && onDeleteClick(row)
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  } else if (key === "amount") {
                    const amount = row[key];
                    content =
                      amount !== undefined && amount !== null
                        ? `₱${parseFloat(amount).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-";
                  } else if (key === "image") {
                    /* =========================================================
                       🔥 NEW SEPARATE BASE64 IMAGE PARAMETER (TOUCHES NOTHING ELSE)
                       ========================================================= */
                    const base64Data = row[key];
                    if (base64Data && base64Data !== "-") {
                      content = (
                        <img
                          src={base64Data}
                          alt="Agent Profile"
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      );
                    } else {
                      content = "-";
                    }
                  } else if (key === "base64Image") {
                    const base64Str = row[key];
                    if (base64Str && base64Str !== "-") {
                      const src = base64Str.startsWith("data:")
                        ? base64Str
                        : `data:image/jpeg;base64,${base64Str}`;
                      content = (
                        <img
                          src={src}
                          alt="Profile Source"
                          className="w-10 h-10 rounded-full object-cover border border-gray-100"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      );
                    } else {
                      content = "-";
                    }
                  } else if ((key === "name" || key === "name2") && withImage) {
                    const nameValue =
                      row[key === "name" ? "name" : "name2"] ?? "-";
                    const emailValue =
                      row[key === "name" ? "email" : "email2"] ?? "";
                    const imageValue = row[key === "name" ? "image" : "image2"];

                    const avatar = imageValue ? (
                      <img
                        src={imageValue}
                        alt={nameValue}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      renderAvatar(nameValue, null)
                    );

                    content = (
                      <div className="flex items-center gap-3">
                        {avatar}
                        <div>
                          <p className="font-medium">{nameValue}</p>
                          <p className="text-xs text-gray-500">{emailValue}</p>
                        </div>
                      </div>
                    );
                  } else if (
                    key === "status" ||
                    key === "secondStatus" ||
                    key === "thirdStatus"
                  ) {
                    const status = row[key] ?? "-";
                    let statusColor = "bg-gray-200 text-gray-800";

                    if (
                      status.toLowerCase() === "active" ||
                      status.toLowerCase() === "approved" ||
                      status.toLowerCase() === "paid"
                    ) {
                      statusColor = "bg-green-100 text-green-700";
                    } else if (
                      status.toLowerCase() === "inactive" ||
                      status.toLowerCase() === "rejected" ||
                      status.toLowerCase() === "cancelled" ||
                      status.toLowerCase() === "unpaid"
                    ) {
                      statusColor = "bg-red-100 text-red-700";
                    } else if (
                      status.toLowerCase() === "pending" ||
                      status.toLowerCase() === "partial" ||
                      status.toLowerCase() === "hold"
                    ) {
                      statusColor = "bg-yellow-100 text-yellow-700";
                    }

                    content = (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}
                      >
                        {status}
                      </span>
                    );
                  } else {
                    content = row[key] ?? "-";
                  }

                  return (
                    <td
                      key={colIndex}
                      className="px-4 py-3 border-t border-gray-200 font-medium"
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            /* 3. Show Lottie Animation if NOT loading and NO data */
            <tr>
              <td colSpan={headers.length} className="text-center py-16">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-48 h-48">
                    <Lottie animationData={noDataAnimation} loop autoplay />
                  </div>
                  <p className="text-gray-500 mt-2">No Data Available</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableContent;
