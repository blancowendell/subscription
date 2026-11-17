import React, { useState } from "react";
import { FaTrash, FaChevronLeft, FaChevronRight, FaDatabase } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";
import {
  MdOutlineManageAccounts,
  MdOutlineSecurity,
  MdPhonelinkLock,
  MdSystemUpdate,
  MdTune,
} from "react-icons/md";
import { GiVendingMachine } from "react-icons/gi";
import { TbUserStar } from "react-icons/tb";

import MaintenanceApi from "./parts/MaintenanceApi";
import MaintenanceApiAccess from "./parts/MaintenanceApiAccess";
import MaintenanceDashboard from "./parts/MaintenanceDashboard";
import RolesPermissions from "./parts/RolesPermissions";
// import DevMigration from "./parts/DevMigration";
// import PdaSupervisorPin from "./parts/PdaSupervisorPin";
// import AppVersion from "./parts/AppVersion";
import SystemSettings from "./parts/SystemSettings";
import { usePermissions } from "../../../api/public/auth/parts/permissionsContext";

// System roles only. Deliberately has no `pageMeta`: Dev Tools is never put
// in the permission grid, so no role can be granted access to it.
const TABS = [
  {
    code: "maintenance_dashboard",
    label: "Maintenance Dashboard",
    icon: <TbUserStar />,
    component: MaintenanceDashboard,
  },
  {
    code: "maintenance_api",
    label: "Maintenance API",
    icon: <GiVendingMachine />,
    component: MaintenanceApi,
  },
  {
    code: "maintenance_api_access",
    label: "Data Source Access",
    icon: <MdOutlineSecurity />,
    component: MaintenanceApiAccess,
  },
  {
    code: "roles_permissions",
    label: "Roles & Permissions",
    icon: <MdOutlineManageAccounts />,
    component: RolesPermissions,
  },
  // {
  //   code: "data_migration",
  //   label: "Data Migration",
  //   icon: <FaDatabase />,
  //   component: DevMigration,
  // },
  // {
  //   code: "pda_supervisor_pin",
  //   label: "PDA Supervisor PIN",
  //   icon: <MdPhonelinkLock />,
  //   component: PdaSupervisorPin,
  // },
  // {
  //   code: "app_version",
  //   label: "App Version",
  //   icon: <MdSystemUpdate />,
  //   component: AppVersion,
  // },
  {
    code: "system_settings",
    label: "System Settings",
    icon: <MdTune />,
    component: SystemSettings,
  },
];

const DevTools = () => {
  const { isSystem, loading } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState(TABS[0].label);

  const toggleSidebar = () => setCollapsed(!collapsed);

  const renderMainContent = () => {
    const tab = TABS.find((t) => t.label === activePage);
    if (!tab) {
      return <div className="py-16 text-center text-gray-400">This section isn't available yet.</div>;
    }
    const Component = tab.component;
    return <Component />;
  };

  const NavItem = ({ label, icon, active, collapsed, onClick }) => (
    <div
      onClick={() => onClick(label)}
      className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
        ${active
          ? "bg-[var(--main-color)] text-[var(--main-text-color)] font-semibold shadow-md"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[var(--main-color)]"
        }`}
    >
      <span className={`${collapsed ? "mr-0" : "mr-3"} text-lg`}>{icon}</span>
      {!collapsed && <span className="text-sm tracking-wide">{label}</span>}
    </div>
  );

  if (loading) {
    return <div className="py-16 text-center text-gray-400">Loading...</div>;
  }

  // Second layer behind PermissionRoute: never render Dev Tools for non-system roles
  if (!isSystem) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center bg-white dark:bg-slate-900 shadow-xl rounded-2xl">
        <div className="text-center">
          <p className="text-lg font-semibold dark:text-white">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">Dev Tools is only available to system administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-20" : "w-64"
          } bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col p-4 transition-all duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between mb-6">
          {!collapsed && <span className="text-2xl font-bold">Dev Tools</span>}
        </div>

        <nav className="flex-1 space-y-2">
          {TABS.map((t) => (
            <NavItem
              key={t.code}
              label={t.label}
              icon={t.icon}
              collapsed={collapsed}
              onClick={setActivePage}
              active={activePage === t.label}
            />
          ))}
        </nav>

        {/* Footer Items */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
          <NavItem
            label="Trash"
            icon={<FaTrash />}
            collapsed={collapsed}
            onClick={setActivePage}
            active={activePage === "Trash"}
          />

          <div
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
              text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800
              ${collapsed ? "flex-col gap-2" : ""}`}
            onClick={toggleSidebar}
          >
            <div className="flex items-center">
              <span className="mr-2">
                <IoSettingsSharp />
              </span>
              {!collapsed && <span>Settings</span>}
            </div>
            <span
              className={`transition-transform duration-300 ${collapsed ? "rotate-180 mt-2" : "rotate-0"
                }`}
            >
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
        <main className="p-6">{renderMainContent()}</main>
      </div>
    </div>
  );
};

export default DevTools;