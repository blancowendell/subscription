import React, { useState, useEffect, useMemo } from "react";
import FloatingInput from "../../../../../components/Forms/FloatingInput";
import ToggleStatusButton from "../../../../../components/Buttons/ToggleStatus";
import Table from "../../../../../components/Tables/index";
import Drawer from "../../../../../components/Modals/index";
import NormalModal from "../../../../../components/Modals/NormalModal";
import { TbXboxXFilled, TbDatabaseImport } from "react-icons/tb";
import { LuSaveAll, LuUndo2, LuRefreshCw } from "react-icons/lu";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import MasterPagesAPI from "../../../../../api/private/dev_tools/masterPagesAPI";
import MasterActionsAPI from "../../../../../api/private/dev_tools/masterActionsAPI";
import MasterPageActionsAPI from "../../../../../api/private/dev_tools/masterPageActionsAPI";
import MasterAccessRightsAPI from "../../../../../api/private/dev_tools/masterAccessRightsAPI";
import AccessAPI from "../../../../../api/private/access/accessAPI";
import { collectPages, countPages } from "../../../../../utils/permissions/pageCollector";

const statusOptions = [
  { label: "✅ Active", value: "ACTIVE" },
  { label: "🚫 Inactive", value: "INACTIVE" },
];

const emptyPageForm = {
  code: "",
  name: "",
  parentId: "",
  route: "",
  portalType: "",
  icon: "",
  sortOrder: 0,
  status: "ACTIVE",
  actionIds: [],
};

const emptyActionForm = {
  code: "",
  name: "",
  sortOrder: 0,
  status: "ACTIVE",
};

const TABS = [
  { key: "permissions", label: "Role Permissions" },
  { key: "pages", label: "Pages" },
  { key: "actions", label: "Actions" },
];

const selectClass =
  "w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--main-color)]";

// 4xx = warning (validation/duplicate), anything else = error
const handleApiError = (error, fallback) => {
  console.error(error);
  const status = error?.response?.status;
  const msg = error?.response?.data?.message || error?.response?.data?.msg || fallback;
  if (status >= 400 && status < 500) showWarningToast(msg);
  else showErrorToast(msg);
};

const normalizeCode = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const flattenWithDepth = (nodes, depth = 0, out = []) => {
  (nodes || []).forEach((n) => {
    out.push({ ...n, depth });
    if (n.children && n.children.length) flattenWithDepth(n.children, depth + 1, out);
  });
  return out;
};

const collectDescendantIds = (nodes, targetId) => {
  const ids = new Set();
  const walk = (list, inside) => {
    (list || []).forEach((n) => {
      const isInside = inside || n.id === targetId;
      if (isInside) ids.add(n.id);
      walk(n.children, isInside);
    });
  };
  walk(nodes, false);
  return ids;
};

const toBool = (v) => v === true || v === 1 || v === "1" || v === "true";

const viewActionOf = (page) => (page?.actions || []).find((a) => a.code === "VIEW");

const formatSyncSummary = (s) => {
  if (!s) return "Pages synced.";
  const parts = [];
  if (s.pagesAdded) parts.push(`${s.pagesAdded} page(s) added`);
  if (s.pagesUpdated) parts.push(`${s.pagesUpdated} updated`);
  if (s.pagesDeactivated) parts.push(`${s.pagesDeactivated} deactivated`);
  if (s.actionsAdded) parts.push(`${s.actionsAdded} action(s) added`);
  const paChanges = (s.pageActionsAdded || 0) + (s.pageActionsReactivated || 0) + (s.pageActionsDeactivated || 0);
  if (paChanges) parts.push(`${paChanges} page action change(s)`);
  return parts.length ? `Sync complete: ${parts.join(", ")}.` : "Sync complete: everything is already up to date.";
};

const roleId = (r) => r.id ?? r.ma_id;
const roleName = (r) => r.name ?? r.ma_name;

const RolesPermissions = () => {
  const [activeTab, setActiveTab] = useState("permissions");

  // shared data
  const [pageTree, setPageTree] = useState([]);
  const [actions, setActions] = useState([]);

  // drawer (pages + actions)
  const [drawerType, setDrawerType] = useState(null); // "page" | "action" | null
  const [editingId, setEditingId] = useState(null);
  const [pageForm, setPageForm] = useState(emptyPageForm);
  const [actionForm, setActionForm] = useState(emptyActionForm);
  const [saving, setSaving] = useState(false);

  // permissions
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [accessId, setAccessId] = useState("");
  const [access, setAccess] = useState(null);
  const [matrixRows, setMatrixRows] = useState([]);
  const [allowed, setAllowed] = useState({});
  const [original, setOriginal] = useState({});
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingRights, setSavingRights] = useState(false);

  // page sync
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPayload, setSyncPayload] = useState([]);

  const isEdit = editingId !== null;
  const activeActions = useMemo(() => actions.filter((a) => a.status === "ACTIVE"), [actions]);
  const flatPages = useMemo(() => flattenWithDepth(pageTree), [pageTree]);
  const isReadOnly = toBool(access?.isSystem);

  // Grid columns come from the loaded grid itself
  const matrixActions = useMemo(() => {
    const seen = new Map();
    matrixRows.forEach((p) =>
      (p.actions || []).forEach((a) => {
        if (!seen.has(a.actionId)) seen.set(a.actionId, { id: a.actionId, code: a.code, name: a.name });
      })
    );
    const list = [...seen.values()];
    // View first, the rest in the order the server returned them
    return [...list.filter((a) => a.code === "VIEW"), ...list.filter((a) => a.code !== "VIEW")];
  }, [matrixRows]);

  // Parent/child lookups for the matrix, used to keep groups and sub-pages consistent
  const pageById = useMemo(() => new Map(matrixRows.map((p) => [p.id, p])), [matrixRows]);
  const childrenById = useMemo(() => {
    const map = new Map();
    matrixRows.forEach((p) => {
      if (!p.parentId) return;
      if (!map.has(p.parentId)) map.set(p.parentId, []);
      map.get(p.parentId).push(p);
    });
    return map;
  }, [matrixRows]);

  useEffect(() => {
    fetchPages();
    fetchActions();
    fetchRoles();
  }, []);

  /* ===================== LOADERS ===================== */

  const fetchPages = async () => {
    try {
      const data = await MasterPagesAPI.loadPages({ tree: 1 });
      setPageTree(data || []);
    } catch (error) {
      handleApiError(error, "Failed to load pages");
    }
  };

  const fetchActions = async () => {
    try {
      const data = await MasterActionsAPI.loadActions();
      setActions(data || []);
    } catch (error) {
      handleApiError(error, "Failed to load actions");
    }
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const data = await AccessAPI.loadAccess();
      setRoles(data || []);
    } catch (error) {
      setRoles([]);
      handleApiError(error, "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchMatrix = async (id) => {
    if (!id) return;
    setMatrixLoading(true);
    try {
      const data = await MasterAccessRightsAPI.loadAccessRights(id);
      const rows = flattenWithDepth(data?.pages || []);
      const map = {};
      rows.forEach((p) =>
        (p.actions || []).forEach((a) => {
          map[a.pageActionId] = toBool(a.isAllowed);
        })
      );
      setAccess(data?.access || null);
      setMatrixRows(rows);
      setAllowed(map);
      setOriginal(map);
    } catch (error) {
      handleApiError(error, "Failed to load permissions");
    } finally {
      setMatrixLoading(false);
    }
  };

  const clearMatrix = () => {
    setAccessId("");
    setAccess(null);
    setMatrixRows([]);
    setAllowed({});
    setOriginal({});
  };

  const changes = useMemo(
    () =>
      Object.keys(allowed)
        .filter((key) => allowed[key] !== original[key])
        .map((key) => ({ pageActionId: Number(key), isAllowed: allowed[key] })),
    [allowed, original]
  );

  /* ===================== PAGE SYNC ===================== */

  const handleSyncClick = () => {
    if (changes.length > 0) {
      return showWarningToast("Save or reset your unsaved permission changes before syncing pages.");
    }
    try {
      const pages = collectPages();
      if (pages.length === 0) return showWarningToast("No pages were found in the menu config.");
      setSyncPayload(pages);
      setSyncConfirmOpen(true);
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to collect pages from the app.");
    }
  };

  const handleConfirmSync = async () => {
    setSyncing(true);
    try {
      const summary = await MasterPagesAPI.syncPages(syncPayload);
      showSuccessToast(formatSyncSummary(summary));
      setSyncConfirmOpen(false);
      await Promise.all([fetchPages(), fetchActions()]);
      if (accessId) fetchMatrix(accessId);
    } catch (error) {
      handleApiError(error, "Failed to sync pages");
    } finally {
      setSyncing(false);
    }
  };

  const syncPageCount = useMemo(() => countPages(syncPayload), [syncPayload]);
  const syncTopLevel = useMemo(() => syncPayload.map((p) => p.name), [syncPayload]);

  /* ===================== DRAWER ===================== */

  const closeDrawer = () => {
    if (saving) return;
    setDrawerType(null);
    setEditingId(null);
    setPageForm(emptyPageForm);
    setActionForm(emptyActionForm);
  };

  const openAddPage = (parentId = "") => {
    const viewAction = activeActions.find((a) => a.code === "VIEW");
    setEditingId(null);
    setPageForm({ ...emptyPageForm, parentId, actionIds: viewAction ? [viewAction.id] : [] });
    setDrawerType("page");
  };

  const openAddAction = () => {
    setEditingId(null);
    setActionForm(emptyActionForm);
    setDrawerType("action");
  };

  const handlePageEditClick = async (row) => {
    try {
      const [page] = await MasterPagesAPI.getPage(row.pageId);
      setEditingId(page.id);
      setPageForm({
        code: page.code,
        name: page.name,
        parentId: page.parentId ?? "",
        route: page.route || "",
        portalType: page.portalType || "",
        icon: page.icon || "",
        sortOrder: page.sortOrder ?? 0,
        status: page.status,
        actionIds: (page.actions || []).filter((a) => a.status === "ACTIVE").map((a) => a.actionId),
      });
      setDrawerType("page");
    } catch (error) {
      handleApiError(error, "Failed to load page data");
    }
  };

  const handleActionEditClick = async (row) => {
    try {
      const [action] = await MasterActionsAPI.getAction(row.actionId);
      setEditingId(action.id);
      setActionForm({
        code: action.code,
        name: action.name,
        sortOrder: action.sortOrder ?? 0,
        status: action.status,
      });
      setDrawerType("action");
    } catch (error) {
      handleApiError(error, "Failed to load action data");
    }
  };

  const setPageField = (key, value) => setPageForm((prev) => ({ ...prev, [key]: value }));
  const setActionField = (key, value) => setActionForm((prev) => ({ ...prev, [key]: value }));

  const togglePageAction = (actionId) => {
    setPageForm((prev) => ({
      ...prev,
      actionIds: prev.actionIds.includes(actionId)
        ? prev.actionIds.filter((id) => id !== actionId)
        : [...prev.actionIds, actionId],
    }));
  };

  // Parent options: hide the page being edited and its sub-pages
  const parentOptions = useMemo(() => {
    const blocked = isEdit ? collectDescendantIds(pageTree, editingId) : new Set();
    return flatPages.filter((p) => !blocked.has(p.id));
  }, [flatPages, pageTree, editingId, isEdit]);

  const handlePageSubmit = async (e) => {
    e.preventDefault();

    if (!isEdit && !normalizeCode(pageForm.code)) return showWarningToast("Page code is required.");
    if (!pageForm.name.trim()) return showWarningToast("Page name is required.");

    const payload = {
      name: pageForm.name.trim(),
      parentId: pageForm.parentId === "" ? null : Number(pageForm.parentId),
      route: pageForm.route.trim(),
      portalType: pageForm.portalType || null,
      icon: pageForm.icon.trim(),
      sortOrder: Number(pageForm.sortOrder) || 0,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await MasterPagesAPI.editPage(editingId, { ...payload, status: pageForm.status });
        await MasterPageActionsAPI.syncPageActions(editingId, pageForm.actionIds);
      } else {
        await MasterPagesAPI.addPage({
          ...payload,
          code: normalizeCode(pageForm.code),
          actionIds: pageForm.actionIds,
        });
      }
      showSuccessToast(isEdit ? "Page updated successfully!" : "Page added successfully!");
      setSaving(false);
      closeDrawer();
      await fetchPages();
      if (accessId) fetchMatrix(accessId);
    } catch (error) {
      handleApiError(error, "Failed to save page");
      setSaving(false);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();

    const code = actionForm.code.trim().toUpperCase();
    if (!isEdit && !/^[A-Z][A-Z0-9_]*$/.test(code)) {
      return showWarningToast("Action code must start with a letter and use only letters, numbers and underscores.");
    }
    if (!actionForm.name.trim()) return showWarningToast("Action name is required.");

    setSaving(true);
    try {
      if (isEdit) {
        await MasterActionsAPI.editAction(
          editingId,
          actionForm.name.trim(),
          Number(actionForm.sortOrder) || 0,
          actionForm.status
        );
      } else {
        await MasterActionsAPI.addAction(code, actionForm.name.trim(), Number(actionForm.sortOrder) || 0);
      }
      showSuccessToast(isEdit ? "Action updated successfully!" : "Action added successfully!");
      setSaving(false);
      closeDrawer();
      await fetchActions();
      if (accessId) fetchMatrix(accessId);
    } catch (error) {
      handleApiError(error, "Failed to save action");
      setSaving(false);
    }
  };

  /* ===================== PERMISSIONS ===================== */

  const handleRoleChange = (e) => {
    const id = e.target.value;
    if (changes.length > 0) {
      showWarningToast("Save or reset your unsaved permission changes before switching roles.");
      return;
    }
    if (!id) {
      clearMatrix();
      return;
    }
    setAccessId(id);
    fetchMatrix(id);
  };

  const labels = useMemo(() => {
    const map = {};
    matrixRows.forEach((p) =>
      (p.actions || []).forEach((a) => {
        map[a.pageActionId] = `${p.name} · ${a.name}`;
      })
    );
    return map;
  }, [matrixRows]);

  // Tick View on every group above this page, so the page is reachable in the menu
  const grantAncestors = (next, page) => {
    let parent = pageById.get(page.parentId);
    while (parent) {
      const viewPa = viewActionOf(parent);
      if (viewPa) next[viewPa.pageActionId] = true;
      parent = pageById.get(parent.parentId);
    }
  };

  // Clear every action on every sub-page below this page
  const revokeDescendants = (next, page) => {
    (childrenById.get(page.id) || []).forEach((child) => {
      (child.actions || []).forEach((a) => {
        next[a.pageActionId] = false;
      });
      revokeDescendants(next, child);
    });
  };

  // Ticking anything ticks this page's View and its parents' View.
  // Unticking View clears this page and everything under it.
  const toggleRight = (page, pa, checked) => {
    setAllowed((prev) => {
      const next = { ...prev, [pa.pageActionId]: checked };
      const viewPa = viewActionOf(page);

      if (checked) {
        if (viewPa) next[viewPa.pageActionId] = true;
        grantAncestors(next, page);
      } else if (pa.code === "VIEW") {
        (page.actions || []).forEach((a) => {
          next[a.pageActionId] = false;
        });
        revokeDescendants(next, page);
      }

      return next;
    });
  };

  const toggleRow = (page, checked) => {
    setAllowed((prev) => {
      const next = { ...prev };
      (page.actions || []).forEach((a) => {
        next[a.pageActionId] = checked;
      });

      if (checked) grantAncestors(next, page);
      else revokeDescendants(next, page);

      return next;
    });
  };

  const handleSaveRightsClick = () => {
    if (changes.length === 0) return showWarningToast("There are no permission changes to save.");
    setConfirmOpen(true);
  };

  const handleConfirmSaveRights = async () => {
    setSavingRights(true);
    try {
      await MasterAccessRightsAPI.saveAccessRights(Number(accessId), changes);
      showSuccessToast("Permissions saved!");
      setConfirmOpen(false);
      fetchMatrix(accessId);
    } catch (error) {
      handleApiError(error, "Failed to save permissions");
    } finally {
      setSavingRights(false);
    }
  };

  const granted = changes.filter((c) => c.isAllowed);
  const revoked = changes.filter((c) => !c.isAllowed);

  /* ===================== TABLE DATA ===================== */

  const pageHeaders = ["Page", "Code", "Route", "Sort", "Status", "Actions"];
  const pageKeys = ["display_name", "code", "route_display", "sortOrder", "status", "actions"];

  const pageData = flatPages.map((p) => ({
    ...p,
    pageId: p.id,
    display_name: `${p.depth > 0 ? "\u00A0\u00A0\u00A0\u00A0".repeat(p.depth) + "↳ " : ""}${p.name}`,
    route_display: p.route || "—",
    actions: "",
  }));

  const actionHeaders = ["Code", "Name", "Sort", "Status", "Created By", "Actions"];
  const actionKeys = ["code", "name", "sortOrder", "status", "createBy", "actions"];

  const actionData = actions.map((a) => ({
    ...a,
    actionId: a.id,
    actions: "",
  }));

  const tableOptions = { withImage: false, withEdit: true, withDelete: false };

  /* ===================== RENDER ===================== */

  return (
    <div className="p-5">
      {/* Sub tabs + Sync */}
      <div className="flex items-end justify-between gap-3 mb-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-[var(--main-color)] text-[var(--main-color)] font-semibold"
                  : "border-transparent text-gray-500 hover:text-[var(--main-color)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSyncClick}
          disabled={syncing}
          className="mb-2 px-4 py-2 rounded-md flex items-center space-x-2 text-sm disabled:opacity-50"
          style={{ backgroundColor: "var(--main-color)", color: "var(--main-text-color)" }}
          title="Register all pages from the app's menu and page tabs"
        >
          <TbDatabaseImport className={syncing ? "animate-pulse" : ""} />
          <span>{syncing ? "Syncing..." : "Sync Pages"}</span>
        </button>
      </div>

      {/* ---------- ROLE PERMISSIONS ---------- */}
      {activeTab === "permissions" && (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div className="w-80">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
              <select className={selectClass} value={accessId} onChange={handleRoleChange} disabled={rolesLoading}>
                <option value="">{rolesLoading ? "Loading roles..." : "Select a role"}</option>
                {roles.map((r) => (
                  <option key={roleId(r)} value={roleId(r)}>
                    {roleName(r)}
                  </option>
                ))}
              </select>
            </div>

            {accessId && (
              <div className="flex items-center gap-2">
                {changes.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                    {changes.length} unsaved
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => fetchMatrix(accessId)}
                  className="px-3 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 flex items-center"
                  title="Reload"
                >
                  <LuRefreshCw />
                </button>
                <button
                  type="button"
                  onClick={() => setAllowed(original)}
                  disabled={changes.length === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center space-x-2 disabled:opacity-50"
                >
                  <LuUndo2 />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveRightsClick}
                  disabled={isReadOnly || changes.length === 0}
                  className="px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50"
                  style={{ backgroundColor: "var(--main-color)", color: "var(--main-text-color)" }}
                >
                  <LuSaveAll />
                  <span>Save Permissions</span>
                </button>
              </div>
            )}
          </div>

          {isReadOnly && (
            <div className="mb-4 px-4 py-3 rounded-md bg-blue-50 text-blue-800 text-sm">
              This is a system role. Its permissions can't be edited.
            </div>
          )}

          {accessId && !isReadOnly && matrixRows.length > 0 && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Ticking anything on a page also ticks View on its parent groups. Unticking View clears that page and everything under it.
            </p>
          )}

          {!accessId ? (
            <div className="py-16 text-center text-gray-400">Select a role to manage its permissions.</div>
          ) : matrixLoading ? (
            <div className="py-16 text-center text-gray-400">Loading permissions...</div>
          ) : matrixRows.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              No pages available for this role. Click "Sync Pages" to register them.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow border border-gray-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 dark:bg-slate-800 min-w-[240px]">
                      Page
                    </th>
                    <th className="px-3 py-3 font-semibold text-center w-16">All</th>
                    {matrixActions.map((a) => (
                      <th key={a.id} className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                        {a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {matrixRows.map((page) => {
                    const list = page.actions || [];
                    const checkedCount = list.filter((a) => allowed[a.pageActionId]).length;
                    const allChecked = list.length > 0 && checkedCount === list.length;

                    return (
                      <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td
                          className="px-4 py-2 sticky left-0 bg-white dark:bg-slate-900"
                          style={{ paddingLeft: `${16 + page.depth * 24}px` }}
                        >
                          <div className={page.depth === 0 ? "font-semibold dark:text-white" : "dark:text-gray-200"}>
                            {page.depth > 0 && <span className="text-gray-400 mr-1">↳</span>}
                            {page.name}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{page.code}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {list.length === 0 ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer accent-[var(--main-color)]"
                              checked={allChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = checkedCount > 0 && !allChecked;
                              }}
                              disabled={isReadOnly}
                              onChange={(e) => toggleRow(page, e.target.checked)}
                            />
                          )}
                        </td>
                        {matrixActions.map((action) => {
                          const pa = list.find((x) => x.actionId === action.id);
                          if (!pa) {
                            return (
                              <td key={action.id} className="px-3 py-2 text-center text-gray-300">
                                —
                              </td>
                            );
                          }
                          const changed = allowed[pa.pageActionId] !== original[pa.pageActionId];
                          return (
                            <td key={action.id} className={`px-3 py-2 text-center ${changed ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 cursor-pointer accent-[var(--main-color)]"
                                checked={!!allowed[pa.pageActionId]}
                                disabled={isReadOnly}
                                onChange={(e) => toggleRight(page, pa, e.target.checked)}
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
          )}
        </div>
      )}

      {/* ---------- PAGES ---------- */}
      {activeTab === "pages" && (
        <div className="overflow-x-auto rounded-xl shadow h-200">
          <Table
            headers={pageHeaders}
            data={pageData}
            keys={pageKeys}
            {...tableOptions}
            dropdownItems={[{ key: "add-page", label: "Add New Page" }]}
            onItemClick={({ key }) => key === "add-page" && openAddPage("")}
            onEditClick={handlePageEditClick}
          />
        </div>
      )}

      {/* ---------- ACTIONS ---------- */}
      {activeTab === "actions" && (
        <div className="overflow-x-auto rounded-xl shadow h-200">
          <Table
            headers={actionHeaders}
            data={actionData}
            keys={actionKeys}
            {...tableOptions}
            dropdownItems={[{ key: "add-action", label: "Add New Action" }]}
            onItemClick={({ key }) => key === "add-action" && openAddAction()}
            onEditClick={handleActionEditClick}
          />
        </div>
      )}

      {/* ---------- DRAWER: PAGE / ACTION ---------- */}
      <Drawer
        isOpen={drawerType !== null}
        onClose={closeDrawer}
        title={
          drawerType === "page"
            ? isEdit ? "Edit Page" : "Add New Page"
            : isEdit ? "Edit Action" : "Add New Action"
        }
        width={420}
      >
        {drawerType === "page" && (
          <form className="space-y-4" onSubmit={handlePageSubmit}>
            <FloatingInput
              id="page_name"
              label="Page Name"
              value={pageForm.name}
              onChange={(e) => setPageField("name", e.target.value)}
            />

            <div>
              <FloatingInput
                id="page_code"
                label="Page Code"
                value={pageForm.code}
                onChange={(e) => setPageField("code", e.target.value)}
                disabled={isEdit}
              />
              {isEdit ? (
                <p className="text-xs text-gray-400 mt-1">Code can't be changed because permission keys depend on it.</p>
              ) : (
                pageForm.code && <p className="text-xs text-gray-400 mt-1">Saved as: {normalizeCode(pageForm.code) || "—"}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Parent Page</label>
              <select
                className={selectClass}
                value={pageForm.parentId}
                onChange={(e) => setPageField("parentId", e.target.value)}
              >
                <option value="">None (top level)</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {"\u00A0\u00A0".repeat(p.depth * 2)}
                    {p.depth > 0 ? "↳ " : ""}
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <FloatingInput
              id="page_route"
              label="Route (e.g. users)"
              value={pageForm.route}
              onChange={(e) => setPageField("route", e.target.value)}
            />

            <FloatingInput
              id="page_icon"
              label="Icon"
              value={pageForm.icon}
              onChange={(e) => setPageField("icon", e.target.value)}
            />

            <FloatingInput
              id="page_sort"
              type="number"
              label="Sort Order"
              value={pageForm.sortOrder}
              onChange={(e) => setPageField("sortOrder", e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Supported Actions</label>
              {activeActions.length === 0 ? (
                <p className="text-sm text-gray-400">No active actions. Add them in the Actions tab first.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {activeActions.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer dark:text-gray-200">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[var(--main-color)]"
                        checked={pageForm.actionIds.includes(a.id)}
                        onChange={() => togglePageAction(a.id)}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {isEdit && (
              <div>
                <ToggleStatusButton
                  options={statusOptions}
                  value={pageForm.status}
                  onChange={(v) => setPageField("status", v)}
                />
                <div className="mt-4 text-gray-700 dark:text-gray-300">Current Status: {pageForm.status}</div>
              </div>
            )}

            <div className="flex justify-between space-x-4 mt-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center space-x-2"
              >
                <TbXboxXFilled />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50"
                style={{ backgroundColor: "var(--main-color)", color: "var(--main-text-color)" }}
              >
                <LuSaveAll />
                <span>{saving ? "Saving..." : `${isEdit ? "Update" : "Add"} Page`}</span>
              </button>
            </div>
          </form>
        )}

        {drawerType === "action" && (
          <form className="space-y-4" onSubmit={handleActionSubmit}>
            <div>
              <FloatingInput
                id="action_code"
                label="Action Code (e.g. APPROVE)"
                value={actionForm.code}
                onChange={(e) => setActionField("code", e.target.value.toUpperCase())}
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-xs text-gray-400 mt-1">Code can't be changed because permission keys depend on it.</p>
              )}
            </div>

            <FloatingInput
              id="action_name"
              label="Action Name"
              value={actionForm.name}
              onChange={(e) => setActionField("name", e.target.value)}
            />

            <FloatingInput
              id="action_sort"
              type="number"
              label="Sort Order"
              value={actionForm.sortOrder}
              onChange={(e) => setActionField("sortOrder", e.target.value)}
            />

            {isEdit && (
              <div>
                <ToggleStatusButton
                  options={statusOptions}
                  value={actionForm.status}
                  onChange={(v) => setActionField("status", v)}
                />
                <div className="mt-4 text-gray-700 dark:text-gray-300">Current Status: {actionForm.status}</div>
              </div>
            )}

            <div className="flex justify-between space-x-4 mt-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 flex items-center space-x-2"
              >
                <TbXboxXFilled />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50"
                style={{ backgroundColor: "var(--main-color)", color: "var(--main-text-color)" }}
              >
                <LuSaveAll />
                <span>{saving ? "Saving..." : `${isEdit ? "Update" : "Add"} Action`}</span>
              </button>
            </div>
          </form>
        )}
      </Drawer>

      {/* ---------- CONFIRM SYNC PAGES ---------- */}
      <NormalModal
        open={syncConfirmOpen}
        title="Sync Pages"
        confirmText="Yes, Sync Pages"
        cancelText="Go Back"
        onConfirm={handleConfirmSync}
        onCancel={() => !syncing && setSyncConfirmOpen(false)}
        loading={syncing}
        width={520}
      >
        <p className="text-sm mb-3 dark:text-gray-300">
          Found <span className="font-semibold">{syncPageCount}</span> pages and tabs in the app's menu and page files,
          under {syncTopLevel.length} top-level item{syncTopLevel.length === 1 ? "" : "s"}:
        </p>
        <p className="text-xs text-gray-500 mb-3">{syncTopLevel.join(" · ")}</p>
        <ul className="text-sm space-y-2 border border-gray-200 rounded-lg p-3 dark:text-gray-300">
          <li>• New pages and tabs will be added.</li>
          <li>• Existing pages will be updated to match the app. Manual edits from the Pages tab will be overwritten.</li>
          <li>• Pages that are no longer in the app will be set to INACTIVE.</li>
          <li>• Role permissions are not changed. New pages start as not allowed for every role.</li>
        </ul>
      </NormalModal>

      {/* ---------- CONFIRM SAVE PERMISSIONS ---------- */}
      <NormalModal
        open={confirmOpen}
        title="Save Permissions"
        confirmText="Yes, Save Permissions"
        cancelText="Go Back"
        onConfirm={handleConfirmSaveRights}
        onCancel={() => !savingRights && setConfirmOpen(false)}
        loading={savingRights}
        width={520}
      >
        <p className="text-sm mb-3 dark:text-gray-300">
          You're about to update <span className="font-semibold">{access?.name}</span> with {changes.length} change
          {changes.length === 1 ? "" : "s"}.
        </p>

        {granted.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-green-700 mb-1">Granted ({granted.length})</p>
            <ul className="max-h-40 overflow-y-auto text-sm border border-gray-200 rounded-lg divide-y divide-gray-100">
              {granted.map((c) => (
                <li key={c.pageActionId} className="px-3 py-1.5">{labels[c.pageActionId]}</li>
              ))}
            </ul>
          </div>
        )}

        {revoked.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 mb-1">Revoked ({revoked.length})</p>
            <ul className="max-h-40 overflow-y-auto text-sm border border-gray-200 rounded-lg divide-y divide-gray-100">
              {revoked.map((c) => (
                <li key={c.pageActionId} className="px-3 py-1.5">{labels[c.pageActionId]}</li>
              ))}
            </ul>
          </div>
        )}
      </NormalModal>
    </div>
  );
};

export default RolesPermissions;