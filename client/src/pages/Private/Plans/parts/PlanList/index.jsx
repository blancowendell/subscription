import React, { useState, useEffect } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import PlanAPI from "../../../../../api/private/subscription/planAPI";

// Extracts the backend message regardless of how the API wrapper throws
const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isWhole = (value) => String(value).trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;
const isMoney = (value) => String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  priceMonthly: "",
  priceYearly: "",
  trialDays: "0",
  graceDays: "7",
  sortOrder: "0",
  isPublic: true,
  status: "ACTIVE",
};

const Section = ({ title, children }) => (
  <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-4">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</label>
    {children}
  </div>
);

const PlanList = () => {
  const headers = ["Code", "Name", "Monthly", "Yearly", "Trial", "Public", "Status", "Actions"];
  const keys = ["code", "name", "monthly", "yearly", "trial", "public", "status", "actions"];
  const tableOptions = { withEdit: true };

  const [plans, setPlans] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  const fetchPlans = async () => {
    setIsTableLoading(true);
    try {
      const data = await PlanAPI.loadPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load plans."));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openDrawer = () => setIsDrawerOpen(true);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingPlan(null);
    setForm(EMPTY_FORM);
  };

  /* =======================
     API HANDLERS
  ======================= */
  const validate = () => {
    if (!editingPlan && !form.code.trim()) return "Code is required.";
    if (!editingPlan && !/^[A-Za-z0-9_]+$/.test(form.code.trim()))
      return "Code can only use letters, numbers, and underscores.";
    if (!form.name.trim()) return "Name is required.";
    if (!isMoney(form.priceMonthly)) return "Monthly price must be 0 or more.";
    if (!isMoney(form.priceYearly)) return "Yearly price must be 0 or more.";
    if (!isWhole(form.trialDays)) return "Trial days must be a whole number, 0 or more.";
    if (!isWhole(form.graceDays)) return "Grace days must be a whole number, 0 or more.";
    if (!isWhole(form.sortOrder)) return "Sort order must be a whole number, 0 or more.";
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
      if (editingPlan) {
        await PlanAPI.updatePlan(editingPlan.id, form);
      } else {
        await PlanAPI.addPlan(form);
      }

      showSuccessToast(editingPlan ? "Plan updated successfully!" : "Plan added successfully!");
      fetchPlans();
      closeDrawer();
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error, "Failed to save plan.");
      if (message === "exist") {
        showWarningToast("Warning", "A plan with that code or name already exists.");
      } else {
        showErrorToast("Error", message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = async (row) => {
    try {
      const [plan] = await PlanAPI.getPlan(row.id);
      if (!plan) return;
      setEditingPlan(plan);
      setForm({
        code: plan.code || "",
        name: plan.name || "",
        description: plan.description || "",
        priceMonthly: String(plan.price_monthly ?? ""),
        priceYearly: String(plan.price_yearly ?? ""),
        trialDays: String(plan.trial_days ?? "0"),
        graceDays: String(plan.grace_days ?? "0"),
        sortOrder: String(plan.sort_order ?? "0"),
        isPublic: Number(plan.is_public) === 1 || plan.is_public === true,
        status: plan.status || "ACTIVE",
      });
      openDrawer();
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load plan details."));
    }
  };

  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") {
      setEditingPlan(null);
      setForm(EMPTY_FORM);
      openDrawer();
    }
  };

  const dropdownItems = [{ key: "add-new", label: "Add New Plan" }];

  const data = plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    monthly: peso(p.price_monthly),
    yearly: peso(p.price_yearly),
    trial: Number(p.trial_days) > 0 ? `${p.trial_days} days` : "None",
    public: Number(p.is_public) === 1 || p.is_public === true ? "Yes" : "No",
    status: p.status,
    actions: "",
  }));

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Plans</h2>
          <p className="text-sm text-gray-500">Subscription tiers, prices, trial and grace days</p>
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
        title={editingPlan ? `Edit Plan · ${editingPlan.code}` : "Add New Plan"}
        width={480}
      >
        <form className="space-y-4 h-full flex flex-col" onSubmit={handleSubmit}>
          {editingPlan ? (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Code</label>
              <div className="px-3 py-2.5 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium">
                {editingPlan.code}
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Locked: tenants in the ERP store this code.</p>
            </div>
          ) : (
            <FloatingInput
              id="planCode"
              label="Code (e.g. BASIC, PRO)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
          )}

          <FloatingInput id="planName" label="Name" value={form.name} onChange={setField("name")} />
          <FloatingInput
            id="planDescription"
            label="Description (optional)"
            value={form.description}
            onChange={setField("description")}
          />

          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                id="priceMonthly"
                label="Monthly Price"
                type="number"
                value={form.priceMonthly}
                onChange={setField("priceMonthly")}
              />
              <FloatingInput
                id="priceYearly"
                label="Yearly Price"
                type="number"
                value={form.priceYearly}
                onChange={setField("priceYearly")}
              />
            </div>
            {editingPlan && (
              <p className="text-[11px] text-gray-500 -mt-2">
                Price changes apply to new subscriptions only. Existing subscribers keep their locked price.
              </p>
            )}
          </Section>

          <Section title="Trial, Grace & Order">
            <div className="grid grid-cols-3 gap-4">
              <FloatingInput
                id="trialDays"
                label="Trial Days"
                type="number"
                value={form.trialDays}
                onChange={setField("trialDays")}
              />
              <FloatingInput
                id="graceDays"
                label="Grace Days"
                type="number"
                value={form.graceDays}
                onChange={setField("graceDays")}
              />
              <FloatingInput
                id="sortOrder"
                label="Sort Order"
                type="number"
                value={form.sortOrder}
                onChange={setField("sortOrder")}
              />
            </div>
            <p className="text-[11px] text-gray-500 -mt-2">
              Trial 0 = no trial. Grace = days after the end date before the tenant is suspended.
            </p>
          </Section>

          <Section title="Visibility">
            <ToggleStatusButton
              value={form.isPublic}
              onChange={(val) => setForm((f) => ({ ...f, isPublic: val }))}
              statusOptions={[
                { label: "PUBLIC", value: true },
                { label: "HIDDEN", value: false },
              ]}
            />
            <p className="text-[11px] text-gray-500 -mt-2">
              Hidden plans don't show on the client pricing page; admins can still assign them.
            </p>
          </Section>

          {editingPlan && (
            <Section title="Plan Status">
              <ToggleStatusButton
                value={form.status === "ACTIVE"}
                onChange={(val) => setForm((f) => ({ ...f, status: val ? "ACTIVE" : "INACTIVE" }))}
                statusOptions={[
                  { label: "ACTIVE", value: true },
                  { label: "INACTIVE", value: false },
                ]}
              />
              <p className="text-[11px] text-gray-500 -mt-2">
                Inactive plans can't be picked for new subscriptions. Existing ones keep running.
              </p>
            </Section>
          )}

          <div className="pt-6 mt-auto">
            <DrawerActions onCancel={closeDrawer} isEditing={!!editingPlan} isLoading={isSubmitting} />
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default PlanList;
