import React, { useState, useEffect } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import FeatureAPI from "../../../../../api/private/subscription/featureAPI";

// Extracts the backend message regardless of how the API wrapper throws
const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

const CODE_PATTERN = /^[A-Z0-9_]+$/;

const TYPE_OPTIONS = [
  { value: "MODULE", label: "MODULE · turns a module on/off" },
  { value: "LIMIT", label: "LIMIT · caps a number (users, branches…)" },
];

const EMPTY_FORM = {
  code: "",
  name: "",
  module: "",
  type: "MODULE",
  description: "",
  sortOrder: "0",
  status: "ACTIVE",
};

const FeatureList = () => {
  const headers = ["Code", "Name", "Module", "Type", "Status", "Actions"];
  const keys = ["code", "name", "module", "type", "status", "actions"];
  const tableOptions = { withEdit: true };

  const [features, setFeatures] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setUpper = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value.toUpperCase() }));

  // Existing modules, offered as hints so names stay consistent
  const knownModules = [...new Set(features.map((f) => f.module).filter(Boolean))].sort();

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  const fetchFeatures = async () => {
    setIsTableLoading(true);
    try {
      const data = await FeatureAPI.loadFeatures();
      setFeatures(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load features."));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingFeature(null);
    setForm(EMPTY_FORM);
  };

  /* =======================
     API HANDLERS
  ======================= */
  const validate = () => {
    if (!editingFeature) {
      if (!form.code.trim()) return "Code is required.";
      if (!CODE_PATTERN.test(form.code.trim())) return "Code can only use letters, numbers, and underscores.";
    }
    if (!form.name.trim()) return "Name is required.";
    if (!form.module.trim()) return "Module is required.";
    if (!CODE_PATTERN.test(form.module.trim())) return "Module can only use letters, numbers, and underscores.";
    if (!(Number.isInteger(Number(form.sortOrder)) && Number(form.sortOrder) >= 0))
      return "Sort order must be a whole number, 0 or more.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const invalid = validate();
    if (invalid) {
      showWarningToast("Warning", invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFeature) {
        await FeatureAPI.updateFeature(editingFeature.id, form);
      } else {
        await FeatureAPI.addFeature(form);
      }

      showSuccessToast(editingFeature ? "Feature updated successfully!" : "Feature added successfully!");
      fetchFeatures();
      closeDrawer();
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error, "Failed to save feature.");
      if (message === "exist") {
        showWarningToast("Warning", "A feature with that code already exists.");
      } else {
        showErrorToast("Error", message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = async (row) => {
    try {
      const [feature] = await FeatureAPI.getFeature(row.id);
      if (!feature) return;
      setEditingFeature(feature);
      setForm({
        code: feature.code || "",
        name: feature.name || "",
        module: feature.module || "",
        type: feature.type || "MODULE",
        description: feature.description || "",
        sortOrder: String(feature.sort_order ?? "0"),
        status: feature.status || "ACTIVE",
      });
      setIsDrawerOpen(true);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load feature details."));
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") {
      setEditingFeature(null);
      setForm(EMPTY_FORM);
      setIsDrawerOpen(true);
    }
  };

  const dropdownItems = [{ key: "add-new", label: "Add New Feature" }];

  const data = features.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    module: f.module,
    type: f.type,
    status: f.status,
    actions: "",
  }));

  const LockedField = ({ label, value, note }) => (
    <div>
      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <div className="px-3 py-2.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium">
        {value}
      </div>
      {note && <p className="mt-1 text-[11px] text-gray-500">{note}</p>}
    </div>
  );

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Features</h2>
          <p className="text-sm text-gray-500">Modules and limits the ERP checks for each tenant</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow">
        <Table
          headers={headers}
          data={data}
          keys={keys}
          {...tableOptions}
          dropdownItems={dropdownItems}
          onItemClick={handleDropdownClick}
          onEditClick={handleEditClick}
          isLoading={isTableLoading}
        />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingFeature ? `Edit Feature · ${editingFeature.code}` : "Add New Feature"}
        width={440}
      >
        <form className="space-y-4 h-full flex flex-col" onSubmit={handleSubmit}>
          {editingFeature ? (
            <div className="grid grid-cols-2 gap-4">
              <LockedField label="Code" value={editingFeature.code} />
              <LockedField label="Type" value={editingFeature.type} />
              <p className="col-span-2 -mt-2 text-[11px] text-gray-500">
                Code and type are locked: the ERP checks features by code.
              </p>
            </div>
          ) : (
            <>
              <FloatingInput
                id="featureCode"
                label="Code (e.g. INVENTORY, MAX_USERS)"
                value={form.code}
                onChange={setUpper("code")}
              />
              <FloatingSelect
                id="featureType"
                label="Type"
                value={form.type}
                onChange={setField("type")}
                options={TYPE_OPTIONS}
              />
            </>
          )}

          <FloatingInput id="featureName" label="Name" value={form.name} onChange={setField("name")} />

          <div>
            <FloatingInput
              id="featureModule"
              label="Module (e.g. INVENTORY, CORE)"
              value={form.module}
              onChange={setUpper("module")}
            />
            {knownModules.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {knownModules.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, module: m }))}
                    className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                      form.module === m
                        ? "bg-main text-[var(--main-text-color)] border-transparent"
                        : "border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-main"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <FloatingInput
            id="featureDescription"
            label="Description (optional)"
            value={form.description}
            onChange={setField("description")}
          />
          <FloatingInput
            id="featureSortOrder"
            label="Sort Order (within module)"
            type="number"
            value={form.sortOrder}
            onChange={setField("sortOrder")}
          />

          {editingFeature && (
            <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Feature Status
              </label>
              <ToggleStatusButton
                value={form.status === "ACTIVE"}
                onChange={(val) => setForm((f) => ({ ...f, status: val ? "ACTIVE" : "INACTIVE" }))}
                statusOptions={[
                  { label: "ACTIVE", value: true },
                  { label: "INACTIVE", value: false },
                ]}
              />
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                Inactive features can't be assigned to plans and are left out of tenant syncs.
              </p>
            </div>
          )}

          <div className="pt-6 mt-auto">
            <DrawerActions onCancel={closeDrawer} isEditing={!!editingFeature} isLoading={isSubmitting} />
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default FeatureList;
