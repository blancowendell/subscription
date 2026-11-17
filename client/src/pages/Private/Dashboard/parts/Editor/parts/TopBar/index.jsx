import React, { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { FaSave, FaTimesCircle, FaTrash } from "react-icons/fa";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbDeviceDesktop,
  TbDeviceMobile,
  TbPencil,
} from "react-icons/tb";
import { btnDanger, btnPrimary, btnSecondary } from "../../../../utils/buttonStyles";

const Segmented = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden text-xs">
    {options.map((option) => {
      const active = option.value === value;
      const Icon = option.icon;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={active}
          title={option.title || option.label}
          className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${
            active
              ? "font-semibold"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
          style={active ? { background: "var(--main-color)", color: "var(--main-text-color)" } : undefined}
        >
          {Icon && <Icon size={15} />}
          {option.label}
        </button>
      );
    })}
  </div>
);

const TopBar = ({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  mode,
  onModeChange,
  device,
  onDeviceChange,
  isDirty,
  saving,
  onDiscard,
  onSave,
  onDelete,
}) => {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDiscard(false);
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    onDelete();
  };

  const handleDiscard = () => {
    if (isDirty && !confirmDiscard) {
      setConfirmDelete(false);
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    onDiscard();
  };

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
      <label className="flex items-center gap-1.5 min-w-0 group">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={100}
          aria-label="Dashboard name"
          className="min-w-0 w-52 bg-transparent text-base font-semibold text-gray-800 dark:text-white border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-[var(--main-color)] focus:outline-none py-0.5"
        />
        <TbPencil size={15} className="text-gray-400 shrink-0" />
      </label>

      {isDirty && (
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Unsaved changes
        </span>
      )}

      <div className="flex items-center">
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <IconButton size="small" onClick={onUndo} disabled={!canUndo || mode !== "edit"}>
              <TbArrowBackUp size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <span>
            <IconButton size="small" onClick={onRedo} disabled={!canRedo || mode !== "edit"}>
              <TbArrowForwardUp size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      <Segmented
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "edit", label: "Edit" },
          { value: "preview", label: "Preview" },
        ]}
      />

      {mode === "preview" && (
        <Segmented
          value={device}
          onChange={onDeviceChange}
          options={[
            { value: "desktop", label: "", icon: TbDeviceDesktop, title: "Computer" },
            { value: "phone", label: "", icon: TbDeviceMobile, title: "Phone" },
          ]}
        />
      )}

      <div className="ml-auto flex items-center gap-3">
        {confirmDelete && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Delete this dashboard and all its widgets?
          </span>
        )}
        {confirmDiscard && (
          <span className="text-xs text-red-600 dark:text-red-400">Discard all changes?</span>
        )}

        {confirmDelete || confirmDiscard ? (
          <>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                setConfirmDiscard(false);
              }}
              className={btnSecondary}
            >
              <FaTimesCircle /> {confirmDelete ? "Cancel" : "Keep editing"}
            </button>
            <button
              type="button"
              onClick={confirmDelete ? handleDelete : handleDiscard}
              className={btnPrimary}
            >
              <FaTrash /> {confirmDelete ? "Delete dashboard" : "Discard changes"}
            </button>
          </>
        ) : (
          <>
            {onDelete && (
              <button type="button" onClick={handleDelete} disabled={saving} className={btnDanger}>
                <FaTrash /> Delete
              </button>
            )}
            <button type="button" onClick={handleDiscard} disabled={saving} className={btnSecondary}>
              <FaTimesCircle /> {isDirty ? "Discard" : "Close"}
            </button>
            <button type="button" onClick={onSave} disabled={saving} className={btnPrimary}>
              <FaSave /> {saving ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TopBar;