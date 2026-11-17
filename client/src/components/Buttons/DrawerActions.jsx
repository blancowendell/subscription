import React from "react";
import { TbXboxXFilled } from "react-icons/tb";
import { LuSaveAll } from "react-icons/lu";

export const DrawerActions = ({
  onCancel,
  isEditing,
  isLoading = false,
  submitText,
}) => {
  return (
    <div className="flex justify-between pt-6 border-t">
      {/* Cancel Button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="px-4 py-2 bg-gray-300 rounded-md flex items-center gap-2 hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <TbXboxXFilled />
        Cancel
      </button>

      {/* Submit / Save Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-2 rounded-md flex items-center gap-2 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "var(--main-color)",
          color: "var(--main-text-color)",
        }}
      >
        {isLoading ? (
          <>
            {/* Simple SVG Spinner */}
            <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{isEditing ? "Updating..." : "Adding..."}</span>
          </>
        ) : (
          <>
            <LuSaveAll />
            <span>{submitText || (isEditing ? "Update Record" : "Add Record")}</span>
          </>
        )}
      </button>
    </div>
  );
};