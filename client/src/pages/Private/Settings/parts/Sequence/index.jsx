import React, { useState, useEffect } from "react";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import { TbXboxXFilled } from "react-icons/tb";
import { LuSaveAll } from "react-icons/lu";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import FloatingNumberInput from "../../../../../components/Forms/FloatingNumberInput";
import FloatingCheckbox from "../../../../../components/Forms/FloatingCheckboxGroup";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import Table from "../../../../../components/Tables";
import SequenceAPI from "../../../../../api/private/maintenance/sequenceAPI";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";

const EMPTY_FORM = {
  code: "",
  name: "",
  prefix: "",
  separator: "-",
  start_number: "1",
  padding_length: 4,
  include_year: false,
  year_format: "YYYY",
  include_month: false,
  include_day: false,
  reset_period: "NEVER",
  status: "ACTIVE",
};

const SEPARATOR_OPTIONS = [
  { value: "-", label: "Dash (-)" },
  { value: "/", label: "Slash (/)" },
  { value: "_", label: "Underscore (_)" },
  { value: "", label: "None" },
];

const YEAR_FORMAT_OPTIONS = [
  { value: "YYYY", label: "Full year (2026)" },
  { value: "YY", label: "Short year (26)" },
];

const RESET_OPTIONS = [
  { value: "NEVER", label: "Never" },
  { value: "YEARLY", label: "Every year" },
  { value: "MONTHLY", label: "Every month" },
  { value: "DAILY", label: "Every day" },
];

const RESET_LABELS = Object.fromEntries(RESET_OPTIONS.map((o) => [o.value, o.label]));

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.msg || error?.msg || fallback;

const normalizeCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");

// Mirrors services/repository/sequence.js formatSequence
const buildPreview = (f) => {
  const now = new Date();
  const dateParts = [];
  if (f.include_year) {
    const fullYear = String(now.getFullYear());
    dateParts.push(f.year_format === "YY" ? fullYear.slice(-2) : fullYear);
  }
  if (f.include_month) dateParts.push(String(now.getMonth() + 1).padStart(2, "0"));
  if (f.include_day) dateParts.push(String(now.getDate()).padStart(2, "0"));

  const datePart = dateParts.join(f.separator);
  const paddedNum = String(f.start_number || 0).padStart(Number(f.padding_length) || 0, "0");
  return `${f.prefix}${datePart ? datePart + f.separator : ""}${paddedNum}`;
};

// Mirrors the backend reset rule
const resetRuleError = (f) => {
  if (f.reset_period === "YEARLY" && !f.include_year) return "A yearly reset needs the year in the format.";
  if (f.reset_period === "MONTHLY" && !(f.include_year && f.include_month))
    return "A monthly reset needs the year and month in the format.";
  if (f.reset_period === "DAILY" && !(f.include_year && f.include_month && f.include_day))
    return "A daily reset needs the year, month and day in the format.";
  return null;
};

const MaintenanceSequence = () => {
  const [sequences, setSequences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inUse, setInUse] = useState(false);
  const [nextValue, setNextValue] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = editingId !== null;
  const formatLocked = isEdit && inUse;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadSequences = async () => {
    setIsLoading(true);
    try {
      const data = await SequenceAPI.loadSequence();
      setSequences(Array.isArray(data) ? data : []);
    } catch (error) {
      setSequences([]);
      showErrorToast(getErrorMessage(error, "Failed to load sequences"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSequences();
  }, []);

  const openAddDrawer = () => {
    setEditingId(null);
    setInUse(false);
    setNextValue("");
    setForm(EMPTY_FORM);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = async (sequenceId) => {
    try {
      const data = await SequenceAPI.getSequence(sequenceId);
      const seq = data?.[0];
      if (!seq) {
        showErrorToast("Sequence not found");
        return;
      }

      setEditingId(seq.id);
      setInUse(Boolean(seq.in_use));
      setNextValue(seq.preview || "");
      setForm({
        code: seq.code ?? "",
        name: seq.name ?? "",
        prefix: seq.prefix ?? "",
        separator: seq.separator ?? "",
        start_number: String(seq.start_number ?? "1"),
        padding_length: Number(seq.padding_length) || 0,
        include_year: Boolean(Number(seq.include_year)),
        year_format: seq.year_format || "YYYY",
        include_month: Boolean(Number(seq.include_month)),
        include_day: Boolean(Number(seq.include_day)),
        reset_period: seq.reset_period || "NEVER",
        status: seq.status || "ACTIVE",
      });
      setIsDrawerOpen(true);
    } catch (error) {
      showErrorToast(getErrorMessage(error, "Failed to load sequence data"));
    }
  };

  const closeDrawer = () => {
    if (isSaving) return;
    setIsDrawerOpen(false);
  };

  const validate = () => {
    if (!isEdit && !/^[A-Z][A-Z0-9_]*$/.test(form.code))
      return "Code must start with a letter and use only letters, numbers and underscores.";
    if (!form.name.trim()) return "Name is required.";
    if (!(Number(form.padding_length) >= 1 && Number(form.padding_length) <= 10))
      return "Padding length must be between 1 and 10.";
    if (!formatLocked) {
      if (!(Number(form.start_number) >= 0)) return "Start number must be 0 or higher.";
      const resetError = resetRuleError(form);
      if (resetError) return resetError;
    }
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) {
      showWarningToast(problem);
      return;
    }

    const payload = { ...form, name: form.name.trim() };

    setIsSaving(true);
    try {
      if (isEdit) {
        await SequenceAPI.editSequence(editingId, payload);
        showSuccessToast("Sequence updated successfully");
      } else {
        await SequenceAPI.addSequence(payload);
        showSuccessToast("Sequence added successfully");
      }
      setIsDrawerOpen(false);
      loadSequences();
    } catch (error) {
      showErrorToast(getErrorMessage(error, isEdit ? "Failed to update sequence" : "Failed to add sequence"));
    } finally {
      setIsSaving(false);
    }
  };

  const tableHeaders = ["Name", "Code", "Next Value", "Resets", "Status", "Actions"];
  const tableKeys = ["name", "code", "preview", "reset", "status", "actions"];
  const tableOptions = { withImage: false, withEdit: true, withDelete: false };

  const tableData = sequences.map((seq) => ({
    id: seq.id,
    name: seq.name,
    code: seq.code,
    preview: seq.preview,
    reset: RESET_LABELS[seq.reset_period] || seq.reset_period,
    status: seq.status,
    actions: "",
  }));

  const previewValue = formatLocked ? nextValue : buildPreview(form);

  return (
    <div className="p-5 space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">Sequences</h2>
        <p className="text-sm text-gray-500">
          Number formats used across the system, such as employee IDs, invoice numbers or reference codes
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <Table
          headers={tableHeaders}
          data={tableData}
          keys={tableKeys}
          {...tableOptions}
          isLoading={isLoading}
          dropdownItems={[{ key: "add-new", label: "Add New Sequence" }]}
          onItemClick={({ key }) => key === "add-new" && openAddDrawer()}
          onEditClick={(row) => openEditDrawer(row.id)}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={isEdit ? "Edit Sequence" : "Add Sequence"}
        width={600}
      >
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {formatLocked && (
            <div className="px-4 py-3 rounded-xl bg-main/10 text-sm text-gray-700 dark:text-gray-200">
              This sequence has already issued values, so its format is locked. Only the name, padding and
              status can change.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FloatingInput
                id="code"
                label="Code (e.g. INVOICE)"
                value={form.code}
                onChange={(e) => setField("code", normalizeCode(e.target.value))}
                disabled={isEdit}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {isEdit ? "The code can't change: modules look the sequence up by it." : "Used by code to request values."}
              </p>
            </div>

            <FloatingInput
              id="name"
              label="Name (e.g. Sales Invoice)"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FloatingInput
              id="prefix"
              label="Prefix (e.g. INV-)"
              value={form.prefix}
              onChange={(e) => setField("prefix", e.target.value)}
              disabled={formatLocked}
            />

            <FloatingSelect
              id="separator"
              label="Separator"
              value={form.separator}
              onChange={(e) => setField("separator", e.target.value)}
              options={SEPARATOR_OPTIONS}
              disabled={formatLocked}
            />
          </div>

          {/* Date parts */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 space-y-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Date in the value</p>
            <div className="flex items-center gap-6">
              <FloatingCheckbox
                id="includeYear"
                label="Year"
                checked={form.include_year}
                onChange={(e) => setField("include_year", e.target.checked)}
                disabled={formatLocked}
              />
              <FloatingCheckbox
                id="includeMonth"
                label="Month"
                checked={form.include_month}
                onChange={(e) => setField("include_month", e.target.checked)}
                disabled={formatLocked}
              />
              <FloatingCheckbox
                id="includeDay"
                label="Day"
                checked={form.include_day}
                onChange={(e) => setField("include_day", e.target.checked)}
                disabled={formatLocked}
              />
            </div>

            {form.include_year && (
              <FloatingSelect
                id="yearFormat"
                label="Year Format"
                value={form.year_format}
                onChange={(e) => setField("year_format", e.target.value)}
                options={YEAR_FORMAT_OPTIONS}
                disabled={formatLocked}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FloatingNumberInput
              id="start_number"
              label="Start Number"
              value={form.start_number}
              onChange={(val) => setField("start_number", val)}
              disabled={formatLocked}
            />

            <FloatingNumberInput
              id="padding_length"
              label="Padding Length"
              value={form.padding_length}
              onChange={(val) => setField("padding_length", Number(val) || 0)}
            />

            <FloatingSelect
              id="resetPeriod"
              label="Restart Numbering"
              value={form.reset_period}
              onChange={(e) => setField("reset_period", e.target.value)}
              options={RESET_OPTIONS}
              disabled={formatLocked}
            />
          </div>

          {!formatLocked && resetRuleError(form) && (
            <p className="text-xs text-amber-700 dark:text-amber-400 -mt-3">{resetRuleError(form)}</p>
          )}

          {isEdit && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Status</p>
              <ToggleStatusButton
                value={form.status === "ACTIVE"}
                onChange={(val) => setField("status", val ? "ACTIVE" : "INACTIVE")}
                statusOptions={[
                  { label: "ACTIVE", value: true },
                  { label: "INACTIVE", value: false },
                ]}
              />
              {form.status === "INACTIVE" && (
                <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                  Inactive sequences can't issue values; anything that uses this one will fail until it's active.
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-[11px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 mb-2">
              {formatLocked ? "Next Value" : "Preview"}
            </label>
            <div className="px-5 py-3 bg-gray-100 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 text-xl font-mono text-main shadow-inner break-all">
              {previewValue}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeDrawer}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <TbXboxXFilled className="text-lg opacity-70" />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all bg-main hover:bg-main-hover text-[var(--main-text-color)] disabled:opacity-50"
            >
              <LuSaveAll className="text-lg" />
              <span>{isSaving ? "Saving..." : `${isEdit ? "Update" : "Add"} Sequence`}</span>
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default MaintenanceSequence;