import React, { useEffect, useState } from "react";
import { FaPen, FaPlus, FaSyncAlt } from "react-icons/fa";
import { MdTune } from "react-icons/md";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Drawer from "../../../../../components/Modals/AntdDrawer";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import SystemSettingsAPI from "../../../../../api/private/dev_tools/systemSettingsAPI";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPES = ["BOOLEAN", "STRING", "NUMBER"];

// ToggleStatusButton works with real booleans; settings store "1"/"0".
const BOOLEAN_OPTIONS = [
  { label: "ON", value: true },
  { label: "OFF", value: false },
];

const toBool = (val) => String(val) === "1";
const toStored = (checked) => (checked ? "1" : "0");

// Friendly card titles. Keys not listed here fall back to title case (FOO_BAR → Foo Bar).
const SETTING_LABELS = {
  // EXAMPLE_KEY: "Example Setting",
};

// Shown on the card and in the drawer for settings with side effects.
const SETTING_NOTES = {
  // EXAMPLE_KEY: "What changes when this is turned on or off.",
};

const isValidKey = (key) => /^[A-Z0-9_]{2,100}$/.test(key);

const titleCase = (key) =>
  String(key || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const settingLabel = (key) => SETTING_LABELS[key] || titleCase(key);

const isOn = (row) => toBool(row.value);

const toDate = (value) => (value ? new Date(String(value).replace(" ", "T")) : null);

const formatDateTime = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleString() : "-";
};

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [id, setId] = useState(null);

  // Form state
  const [key, setKey] = useState("");
  const [type, setType] = useState("BOOLEAN");
  const [value, setValue] = useState("1");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await SystemSettingsAPI.loadSystemSettings();
      setSettings(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Error", "Failed to load system settings");
    } finally {
      setIsLoading(false);
    }
  };

  const backendMessage = (error) => {
    const msg = error?.response?.data?.msg || error?.response?.data?.message;
    return msg && typeof msg === "string" ? msg : null;
  };

  // ── Inline toggle (BOOLEAN) ────────────────────────────────────────────────

  // newValue is "1" or "0"
  const handleToggle = async (row, newValue) => {
    if (String(row.value) === String(newValue)) return;

    const previous = row.value;
    setSavingId(row.id);

    // Optimistic update; reverted if the save fails.
    setSettings((list) =>
      list.map((s) => (Number(s.id) === Number(row.id) ? { ...s, value: newValue } : s)),
    );

    try {
      await SystemSettingsAPI.toggleSystemSetting(row.id, newValue === "1");
      showSuccessToast(
        "Success",
        `${settingLabel(row.key)} turned ${newValue === "1" ? "ON" : "OFF"}`,
      );
      loadSettings();
    } catch (error) {
      console.error(error);
      setSettings((list) =>
        list.map((s) => (Number(s.id) === Number(row.id) ? { ...s, value: previous } : s)),
      );
      const msg = backendMessage(error);
      if (msg) return showWarningToast("Warning", msg);
      showErrorToast("Error", "Failed to update setting");
    } finally {
      setSavingId(null);
    }
  };

  // ── Drawer ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setId(null);
    setKey("");
    setType("BOOLEAN");
    setValue("1");
    setDescription("");
  };

  const openAddDrawer = () => {
    setIsEditMode(false);
    resetForm();
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (row) => {
    setIsEditMode(true);
    setId(row.id);
    setKey(row.key || "");
    setType(row.type || "BOOLEAN");
    setValue(row.type === "BOOLEAN" ? toStored(isOn(row)) : String(row.value ?? ""));
    setDescription(row.description || "");
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (isSubmitting) return;
    setIsDrawerOpen(false);
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setValue(newType === "BOOLEAN" ? "1" : "");
  };

  const handleSave = async () => {
    if (!isEditMode && !isValidKey(key)) {
      return showWarningToast(
        "Warning",
        "Key must be letters, numbers and underscores only (e.g. FIFO_ENABLED)",
      );
    }

    if (String(value).trim() === "") {
      return showWarningToast("Warning", "Value is required");
    }

    if (type === "NUMBER" && isNaN(Number(value))) {
      return showWarningToast("Warning", "Value must be a number");
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await SystemSettingsAPI.updateSystemSetting(id, value, description);
        showSuccessToast("Success", "Setting updated successfully");
      } else {
        await SystemSettingsAPI.addSystemSetting(key, value, type, description || null);
        showSuccessToast("Success", "Setting added successfully");
      }

      setIsDrawerOpen(false);
      loadSettings();
    } catch (error) {
      console.error(error);
      const msg = backendMessage(error);
      if (msg) return showWarningToast("Warning", msg);

      showErrorToast(
        "Error",
        isEditMode ? "Failed to update setting" : "Failed to add setting",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Card ───────────────────────────────────────────────────────────────────

  const SettingCard = ({ row }) => {
    const isBoolean = row.type === "BOOLEAN";
    const on = isOn(row);
    const saving = Number(savingId) === Number(row.id);

    return (
      <div
        className={`flex flex-col rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors
          ${isBoolean && on
            ? "border-[var(--main-color)]"
            : "border-gray-200 dark:border-slate-800"
          }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold dark:text-white truncate">
                {settingLabel(row.key)}
              </h4>
              {isBoolean && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                    ${on
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400"
                    }`}
                >
                  {on ? "ON" : "OFF"}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{row.description || "No description"}</p>
          </div>

          <button
            type="button"
            onClick={() => openEditDrawer(row)}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-[var(--main-color)] hover:bg-gray-100 dark:hover:bg-slate-800"
            title="Edit"
          >
            <FaPen size={12} />
          </button>
        </div>

        {SETTING_NOTES[row.key] && (
          <div className="mt-3 text-xs p-3 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {SETTING_NOTES[row.key]}
          </div>
        )}

        <div className="mt-4">
          {isBoolean ? (
            <div className={saving ? "pointer-events-none opacity-60" : ""}>
              <ToggleStatusButton
                value={on}
                onChange={(checked) => handleToggle(row, toStored(checked))}
                statusOptions={BOOLEAN_OPTIONS}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-950 px-3 py-2">
              <span className="font-mono text-sm dark:text-white break-all">{row.value ?? "-"}</span>
              <span className="text-[10px] font-semibold text-gray-400">{row.type}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-gray-400">
          <span className="font-mono">{row.key}</span>
          <span className="text-right">
            {formatDateTime(row.updated_at || row.created_at)} · {row.updated_by || row.created_by || "-"}
          </span>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">System Settings</h3>
          <p className="text-sm text-gray-500">
            Global on/off switches and values for the system
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <FaSyncAlt className={isLoading ? "animate-spin" : ""} size={12} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAddDrawer}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--main-color)] text-[var(--main-text-color)] shadow hover:opacity-90"
          >
            <FaPlus size={12} />
            Add Setting
          </button>
        </div>
      </div>

      {isLoading && settings.length === 0 ? (
        <div className="py-16 text-center text-gray-400">Loading...</div>
      ) : settings.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
          <MdTune size={32} className="mb-2" />
          <p className="font-medium">No settings yet</p>
          <p className="text-sm">Click "Add Setting" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {settings.map((row) => (
            <SettingCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={isEditMode ? "Edit Setting" : "Add Setting"}
        width={400}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <FloatingInput
            id="key"
            label="Key"
            value={key}
            disabled={isEditMode}
            onChange={(e) =>
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 100))
            }
          />

          <FloatingSelect
            id="type"
            label="Type"
            value={type}
            disabled={isEditMode}
            onChange={(e) => handleTypeChange(e.target.value)}
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />

          {type === "BOOLEAN" ? (
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Value</label>
              <ToggleStatusButton
                value={toBool(value)}
                onChange={(checked) => setValue(toStored(checked))}
                statusOptions={BOOLEAN_OPTIONS}
              />
            </div>
          ) : (
            <FloatingInput
              id="value"
              label="Value"
              value={value}
              onChange={(e) =>
                setValue(type === "NUMBER" ? e.target.value.replace(/[^\d.-]/g, "") : e.target.value)
              }
            />
          )}

          <FloatingInput
            id="description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {isEditMode && SETTING_NOTES[key] && (
            <div className="text-sm p-3 rounded-lg bg-gray-50 dark:bg-slate-950">
              {SETTING_NOTES[key]}
            </div>
          )}

          {isEditMode && (
            <p className="text-xs text-gray-500">
              Key and type can't be changed after creation.
            </p>
          )}

          <div className="pt-4 mt-auto">
            <DrawerActions
              onCancel={closeDrawer}
              isEditing={!!isEditMode}
              isLoading={isSubmitting}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default SystemSettings;