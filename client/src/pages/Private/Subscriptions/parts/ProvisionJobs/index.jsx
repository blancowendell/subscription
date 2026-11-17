import React, { useState, useEffect } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/AntdDrawer/index";
import { FaSync, FaPlay, FaRedo, FaBan, FaHourglassEnd, FaCopy } from "react-icons/fa";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showActionToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import ProvisionJobAPI from "../../../../../api/private/subscription/provisionJobAPI";
import SubscriptionAPI from "../../../../../api/private/subscription/subscriptionAPI";

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

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "PENDING" },
  { value: "PROCESSING", label: "PROCESSING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
  { value: "CANCELLED", label: "CANCELLED" },
];

const ACTION_OPTIONS = [
  { value: "SYNC", label: "SYNC · push plan, features and dates" },
  { value: "PROVISION", label: "PROVISION · create the tenant" },
  { value: "SUSPEND", label: "SUSPEND · block the tenant" },
  { value: "REACTIVATE", label: "REACTIVATE · unblock the tenant" },
  { value: "ARCHIVE", label: "ARCHIVE · retire the tenant" },
];

const STATUS_STYLE = {
  PENDING: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  CANCELLED: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
};

const shortDate = (v) => (v ? String(v).replace("T", " ").slice(0, 16) : "—");

// JSON columns can come back as objects or strings
const pretty = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  try {
    const obj = typeof value === "string" ? JSON.parse(value) : value;
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(value);
  }
};

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    showSuccessToast("Copied to clipboard");
  } catch {
    showWarningToast("Warning", "Couldn't copy. Select and copy it manually.");
  }
};

// ---------- Small UI pieces (outside the page so inputs keep focus) ----------
const StatusPill = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.CANCELLED}`}>
    {status}
  </span>
);

const Section = ({ title, children, right }) => (
  <div className="bg-slate-500/5 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-3">
    <div className="flex items-center justify-between">
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</label>
      {right}
    </div>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-right break-all">{value ?? "—"}</span>
  </div>
);

const JsonBlock = ({ value }) => (
  <pre className="text-[11px] leading-snug bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto max-h-72 whitespace-pre">
    {pretty(value)}
  </pre>
);

const ProvisionJobs = () => {
  const headers = ["Job", "Tenant", "Action", "Status", "Attempts", "Last Error", "Next Retry", "Created", "Actions"];
  const keys = ["job", "tenant_code", "action", "status", "attempts", "last_error", "next_retry", "created", "actions"];
  const tableOptions = { withEdit: true };

  const [jobs, setJobs] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Drawer: DETAIL | QUEUE
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("DETAIL");
  const [selected, setSelected] = useState(null);
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual queue
  const [subscriptions, setSubscriptions] = useState([]);
  const [queueForm, setQueueForm] = useState({ subscriptionId: "", action: "SYNC" });

  const subscriptionOptions = subscriptions.map((s) => ({
    value: String(s.id),
    label: `${s.tenant_code} · ${s.ref} · ${s.plan_code} (${s.status})`,
  }));

  /* =======================
     FETCHERS
  ======================= */
  const fetchJobs = async (status = statusFilter, tenantCode = tenantFilter) => {
    setIsTableLoading(true);
    try {
      const data = await ProvisionJobAPI.loadJobs({ status, tenantCode: tenantCode.trim() });
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load provision jobs."));
    } finally {
      setIsTableLoading(false);
    }
  };

  const loadDetail = async (id) => {
    const [job] = await ProvisionJobAPI.getJob(id);
    setSelected(job || null);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelected(null);
    setCancelRemarks("");
  };

  /* =======================
     TOOLBAR ACTIONS
  ======================= */
  const handleRunDue = async () => {
    setIsRunning(true);
    try {
      const results = await ProvisionJobAPI.runDue();
      const list = Array.isArray(results) ? results : [];
      const ok = list.filter((r) => r.success).length;
      const failed = list.filter((r) => r.success === false).length;
      const skipped = list.filter((r) => r.skipped).length;
      showSuccessToast("Run complete", `${list.length} due · ${ok} succeeded · ${failed} failed · ${skipped} waiting`);
      fetchJobs();
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to run due jobs."));
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunExpiry = () =>
    showActionToast({
      title: "Run expiry check?",
      description: "Expires trials past their end date and paid plans past their grace date, and queues SUSPEND for each.",
      button: {
        title: "Run",
        onClick: async () => {
          try {
            const result = await ProvisionJobAPI.runExpiry();
            showSuccessToast("Expiry check done", `${result?.expired || 0} subscription(s) expired.`);
            fetchJobs();
          } catch (error) {
            showErrorToast("Error", getErrorMessage(error, "Failed to run the expiry check."));
          }
        },
      },
    });

  /* =======================
     DETAIL
  ======================= */
  const handleEditClick = async (row) => {
    try {
      await loadDetail(row.id);
      setCancelRemarks("");
      setDrawerMode("DETAIL");
      setIsDrawerOpen(true);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load job details."));
    }
  };

  const handleRetry = () =>
    showActionToast({
      title: "Retry job?",
      description: `Reset attempts and run job #${selected.id} (${selected.action} ${selected.tenant_code}) now?`,
      button: {
        title: "Retry",
        onClick: async () => {
          setIsSubmitting(true);
          try {
            const response = await ProvisionJobAPI.retryJob(selected.id);
            const result = response?.data || {};
            if (result.success) showSuccessToast("Job succeeded.");
            else if (result.skipped) showWarningToast("Waiting", result.reason || "Waiting for an earlier job.");
            else showErrorToast("Still failing", result.error || "The ERP call failed again.");
            await loadDetail(selected.id);
            fetchJobs();
          } catch (error) {
            showErrorToast("Error", getErrorMessage(error, "Failed to retry job."));
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    });

  const handleCancel = () => {
    if (!cancelRemarks.trim()) return showWarningToast("Warning", "A reason is required when cancelling.");
    showActionToast({
      title: "Cancel job?",
      description: `Job #${selected.id} won't run. Later jobs for ${selected.tenant_code} will be unblocked.`,
      button: {
        title: "Cancel job",
        onClick: async () => {
          setIsSubmitting(true);
          try {
            await ProvisionJobAPI.cancelJob(selected.id, cancelRemarks.trim());
            showSuccessToast("Job cancelled.");
            await loadDetail(selected.id);
            setCancelRemarks("");
            fetchJobs();
          } catch (error) {
            showErrorToast("Error", getErrorMessage(error, "Failed to cancel job."));
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    });
  };

  /* =======================
     MANUAL QUEUE
  ======================= */
  const openQueue = async () => {
    setQueueForm({ subscriptionId: "", action: "SYNC" });
    setDrawerMode("QUEUE");
    setIsDrawerOpen(true);
    try {
      const data = await SubscriptionAPI.loadSubscriptions();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load subscriptions."));
    }
  };

  const handleQueue = (e) => {
    e.preventDefault();
    if (!queueForm.subscriptionId) return showWarningToast("Warning", "Select a subscription.");
    const sub = subscriptions.find((s) => String(s.id) === String(queueForm.subscriptionId));

    showActionToast({
      title: `Queue ${queueForm.action}?`,
      description: `Send ${queueForm.action} for ${sub?.tenant_code} (${sub?.ref}) to the ERP now?`,
      button: {
        title: "Queue",
        onClick: async () => {
          setIsSubmitting(true);
          try {
            const result = await ProvisionJobAPI.queueJob(queueForm.subscriptionId, queueForm.action);
            showSuccessToast(`Job #${result?.id || ""} queued.`);
            fetchJobs();
            closeDrawer();
          } catch (error) {
            showErrorToast("Error", getErrorMessage(error, "Failed to queue job."));
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    });
  };

  /* =======================
     TABLE
  ======================= */
  const dropdownItems = [{ key: "queue", label: "Queue Job Manually" }];
  const handleDropdownClick = ({ key }) => {
    if (key === "queue") openQueue();
  };

  const data = jobs.map((j) => ({
    id: j.id,
    job: `#${j.id}`,
    tenant_code: j.tenant_code,
    action: j.action,
    status: j.status,
    attempts: j.attempts,
    last_error: j.last_error ? String(j.last_error).slice(0, 60) + (String(j.last_error).length > 60 ? "…" : "") : "",
    next_retry: j.status === "PENDING" && j.next_retry_at ? shortDate(j.next_retry_at) : "",
    created: shortDate(j.create_date),
    actions: "",
  }));

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Provision Jobs</h2>
          <p className="text-sm text-gray-500">Every change sent to the ERP, with retries and errors</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleRunDue} disabled={isRunning} className={btnSecondary}>
            <FaPlay /> {isRunning ? "Running..." : "Run due jobs"}
          </button>
          <button type="button" onClick={handleRunExpiry} className={btnSecondary}>
            <FaHourglassEnd /> Run expiry check
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="w-48">
          <FloatingSelect
            id="jobStatusFilter"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchJobs(e.target.value, tenantFilter);
            }}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="w-48">
          <FloatingInput
            id="jobTenantFilter"
            label="Tenant code"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value.toUpperCase())}
          />
        </div>
        <button type="button" onClick={() => fetchJobs()} className={btnSecondary}>
          <FaSync /> Apply
        </button>
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
        title={drawerMode === "QUEUE" ? "Queue Job Manually" : `Provision Job · #${selected?.id || ""}`}
        width={620}
      >
        {/* ---------- DETAIL ---------- */}
        {drawerMode === "DETAIL" && selected && (
          <div className="space-y-4">
            <Section title="Job" right={<StatusPill status={selected.status} />}>
              <InfoRow label="Tenant" value={`${selected.tenant_code} · ${selected.company_name}`} />
              <InfoRow label="Subscription" value={selected.subscription_ref} />
              <InfoRow label="Action" value={selected.action} />
              <InfoRow label="Attempts" value={selected.attempts} />
              <InfoRow label="Next retry" value={selected.status === "PENDING" ? shortDate(selected.next_retry_at) : "—"} />
              <InfoRow label="Completed" value={shortDate(selected.completed_at)} />
              <InfoRow label="Created" value={`${shortDate(selected.create_date)} by ${selected.create_by}`} />
              <InfoRow
                label="Updated"
                value={selected.update_date ? `${shortDate(selected.update_date)} by ${selected.update_by}` : "—"}
              />
            </Section>

            {selected.last_error && (
              <Section title="Last Error">
                <p className="text-sm text-red-600 dark:text-red-400 break-words m-0">{selected.last_error}</p>
              </Section>
            )}

            {(selected.status === "FAILED" || selected.status === "PENDING") && (
              <Section title="Actions">
                {selected.status === "FAILED" && (
                  <button type="button" onClick={handleRetry} disabled={isSubmitting} className={btnPrimary}>
                    <FaRedo /> Retry now
                  </button>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FloatingInput
                      id="jobCancelRemarks"
                      label="Reason to cancel"
                      value={cancelRemarks}
                      onChange={(e) => setCancelRemarks(e.target.value)}
                    />
                  </div>
                  <button type="button" onClick={handleCancel} disabled={isSubmitting} className={btnDanger}>
                    <FaBan /> Cancel job
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 m-0">
                  A failed or pending job blocks later jobs for the same tenant until it succeeds or is cancelled.
                </p>
              </Section>
            )}

            <Section
              title="Payload sent"
              right={
                <button type="button" onClick={() => copyText(pretty(selected.payload))} className="text-xs text-main flex items-center gap-1">
                  <FaCopy /> Copy
                </button>
              }
            >
              <JsonBlock value={selected.payload} />
            </Section>

            <Section title="ERP response">
              <JsonBlock value={selected.response} />
            </Section>
          </div>
        )}

        {/* ---------- QUEUE ---------- */}
        {drawerMode === "QUEUE" && (
          <form className="space-y-4 h-full flex flex-col" onSubmit={handleQueue}>
            <FloatingSelect
              id="queueSubscription"
              label="Subscription"
              value={queueForm.subscriptionId}
              onChange={(e) => setQueueForm((f) => ({ ...f, subscriptionId: e.target.value }))}
              options={subscriptionOptions}
            />
            <FloatingSelect
              id="queueAction"
              label="Action"
              value={queueForm.action}
              onChange={(e) => setQueueForm((f) => ({ ...f, action: e.target.value }))}
              options={ACTION_OPTIONS}
            />
            <p className="text-[11px] text-gray-500 -mt-2">
              Use this to re-send a change that was never queued, or to resync a tenant after editing its plan.
            </p>

            <div className="pt-4 mt-auto flex justify-between gap-3">
              <button type="button" onClick={closeDrawer} disabled={isSubmitting} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                <FaPlay /> {isSubmitting ? "Queueing..." : "Queue job"}
              </button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};

export default ProvisionJobs;
