import React, { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { TbSearch, TbShieldCheck } from "react-icons/tb";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "../../../../../components/ActionsCenter/Alerts/Sileo";
import AccessAPI from "../../../../../api/private/access/accessAPI";
import RoleCard from "./parts/RoleCard";
import RoleDrawer from "./parts/RoleDrawer";
import { btnPrimary } from "./parts/roleOptions";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
];

const Access = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);

  // System roles are filtered out by the backend
  const fetchRoles = async () => {
    try {
      const data = await AccessAPI.loadAccess();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      showErrorToast("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const visibleRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roles
      .filter((r) => filter === "all" || r.status === filter)
      .filter((r) => !term || String(r.name || "").toLowerCase().includes(term))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [roles, search, filter]);

  const counts = useMemo(
    () => ({
      all: roles.length,
      ACTIVE: roles.filter((r) => r.status === "ACTIVE").length,
      INACTIVE: roles.filter((r) => r.status !== "ACTIVE").length,
    }),
    [roles]
  );

  const openNew = () => {
    setEditingRole(null);
    setDrawerOpen(true);
  };

  // Always edit the role that was clicked: pick it from the response by id,
  // and fall back to the card's own data
  const openEdit = async (role) => {
    let fresh = null;
    try {
      const data = await AccessAPI.getAccess(role.id);
      const list = Array.isArray(data) ? data : [];
      fresh = list.find((r) => String(r.id) === String(role.id)) || null;
    } catch {
      // The card already has what the drawer needs
    }
    setEditingRole(fresh || role);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingRole(null);
  };

  const handleSave = async ({ name, status }) => {
    setSaving(true);
    try {
      const response = editingRole
        ? await AccessAPI.updateAccess(editingRole.id, name, status)
        : await AccessAPI.addAccess(name);

      if (response?.msg === "exist") {
        showWarningToast("Another role already has this name.");
        return;
      }

      showSuccessToast(editingRole ? "Role updated" : "Role created");
      await fetchRoles();
      closeDrawer();
    } catch (error) {
      // 409 / 400 / 502 come back as thrown axios errors
      const data = error?.response?.data;
      const msg = data?.msg || data?.message || data?.error;
      if (msg === "exist") {
        showWarningToast("Another role already has this name.");
      } else {
        showErrorToast(typeof msg === "string" && msg ? msg : "Failed to save role");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5">
      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-main/10 text-main">
              <TbShieldCheck size={22} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Roles</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                A role groups users who do the same job. What each role can open and do is set
                in Dev Tools, under Roles &amp; Permissions.
              </p>
            </div>
          </div>
          <button type="button" onClick={openNew} className={btnPrimary}>
            <FaPlus /> New role
          </button>
        </div>

        {/* Search + filter */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px] max-w-sm">
            <TbSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles"
              aria-label="Search roles"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-main"
            />
          </label>

          <div className="inline-flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1 text-xs" role="tablist">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    active
                      ? "bg-white dark:bg-slate-900 font-semibold text-main shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-main"
                  }`}
                >
                  {f.label} <span className="text-gray-400">{counts[f.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roles */}
        <div className="mt-5">
          {loading ? (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[118px] rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : visibleRoles.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                {roles.length === 0 ? "No roles yet" : "No roles match"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {roles.length === 0
                  ? "Create the first role to start giving users access."
                  : "Try another search or filter."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              {visibleRoles.map((role) => (
                <RoleCard key={role.id} role={role} onEdit={openEdit} />
              ))}
            </div>
          )}
        </div>
      </div>

      <RoleDrawer
        isOpen={drawerOpen}
        role={editingRole}
        existingNames={roles.map((r) => String(r.name || ""))}
        saving={saving}
        onClose={closeDrawer}
        onSave={handleSave}
      />
    </div>
  );
};

export default Access;