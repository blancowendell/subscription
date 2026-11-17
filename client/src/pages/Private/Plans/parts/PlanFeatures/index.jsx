import React, { useState, useEffect, useMemo } from "react";
import { FaSave, FaUndo, FaInfoCircle } from "react-icons/fa";
import FloatingSelect from "../../../../../components/Forms/FloatingSelect";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showActionToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import PlanAPI from "../../../../../api/private/subscription/planAPI";
import FeatureAPI from "../../../../../api/private/subscription/featureAPI";
import PlanFeatureAPI from "../../../../../api/private/subscription/planFeatureAPI";
import ProvisionJobAPI from "../../../../../api/private/subscription/provisionJobAPI";

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

const isActive = (row) => !row?.status || row.status === "ACTIVE";

// selection: { [featureId]: "limit string" }  ("" = unlimited / not a limit)
const toSelection = (rows) =>
  Object.fromEntries(
    (rows || []).map((r) => [String(r.feature_id), r.limit_value === null || r.limit_value === undefined ? "" : String(r.limit_value)])
  );

const sameSelection = (a, b) => {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => k in b && a[k] === b[k]);
};

const PlanFeatures = () => {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const [planId, setPlanId] = useState("");
  const [assigned, setAssigned] = useState([]); // rows from the server for the selected plan
  const [saved, setSaved] = useState({}); // last saved selection
  const [selection, setSelection] = useState({}); // working selection
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeFeatures = useMemo(() => features.filter(isActive), [features]);
  const featureById = useMemo(
    () => Object.fromEntries(features.map((f) => [String(f.id), f])),
    [features]
  );

  // Active features grouped by module for the checklist
  const groups = useMemo(() => {
    const map = new Map();
    activeFeatures.forEach((f) => {
      if (!map.has(f.module)) map.set(f.module, []);
      map.get(f.module).push(f);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activeFeatures]);

  // Assigned features that are now inactive: the backend won't accept them, so they drop on save
  const inactiveAssigned = assigned.filter((r) => r.feature_status && r.feature_status !== "ACTIVE");

  const planOptions = plans.map((p) => ({
    value: String(p.id),
    label: `${p.code} · ${p.name}${isActive(p) ? "" : " (inactive)"}`,
  }));
  const selectedPlan = plans.find((p) => String(p.id) === String(planId));

  const isDirty = !sameSelection(selection, saved) || inactiveAssigned.length > 0;
  const selectedCount = Object.keys(selection).length;

  /* =======================
     INITIAL LOAD & FETCHERS
  ======================= */
  const loadLookups = async () => {
    const [planRes, featureRes] = await Promise.allSettled([PlanAPI.loadPlans(), FeatureAPI.loadFeatures()]);

    const take = (result, label) => {
      if (result.status === "fulfilled") return Array.isArray(result.value) ? result.value : [];
      showErrorToast("Error", getErrorMessage(result.reason, `Failed to load ${label}.`));
      return [];
    };

    setPlans(take(planRes, "plans"));
    setFeatures(take(featureRes, "features"));
    setLookupsLoaded(true);
  };

  const loadPlanFeatures = async (id) => {
    if (!id) {
      setAssigned([]);
      setSaved({});
      setSelection({});
      return;
    }
    setIsLoadingPlan(true);
    try {
      const rows = await PlanFeatureAPI.loadPlanFeatures(id);
      const list = Array.isArray(rows) ? rows : [];
      const active = list.filter((r) => !r.feature_status || r.feature_status === "ACTIVE");
      setAssigned(list);
      setSaved(toSelection(active));
      setSelection(toSelection(active));
    } catch (error) {
      showErrorToast("Error", getErrorMessage(error, "Failed to load the plan's features."));
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  const handlePlanChange = (value) => {
    if (isDirty && planId) {
      showActionToast({
        title: "Discard changes?",
        description: "You have unsaved changes on this plan. Switch plans anyway?",
        button: {
          title: "Switch",
          onClick: () => {
            setPlanId(value);
            loadPlanFeatures(value);
          },
        },
      });
      return;
    }
    setPlanId(value);
    loadPlanFeatures(value);
  };

  /* =======================
     SELECTION
  ======================= */
  const toggleFeature = (id) =>
    setSelection((s) => {
      const key = String(id);
      if (key in s) {
        const { [key]: _removed, ...rest } = s;
        return rest;
      }
      return { ...s, [key]: "" };
    });

  const setLimit = (id, value) => setSelection((s) => ({ ...s, [String(id)]: value }));

  const toggleGroup = (items, on) =>
    setSelection((s) => {
      const next = { ...s };
      items.forEach((f) => {
        const key = String(f.id);
        if (on && !(key in next)) next[key] = "";
        if (!on) delete next[key];
      });
      return next;
    });

  /* =======================
     SAVE
  ======================= */
  const offerSync = (id) =>
    showActionToast({
      title: "Push to tenants?",
      description: "Send the updated features to every client on this plan now?",
      button: {
        title: "Push now",
        onClick: async () => {
          try {
            const result = await ProvisionJobAPI.syncPlan(id);
            showSuccessToast("Queued", `${result?.queued || 0} tenant update(s) queued.`);
          } catch (error) {
            showErrorToast("Error", getErrorMessage(error, "Failed to queue tenant updates."));
          }
        },
      },
    });

  const handleSave = async () => {
    if (!planId) return;

    const payload = [];
    for (const [featureId, limit] of Object.entries(selection)) {
      const feature = featureById[featureId];
      if (!feature) continue;
      if (feature.type === "LIMIT") {
        const trimmed = String(limit).trim();
        if (trimmed !== "" && !(Number.isInteger(Number(trimmed)) && Number(trimmed) >= 0)) {
          showWarningToast("Warning", `Limit for ${feature.code} must be a whole number, 0 or more.`);
          return;
        }
        payload.push({ featureId: Number(featureId), limitValue: trimmed });
      } else {
        payload.push({ featureId: Number(featureId) });
      }
    }

    setIsSaving(true);
    try {
      await PlanFeatureAPI.savePlanFeatures(planId, payload);
      showSuccessToast("Plan features saved!");
      await loadPlanFeatures(planId);
      offerSync(planId);
    } catch (error) {
      console.error(error);
      showErrorToast("Error", getErrorMessage(error, "Failed to save plan features."));
    } finally {
      setIsSaving(false);
    }
  };

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Plan Features</h2>
          <p className="text-sm text-gray-500">Pick the modules and limits each plan includes</p>
        </div>
      </div>

      <div className="max-w-md">
        <FloatingSelect
          id="planFeaturePlan"
          label="Plan"
          value={planId}
          onChange={(e) => handlePlanChange(e.target.value)}
          options={planOptions}
        />
        {lookupsLoaded && plans.length === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            No plans yet. Add one under Plan List first.
          </p>
        )}
      </div>

      {!planId ? (
        <div className="py-16 text-center text-gray-400">Select a plan to manage its features.</div>
      ) : isLoadingPlan ? (
        <div className="py-16 text-center text-gray-400">Loading...</div>
      ) : (
        <>
          {lookupsLoaded && activeFeatures.length === 0 && (
            <div className="py-10 text-center text-gray-400">No active features yet. Add some under Features.</div>
          )}

          {inactiveAssigned.length > 0 && (
            <div className="flex gap-2 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[13px] px-3 py-2">
              <FaInfoCircle className="mt-0.5 shrink-0" />
              <span>
                This plan still has inactive feature(s):{" "}
                <strong>{inactiveAssigned.map((r) => r.feature_code).join(", ")}</strong>. They'll be removed when you save.
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map(([module, items]) => {
              const checkedCount = items.filter((f) => String(f.id) in selection).length;
              const allOn = checkedCount === items.length;

              return (
                <div
                  key={module}
                  className="rounded-xl border border-gray-200 dark:border-slate-800 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{module}</span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(items, !allOn)}
                      className="text-[11px] text-main hover:underline"
                    >
                      {allOn ? "Clear all" : "Select all"}
                    </button>
                  </div>

                  {items.map((f) => {
                    const key = String(f.id);
                    const checked = key in selection;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFeature(f.id)}
                            className="w-4 h-4 accent-[var(--main-color)] shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium truncate">{f.name}</span>
                            <span className="block text-[11px] text-gray-500 truncate">
                              {f.code} · {f.type}
                            </span>
                          </span>
                        </label>

                        {f.type === "LIMIT" && checked && (
                          <input
                            type="number"
                            min="0"
                            value={selection[key]}
                            onChange={(e) => setLimit(f.id, e.target.value)}
                            placeholder="∞"
                            title="Blank = unlimited"
                            className="w-20 px-2 py-1.5 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-right"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800">
            <p className="text-xs text-gray-500 m-0">
              {selectedPlan?.code}: {selectedCount} feature(s) selected. Limits left blank are unlimited.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelection(saved)}
                disabled={!isDirty || isSaving}
                className={btnSecondary}
              >
                <FaUndo /> Reset
              </button>
              <button type="button" onClick={handleSave} disabled={!isDirty || isSaving} className={btnPrimary}>
                <FaSave />
                {isSaving ? "Saving..." : "Save features"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlanFeatures;
