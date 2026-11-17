import React, { useState, useEffect, useMemo } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import { DrawerActions } from "../../../../../components/Buttons/DrawerActions";
import { FaArrowLeft, FaSync, FaInfoCircle } from "react-icons/fa";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showActionToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import SubscriptionAPI from "../../../../../api/private/subscription/subscriptionAPI";
import ClientAccountAPI from "../../../../../api/private/subscription/clientAccountAPI";
import PlanAPI from "../../../../../api/private/subscription/planAPI";

// Extracts the backend message regardless of how the API wrapper throws
const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  const data = error?.response?.data ?? error?.data ?? error;
  if (typeof data === "string" && data.trim()) return data;
  return data?.msg || data?.message || data?.error || fallback;
};

const btnPrimary =
  "px-5 py-2 rounded-md flex items-center gap-2 bg-main hover:bg-main-hover text-[var(--main-text-color)] text-sm font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed";
const btnSecondary =
  "px-4 py-2 rounded-md flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50";
const btnDanger =
  "px-4 py-2 rounded-md flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm transition-colors disabled:opacity-50";

const STATUSES = ["ALL", "TRIAL", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED", "PENDING"];
const CYCLE_OPTIONS = [
  { value: "MONTHLY", label: "MONTHLY" },
  { value: "YEARLY", label: "YEARLY" },
];

const STATUS_STYLE = {
  TRIAL: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  SUSPENDED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  EXPIRED: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  PENDING: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

// Which actions each status allows (same rules as the backend)
const ACTIONS = [
  { key: "change_plan", label: "Change plan", allowed: ["TRIAL", "ACTIVE"], remarksRequired: false },
  { key: "renew", label: "Renew", allowed: ["TRIAL", "ACTIVE", "EXPIRED"], remarksRequired: false },
  { key: "extend", label: "Extend", allowed: ["TRIAL", "ACTIVE", "SUSPENDED"], remarksRequired: true },
  { key: "suspend", label: "Suspend", allowed: ["TRIAL", "ACTIVE"], remarksRequired: true, danger: true },
  { key: "reactivate", label: "Reactivate", allowed: ["SUSPENDED"], remarksRequired: false },
  {
    key: "cancel",
    label: "Cancel",
    allowed: ["PENDING", "TRIAL", "ACTIVE", "SUSPENDED"],
    remarksRequired: true,
    danger: true,
  },
];

const ACTION_HELP = {
  change_plan: "Takes effect now. The new plan's price is locked in; dates stay until the next renewal.",
  renew: "Adds one billing period from the day after the end date (or today if it already lapsed). A trial becomes paid.",
  extend: "Free extra days, e.g. goodwill or downtime credit.",
  suspend: "Blocks the tenant in the ERP right away.",
  reactivate: "Only works while still inside the paid/trial period. Otherwise renew instead.",
  cancel: "Ends the subscription and suspends the tenant in the ERP.",
};

// ---------- Date helpers (YYYY-MM-DD, UTC math) ----------
const todayLocal = () => new Date().toLocaleDateString("en-CA");
const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
};
const addMonths = (date, months) => {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + Number(months), 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};
const periodEnd = (start, cycle) => addDays(addMonths(start, cycle === "YEARLY" ? 12 : 1), -1);

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isTrue = (v) => v === true || Number(v) === 1;
const isActive = (row) => !row?.status || row.status === "ACTIVE";

// ---------- Small UI pieces (outside the page so inputs keep focus) ----------
const StatusPill = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.EXPIRED}`}>
    {status}
  </span>
);

const Section = ({ title, children }) => (
  <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-4">
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</label>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-right">{value ?? "—"}</span>
  </div>
);

// Shows the outcome of an action: success, or saved-but-not-queued warning
const handleActionResponse = (response, successText) => {
  if (response && !response.data && response.msg && response.msg !== "success") {
    showWarningToast("Warning", response.msg);
    return;
  }
  const jobId = response?.data?.jobId;
  showSuccessToast(jobId ? `${successText} ERP job #${jobId} queued.` : successText);
};

const SubscriptionList = () => {
  const headers = ["Ref", "Tenant", "Company", "Plan", "Cycle", "Price", "Period", "Status", "Actions"];
  const keys = ["ref", "tenant_code", "company_name", "plan", "cycle", "price", "period", "status", "actions"];
  const tableOptions = { withEdit: true };

  const [subscriptions, setSubscriptions] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [accounts, setAccounts] = useState([]);
  const [plans, setPlans] = useState([]);

  // Drawer: NEW | DETAIL | ACTION
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("DETAIL");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeAction, setActiveAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New subscription form
  const [newForm, setNewForm] = useState({
    accountId: "",
    planId: "",
    billingCycle: "MONTHLY",
    startDate: todayLocal(),
    isTrial: false,
    remarks: "",
  });

  // Action form
  const [actionForm, setActionForm] = useState({ planId: "", billingCycle: "", days: "", remarks: "" });

  const activePlans = useMemo(() => plans.filter(isActive), [plans]);
  const planOptions = activePlans.map((p) => ({
    value: String(p.id),
    label: `${p.code} · ${p.name} (${peso(p.price_monthly)}/mo · ${peso(p.price_yearly)}/yr)`,
  }));
  const accountOptions = accounts
    .filter(isActive)
    .map((a) => ({ value: String(a.id), label: `${a.tenant_code} · ${a.company_name}` }));

  const counts = useMemo(() => {
    const c = { ALL: subscriptions.length };
    subscriptions.forEach((s) => (c[s.status] = (c[s.status] || 0) + 1));
    return c;
  }, [subscriptions]);

  const visible = statusFilter === "ALL" ? subscriptions : subscriptions.filter((s) => s.status === statusFilter);

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  const fetchSubscriptions = async () => {
    setIsTableLoading(true);
    try {
      const data = await SubscriptionAPI.loadSubscriptions();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load subscriptions."));
    } finally {
      setIsTableLoading(false);
    }
  };

  const loadLookups = async () => {
    const [accountRes, planRes] = await Promise.allSettled([
      ClientAccountAPI.loadClientAccounts(),
      PlanAPI.loadPlans(),
    ]);
    const take = (result, label) => {
      if (result.status === "fulfilled") return Array.isArray(result.value) ? result.value : [];
      showErrorToast("Error", getErrorMessage(result.reason, `Failed to load ${label}.`));
      return [];
    };
    setAccounts(take(accountRes, "client accounts"));
    setPlans(take(planRes, "plans"));
  };

  const loadDetail = async (id) => {
    const [[sub], rows] = await Promise.all([SubscriptionAPI.getSubscription(id), SubscriptionAPI.loadHistory(id)]);
    setSelected(sub || null);
    setHistory(Array.isArray(rows) ? rows : []);
  };

  useEffect(() => {
    fetchSubscriptions();
    loadLookups();
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelected(null);
    setHistory([]);
    setActiveAction(null);
  };

  /* =======================
     NEW SUBSCRIPTION
  ======================= */
  const newPlan = plans.find((p) => String(p.id) === String(newForm.planId));
  const trialAvailable = Number(newPlan?.trial_days) > 0;
  const newEndDate = (() => {
    if (!newForm.startDate || !newPlan) return null;
    if (newForm.isTrial && trialAvailable) return addDays(newForm.startDate, Number(newPlan.trial_days) - 1);
    return periodEnd(newForm.startDate, newForm.billingCycle);
  })();
  const newPrice = newPlan
    ? newForm.billingCycle === "YEARLY"
      ? newPlan.price_yearly
      : newPlan.price_monthly
    : null;

  const openNew = () => {
    setNewForm({
      accountId: "",
      planId: "",
      billingCycle: "MONTHLY",
      startDate: todayLocal(),
      isTrial: false,
      remarks: "",
    });
    setDrawerMode("NEW");
    setIsDrawerOpen(true);
    loadLookups();
  };

  const executeCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await SubscriptionAPI.addSubscription({
        accountId: newForm.accountId,
        planId: newForm.planId,
        billingCycle: newForm.billingCycle,
        startDate: newForm.startDate,
        isTrial: newForm.isTrial && trialAvailable,
        remarks: newForm.remarks,
      });
      handleActionResponse(response, `Subscription ${response?.data?.ref || ""} created.`);
      fetchSubscriptions();
      closeDrawer();
    } catch (error) {
      console.error(error);
      showErrorToast("Error", getErrorMessage(error, "Failed to create subscription."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newForm.accountId) return showWarningToast("Warning", "Select a client account.");
    if (!newForm.planId) return showWarningToast("Warning", "Select a plan.");
    if (!newForm.startDate) return showWarningToast("Warning", "Pick a start date.");

    const account = accounts.find((a) => String(a.id) === String(newForm.accountId));
    showActionToast({
      title: "Create subscription?",
      description: `${account?.tenant_code} on ${newPlan?.code} (${newForm.isTrial && trialAvailable ? "trial" : newForm.billingCycle}) until ${newEndDate}. The ERP will be set up automatically.`,
      button: { title: "Create", onClick: () => executeCreate() },
    });
  };

  /* =======================
     DETAIL & ACTIONS
  ======================= */
  const handleEditClick = async (row) => {
    try {
      await loadDetail(row.id);
      setActiveAction(null);
      setDrawerMode("DETAIL");
      setIsDrawerOpen(true);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load subscription details."));
    }
  };

  const openAction = (action) => {
    setActiveAction(action);
    setActionForm({
      planId: action.key === "change_plan" ? String(selected?.plan_id || "") : "",
      billingCycle: selected?.billing_cycle || "MONTHLY",
      days: "",
      remarks: "",
    });
    if (action.key === "change_plan") loadLookups();
    setDrawerMode("ACTION");
  };

  const runAction = async () => {
    const id = selected.id;
    const { planId, billingCycle, days, remarks } = actionForm;
    switch (activeAction.key) {
      case "change_plan":
        return SubscriptionAPI.changePlan(id, planId, billingCycle, remarks);
      case "renew":
        return SubscriptionAPI.renew(id, remarks);
      case "extend":
        return SubscriptionAPI.extend(id, Number(days), remarks);
      case "suspend":
        return SubscriptionAPI.suspend(id, remarks);
      case "reactivate":
        return SubscriptionAPI.reactivate(id, remarks);
      case "cancel":
        return SubscriptionAPI.cancel(id, remarks);
      default:
        return null;
    }
  };

  const executeAction = async () => {
    setIsSubmitting(true);
    try {
      const response = await runAction();
      handleActionResponse(response, `${activeAction.label} done.`);
      await loadDetail(selected.id);
      fetchSubscriptions();
      setActiveAction(null);
      setDrawerMode("DETAIL");
    } catch (error) {
      console.error(error);
      showErrorToast("Error", getErrorMessage(error, `Failed to ${activeAction.label.toLowerCase()}.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionSubmit = (e) => {
    e.preventDefault();
    const { key, label, remarksRequired } = activeAction;

    if (key === "change_plan") {
      if (!actionForm.planId) return showWarningToast("Warning", "Select a plan.");
      if (String(actionForm.planId) === String(selected.plan_id) && actionForm.billingCycle === selected.billing_cycle)
        return showWarningToast("Warning", "That's already the current plan and cycle.");
    }
    if (key === "extend") {
      const d = Number(actionForm.days);
      if (!Number.isInteger(d) || d < 1 || d > 365)
        return showWarningToast("Warning", "Days must be a whole number from 1 to 365.");
    }
    if (remarksRequired && !actionForm.remarks.trim())
      return showWarningToast("Warning", "Remarks are required for this action.");

    showActionToast({
      title: `${label}?`,
      description: `${label} ${selected.ref} (${selected.tenant_code}). ${ACTION_HELP[key]}`,
      button: { title: label, onClick: () => executeAction() },
    });
  };

  const allowedActions = selected ? ACTIONS.filter((a) => a.allowed.includes(selected.status)) : [];

  /* =======================
     TABLE
  ======================= */
  const dropdownItems = [{ key: "add-new", label: "New Subscription" }];
  const handleDropdownClick = ({ key }) => {
    if (key === "add-new") openNew();
  };

  const data = visible.map((s) => ({
    id: s.id,
    ref: s.ref,
    tenant_code: s.tenant_code,
    company_name: s.company_name,
    plan: isTrue(s.is_trial) ? `${s.plan_code} (trial)` : s.plan_code,
    cycle: s.billing_cycle,
    price: peso(s.price),
    period: `${s.start_date} → ${s.end_date}`,
    status: s.status,
    actions: "",
  }));

  const inGrace =
    selected?.status === "ACTIVE" && selected?.end_date && selected.end_date < todayLocal();

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Subscriptions</h2>
          <p className="text-sm text-gray-500">Client plans, billing periods, and status</p>
        </div>
        <button type="button" onClick={fetchSubscriptions} className={btnSecondary}>
          <FaSync /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              statusFilter === s
                ? "bg-main text-[var(--main-text-color)] border-transparent"
                : "border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:border-main"
            }`}
          >
            {s} {counts[s] ? `(${counts[s]})` : ""}
          </button>
        ))}
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
        title={
          drawerMode === "NEW"
            ? "New Subscription"
            : drawerMode === "ACTION"
              ? `${activeAction?.label} · ${selected?.ref}`
              : `Subscription · ${selected?.ref || ""}`
        }
        width={540}
      >
        {/* ---------- NEW ---------- */}
        {drawerMode === "NEW" && (
          <form className="space-y-4 h-full flex flex-col" onSubmit={handleCreate}>
            <FloatingSelect
              id="newAccount"
              label="Client Account"
              value={newForm.accountId}
              onChange={(e) => setNewForm((f) => ({ ...f, accountId: e.target.value }))}
              options={accountOptions}
            />
            {accountOptions.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 -mt-2">
                No active client accounts. Add or verify one under Clients first.
              </p>
            )}

            <FloatingSelect
              id="newPlan"
              label="Plan"
              value={newForm.planId}
              onChange={(e) => setNewForm((f) => ({ ...f, planId: e.target.value, isTrial: false }))}
              options={planOptions}
            />

            <div className="grid grid-cols-2 gap-4">
              <FloatingSelect
                id="newCycle"
                label="Billing Cycle"
                value={newForm.billingCycle}
                onChange={(e) => setNewForm((f) => ({ ...f, billingCycle: e.target.value }))}
                options={CYCLE_OPTIONS}
              />
              <FloatingInput
                id="newStart"
                label="Start Date"
                type="date"
                value={newForm.startDate}
                onChange={(e) => setNewForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>

            {trialAvailable && (
              <Section title={`Trial (${newPlan.trial_days} days)`}>
                <ToggleStatusButton
                  value={newForm.isTrial}
                  onChange={(val) => setNewForm((f) => ({ ...f, isTrial: val }))}
                  statusOptions={[
                    { label: "TRIAL", value: true },
                    { label: "PAID", value: false },
                  ]}
                />
                <p className="text-[11px] text-gray-500 -mt-2">One trial per client. No grace period on trials.</p>
              </Section>
            )}

            <FloatingInput
              id="newRemarks"
              label="Remarks (optional)"
              value={newForm.remarks}
              onChange={(e) => setNewForm((f) => ({ ...f, remarks: e.target.value }))}
            />

            {newPlan && newForm.startDate && (
              <Section title="Summary">
                <InfoRow label="Price locked in" value={newForm.isTrial && trialAvailable ? "Free trial" : peso(newPrice)} />
                <InfoRow label="Covers" value={`${newForm.startDate} → ${newEndDate}`} />
                <InfoRow label="Status" value={newForm.isTrial && trialAvailable ? "TRIAL" : "ACTIVE"} />
              </Section>
            )}

            <div className="flex gap-2 rounded-lg bg-main/10 text-gray-700 dark:text-gray-200 text-[13px] px-3 py-2">
              <FaInfoCircle className="mt-0.5 shrink-0 text-main" />
              Creating the subscription queues the ERP setup for this tenant automatically.
            </div>

            <div className="pt-4 mt-auto">
              <DrawerActions onCancel={closeDrawer} isEditing={false} isLoading={isSubmitting} />
            </div>
          </form>
        )}

        {/* ---------- DETAIL ---------- */}
        {drawerMode === "DETAIL" && selected && (
          <div className="space-y-4">
            <Section title="Subscription">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{selected.company_name}</div>
                  <div className="text-xs text-gray-500">
                    {selected.tenant_code} · {selected.ref}
                  </div>
                </div>
                <StatusPill status={selected.status} />
              </div>
              <InfoRow
                label="Plan"
                value={`${selected.plan_code} · ${selected.plan_name}${isTrue(selected.is_trial) ? " (trial)" : ""}`}
              />
              <InfoRow label="Billing" value={`${selected.billing_cycle} · ${peso(selected.price)}`} />
              <InfoRow label="Period" value={`${selected.start_date} → ${selected.end_date}`} />
              <InfoRow label="Grace until" value={isTrue(selected.is_trial) ? "No grace (trial)" : selected.grace_end_date} />
              {selected.cancel_reason && <InfoRow label="Cancel reason" value={selected.cancel_reason} />}
              {inGrace && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Past the end date; in grace until {selected.grace_end_date}. Renew to keep the ERP running.
                </p>
              )}
            </Section>

            <Section title="Actions">
              {allowedActions.length === 0 ? (
                <p className="text-sm text-gray-500">No actions for a {selected.status.toLowerCase()} subscription.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowedActions.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => openAction(a)}
                      className={a.danger ? btnDanger : btnSecondary}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            <Section title="History">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No history yet.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="border-l-2 border-main/40 pl-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{h.action}</span>
                        <span className="text-[11px] text-gray-500">{String(h.create_date || "").slice(0, 16)}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {h.from_status ? `${h.from_status} → ` : ""}
                        {h.to_status}
                        {h.from_plan_code && h.to_plan_code && h.from_plan_code !== h.to_plan_code
                          ? ` · ${h.from_plan_code} → ${h.to_plan_code}`
                          : ""}
                        {h.from_end_date && h.to_end_date && h.from_end_date !== h.to_end_date
                          ? ` · ends ${h.from_end_date} → ${h.to_end_date}`
                          : ""}
                      </div>
                      {h.remarks && <div className="text-xs text-gray-500 italic">"{h.remarks}"</div>}
                      <div className="text-[11px] text-gray-400">by {h.create_by}</div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}

        {/* ---------- ACTION ---------- */}
        {drawerMode === "ACTION" && selected && activeAction && (
          <form className="space-y-4 h-full flex flex-col" onSubmit={handleActionSubmit}>
            <button
              type="button"
              onClick={() => setDrawerMode("DETAIL")}
              className="text-sm text-gray-500 hover:text-main flex items-center gap-2 self-start"
            >
              <FaArrowLeft /> Back to details
            </button>

            <div className="flex gap-2 rounded-lg bg-main/10 text-gray-700 dark:text-gray-200 text-[13px] px-3 py-2">
              <FaInfoCircle className="mt-0.5 shrink-0 text-main" />
              {ACTION_HELP[activeAction.key]}
            </div>

            {activeAction.key === "change_plan" && (
              <>
                <FloatingSelect
                  id="actionPlan"
                  label="New Plan"
                  value={actionForm.planId}
                  onChange={(e) => setActionForm((f) => ({ ...f, planId: e.target.value }))}
                  options={planOptions}
                />
                <FloatingSelect
                  id="actionCycle"
                  label="Billing Cycle"
                  value={actionForm.billingCycle}
                  onChange={(e) => setActionForm((f) => ({ ...f, billingCycle: e.target.value }))}
                  options={CYCLE_OPTIONS}
                />
              </>
            )}

            {activeAction.key === "extend" && (
              <>
                <FloatingInput
                  id="actionDays"
                  label="Extra days (1–365)"
                  type="number"
                  value={actionForm.days}
                  onChange={(e) => setActionForm((f) => ({ ...f, days: e.target.value }))}
                />
                {Number(actionForm.days) > 0 && (
                  <p className="text-xs text-gray-500 -mt-2">
                    New end date: {addDays(selected.end_date, Number(actionForm.days))}
                  </p>
                )}
              </>
            )}

            {activeAction.key === "renew" && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                New end date:{" "}
                <strong>
                  {periodEnd(
                    [addDays(selected.end_date, 1), todayLocal()].sort().pop(),
                    selected.billing_cycle
                  )}
                </strong>
              </p>
            )}

            <FloatingInput
              id="actionRemarks"
              label={activeAction.remarksRequired ? "Remarks (required)" : "Remarks (optional)"}
              value={actionForm.remarks}
              onChange={(e) => setActionForm((f) => ({ ...f, remarks: e.target.value }))}
            />

            <div className="pt-4 mt-auto flex justify-between gap-3">
              <button type="button" onClick={() => setDrawerMode("DETAIL")} disabled={isSubmitting} className={btnSecondary}>
                Back
              </button>
              <button type="submit" disabled={isSubmitting} className={activeAction.danger ? btnDanger : btnPrimary}>
                {isSubmitting ? "Working..." : activeAction.label}
              </button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};

export default SubscriptionList;
