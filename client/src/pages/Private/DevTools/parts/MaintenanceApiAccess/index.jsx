import React, { useEffect, useMemo, useState } from "react";
import { LuSaveAll, LuUndo2, LuRefreshCw } from "react-icons/lu";
import { TbSearch, TbLock, TbShieldLock, TbCopy } from "react-icons/tb";
import NormalModal from "../../../../../components/Modals/NormalModal";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import MaintenanceApiAccessAPI from "../../../../../api/private/dev_tools/maintenanceApiAccessAPI";

const btnBase =
  "rounded-md flex items-center justify-center gap-2 text-sm transition-colors disabled:cursor-not-allowed";
const btnPrimary = `${btnBase} px-5 py-2 font-medium bg-[var(--main-color)] text-[var(--main-text-color)] hover:bg-[var(--main-hover-color)] disabled:bg-gray-300 disabled:text-gray-500`;
const btnSecondary = `${btnBase} px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50`;
const fieldClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[var(--main-color)]";

// 4xx = warning (validation), anything else = error
const handleApiError = (error, fallback) => {
  console.error(error);
  const status = error?.response?.status;
  const msg = error?.response?.data?.message || error?.response?.data?.msg || fallback;
  if (status >= 400 && status < 500) showWarningToast(msg);
  else showErrorToast(msg);
};

const cellKey = (apiId, accessId) => `${apiId}:${accessId}`;
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const checkboxClass = "w-4 h-4 cursor-pointer accent-[var(--main-color)]";

// Ticks an "All" box half-way when only some of its boxes are ticked
const setIndeterminate = (checked, total) => (el) => {
  if (el) el.indeterminate = checked > 0 && checked < total;
};

const Stat = ({ label, value, hint }) => (
  <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-0.5 text-xl font-semibold text-gray-800 dark:text-gray-100 leading-tight">{value}</p>
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

const SkeletonGrid = () => (
  <div className="rounded-xl border border-gray-200 dark:border-slate-800 p-4 space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-9 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse" />
    ))}
  </div>
);

const EmptyState = ({ title, text, action }) => (
  <div className="py-14 text-center rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
    <p className="font-semibold text-gray-700 dark:text-gray-200">{title}</p>
    {text && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{text}</p>}
    {action}
  </div>
);

// Which roles may use each dashboard data source. System roles can always
// use everything, so they aren't listed.
const MaintenanceApiAccess = () => {
  const [apis, setApis] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allowed, setAllowed] = useState(new Set());
  const [original, setOriginal] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copyTo, setCopyTo] = useState("");
  const [copyMode, setCopyMode] = useState("REPLACE");

  const fetchAccess = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await MaintenanceApiAccessAPI.loadAccess();
      const grants = new Set((data?.grants || []).map((g) => cellKey(g.apiId, g.accessId)));
      setApis(data?.apis || []);
      setRoles(data?.roles || []);
      setAllowed(grants);
      setOriginal(new Set(grants));
    } catch (error) {
      setApis([]);
      setRoles([]);
      setAllowed(new Set());
      setOriginal(new Set());
      setLoadError(
        error?.response?.data?.msg ||
          error?.response?.data?.message ||
          "Couldn't load data source access."
      );
      handleApiError(error, "Failed to load data source access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccess();
  }, []);

  const roleName = (id) => roles.find((r) => Number(r.id) === Number(id))?.name || `Role ${id}`;

  // Data sources whose role list changed, with the new list for each
  const changedApis = useMemo(
    () =>
      apis
        .map((api) => {
          const now = new Set(roles.filter((r) => allowed.has(cellKey(api.id, r.id))).map((r) => r.id));
          const before = new Set(roles.filter((r) => original.has(cellKey(api.id, r.id))).map((r) => r.id));
          return sameSet(now, before) ? null : { api, accessIds: [...now], before };
        })
        .filter(Boolean),
    [apis, roles, allowed, original]
  );

  const changeCount = useMemo(() => {
    let n = 0;
    allowed.forEach((k) => !original.has(k) && n++);
    original.forEach((k) => !allowed.has(k) && n++);
    return n;
  }, [allowed, original]);

  const visibleApis = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return apis;
    return apis.filter((api) =>
      [api.name, api.apiName].some((v) => String(v || "").toLowerCase().includes(term))
    );
  }, [apis, search]);

  const activeCount = apis.filter((a) => a.status === "ACTIVE").length;

  // How many data sources each role has right now (unsaved edits included), for the copy picker
  const countFor = (accessId) => apis.filter((api) => allowed.has(cellKey(api.id, accessId))).length;

  const update = (mutate) =>
    setAllowed((prev) => {
      const next = new Set(prev);
      mutate(next);
      return next;
    });

  const toggleCell = (apiId, accessId, checked) =>
    update((next) => (checked ? next.add(cellKey(apiId, accessId)) : next.delete(cellKey(apiId, accessId))));

  // "All" on a row: every role
  const toggleRow = (apiId, checked) =>
    update((next) =>
      roles.forEach((r) => (checked ? next.add(cellKey(apiId, r.id)) : next.delete(cellKey(apiId, r.id))))
    );

  // "All" under a role: every data source shown (respects the search)
  const toggleColumn = (accessId, checked) =>
    update((next) =>
      visibleApis.forEach((api) =>
        checked ? next.add(cellKey(api.id, accessId)) : next.delete(cellKey(api.id, accessId))
      )
    );

  const openCopy = () => {
    setCopyFrom("");
    setCopyTo("");
    setCopyMode("REPLACE");
    setCopyOpen(true);
  };

  // Copies one role's data sources onto another in the grid (all data sources, not just
  // the searched ones). Nothing is saved until "Save access", so the copy can be reviewed.
  const handleApplyCopy = () => {
    const fromId = Number(copyFrom);
    const toId = Number(copyTo);

    if (!fromId || !toId) return showWarningToast("Choose both roles.");
    if (fromId === toId) return showWarningToast("Choose two different roles.");

    const sourceApiIds = apis.filter((api) => allowed.has(cellKey(api.id, fromId))).map((api) => api.id);
    if (sourceApiIds.length === 0) {
      return showWarningToast(`${roleName(fromId)} has no data sources to copy.`);
    }

    update((next) => {
      if (copyMode === "REPLACE") apis.forEach((api) => next.delete(cellKey(api.id, toId)));
      sourceApiIds.forEach((apiId) => next.add(cellKey(apiId, toId)));
    });

    setCopyOpen(false);
    showSuccessToast(
      `${roleName(fromId)}'s access ${copyMode === "REPLACE" ? "copied to" : "added to"} ${roleName(
        toId
      )}. Review the highlighted boxes, then click Save access.`
    );
  };

  const handleSaveClick = () => {
    if (changedApis.length === 0) return showWarningToast("There are no changes to save.");
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    let saved = 0;
    try {
      for (const change of changedApis) {
        await MaintenanceApiAccessAPI.editAccess(change.api.id, change.accessIds);
        saved += 1;
      }
      showSuccessToast(`Access saved for ${saved} data source${saved === 1 ? "" : "s"}.`);
      setConfirmOpen(false);
      await fetchAccess();
    } catch (error) {
      handleApiError(
        error,
        saved > 0
          ? `Saved ${saved} of ${changedApis.length}. The rest failed; review and save again.`
          : "Failed to save data source access"
      );
      if (saved > 0) {
        setConfirmOpen(false);
        await fetchAccess();
      }
    } finally {
      setSaving(false);
    }
  };

  const renderBody = () => {
    if (loading) return <SkeletonGrid />;

    if (loadError) {
      return (
        <EmptyState
          title="Couldn't load data source access"
          text={loadError}
          action={
            <button type="button" onClick={fetchAccess} className={`${btnSecondary} mx-auto mt-3`}>
              <LuRefreshCw /> Try again
            </button>
          }
        />
      );
    }

    if (apis.length === 0) {
      return (
        <EmptyState
          title="No data sources yet"
          text='Open Maintenance API and click "Sync Data Sources" to add data sources.'
        />
      );
    }

    if (roles.length === 0) {
      return (
        <EmptyState
          title="No roles to grant"
          text="Create a role on the Access page first. System roles always have access."
        />
      );
    }

    if (visibleApis.length === 0) {
      return <EmptyState title="No data sources match" text={`Nothing matches "${search}".`} />;
    }

    return (
      <div className="overflow-auto max-h-[calc(100vh-24rem)] rounded-xl border border-gray-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="text-left px-4 py-3 font-semibold sticky left-0 z-30 bg-gray-50 dark:bg-slate-800 min-w-[260px] text-gray-700 dark:text-gray-200">
                Data source
              </th>
              <th className="px-3 py-3 font-semibold text-center w-16 text-gray-700 dark:text-gray-200">All</th>
              {roles.map((role) => {
                const checked = visibleApis.filter((api) => allowed.has(cellKey(api.id, role.id))).length;
                return (
                  <th key={role.id} className="px-3 py-2 text-center align-bottom min-w-[110px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-xs whitespace-nowrap text-gray-700 dark:text-gray-200">
                        {role.name}
                      </span>
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={checked > 0 && checked === visibleApis.length}
                        ref={setIndeterminate(checked, visibleApis.length)}
                        onChange={(e) => toggleColumn(role.id, e.target.checked)}
                        title={`All shown data sources for ${role.name}`}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {visibleApis.map((api) => {
              const checked = roles.filter((r) => allowed.has(cellKey(api.id, r.id))).length;
              return (
                <tr key={api.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{api.name}</span>
                      {api.status !== "ACTIVE" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">{api.apiName}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={checked > 0 && checked === roles.length}
                      ref={setIndeterminate(checked, roles.length)}
                      onChange={(e) => toggleRow(api.id, e.target.checked)}
                      title={`All roles for ${api.name}`}
                    />
                  </td>
                  {roles.map((role) => {
                    const key = cellKey(api.id, role.id);
                    const changed = allowed.has(key) !== original.has(key);
                    return (
                      <td
                        key={role.id}
                        className={`px-3 py-2 text-center ${changed ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className={checkboxClass}
                          checked={allowed.has(key)}
                          onChange={(e) => toggleCell(api.id, role.id, e.target.checked)}
                          aria-label={`${role.name} can use ${api.name}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "color-mix(in srgb, var(--main-color) 14%, transparent)",
              color: "var(--main-color)",
            }}
          >
            <TbShieldLock size={22} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Data Source Access</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
              Choose which roles can use each dashboard data source. Roles without access don't see it
              in the widget picker, and widgets using it show "no access".
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAccess}
          disabled={loading || saving}
          className={btnSecondary}
          title="Reload"
        >
          <LuRefreshCw className={loading ? "animate-spin" : ""} /> Reload
        </button>
      </div>

      {/* Summary */}
      {!loading && !loadError && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Stat
            label="Data sources"
            value={activeCount}
            hint={apis.length > activeCount ? `${apis.length - activeCount} inactive` : "all active"}
          />
          <Stat label="Roles" value={roles.length} hint="excluding system roles" />
          <Stat label="Access given" value={original.size} hint="role × data source" />
        </div>
      )}

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex-1 min-w-[220px] max-w-sm">
          <TbSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search data sources"
            aria-label="Search data sources"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[var(--main-color)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <TbLock size={14} /> System roles always have access
          </span>
          <button
            type="button"
            onClick={openCopy}
            disabled={loading || saving || !!loadError || roles.length < 2 || apis.length === 0}
            className={btnSecondary}
          >
            <TbCopy /> Copy access
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-4">{renderBody()}</div>

      {/* Save bar */}
      {changeCount > 0 && (
        <div className="sticky bottom-0 mt-4 -mx-5 -mb-5 px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-b-2xl">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">{changeCount}</span> unsaved change
            {changeCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllowed(new Set(original))}
              disabled={saving}
              className={btnSecondary}
            >
              <LuUndo2 /> Reset
            </button>
            <button type="button" onClick={handleSaveClick} disabled={saving} className={btnPrimary}>
              <LuSaveAll /> {saving ? "Saving..." : "Save access"}
            </button>
          </div>
        </div>
      )}

      {/* Copy access */}
      <NormalModal
        open={copyOpen}
        title="Copy Data Source Access"
        confirmText="Copy"
        cancelText="Cancel"
        onConfirm={handleApplyCopy}
        onCancel={() => setCopyOpen(false)}
        width={480}
      >
        <div className="space-y-4 text-sm dark:text-gray-300">
          <label className="block">
            <span className="block mb-1 font-medium">Copy from</span>
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={fieldClass}>
              <option value="">Choose a role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({countFor(r.id)} data source{countFor(r.id) === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block mb-1 font-medium">Copy to</span>
            <select value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className={fieldClass}>
              <option value="">Choose a role</option>
              {roles
                .filter((r) => String(r.id) !== String(copyFrom))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({countFor(r.id)} data source{countFor(r.id) === 1 ? "" : "s"})
                  </option>
                ))}
            </select>
          </label>

          <div>
            <span className="block mb-1 font-medium">How</span>
            <label className="flex items-start gap-2 cursor-pointer mb-1">
              <input
                type="radio"
                name="copyMode"
                className="mt-0.5 accent-[var(--main-color)]"
                checked={copyMode === "REPLACE"}
                onChange={() => setCopyMode("REPLACE")}
              />
              <span>Replace: the target gets exactly the same data sources</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="copyMode"
                className="mt-0.5 accent-[var(--main-color)]"
                checked={copyMode === "MERGE"}
                onChange={() => setCopyMode("MERGE")}
              />
              <span>Merge: the target keeps its own and gains the source's</span>
            </label>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nothing is saved until you click Save access.
          </p>
        </div>
      </NormalModal>

      {/* Save confirm */}
      <NormalModal
        open={confirmOpen}
        title="Save Data Source Access"
        confirmText="Yes, Save Access"
        cancelText="Go Back"
        onConfirm={handleConfirmSave}
        onCancel={() => !saving && setConfirmOpen(false)}
        loading={saving}
        width={560}
      >
        <p className="text-sm mb-3 dark:text-gray-300">
          You're about to change access for{" "}
          <span className="font-semibold">{changedApis.length}</span> data source
          {changedApis.length === 1 ? "" : "s"}:
        </p>
        <ul className="max-h-64 overflow-y-auto text-sm border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
          {changedApis.map(({ api, accessIds, before }) => {
            const added = accessIds.filter((id) => !before.has(id));
            const removed = [...before].filter((id) => !accessIds.includes(id));
            return (
              <li key={api.id} className="px-3 py-2">
                <p className="font-medium dark:text-gray-100">{api.name}</p>
                {added.length > 0 && (
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Granted: {added.map(roleName).join(", ")}
                  </p>
                )}
                {removed.length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Removed: {removed.map(roleName).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </NormalModal>
    </div>
  );
};

export default MaintenanceApiAccess;