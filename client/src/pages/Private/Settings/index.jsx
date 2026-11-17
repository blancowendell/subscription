import React, { useState, useEffect, useMemo } from "react";
import { FaTrash, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { TbFileBarcode, TbFileInvoice } from "react-icons/tb";
import { SiOpenaccess } from "react-icons/si";
import { PiBarcode } from "react-icons/pi";
import { LuUsers } from "react-icons/lu";
import { IoSettingsSharp } from "react-icons/io5";

import Access from "./parts/Access";
import MaintenanceSequence from "./parts/Sequence";
import Users from "./parts/Users";
// import InvoiceLayout from "./parts/InvoiceLayout";
// import BarcodeSequence from "./parts/BarCodeSequence";
import { usePermissions } from "../../../api/public/auth/parts/permissionsContext";

// Single source for this page's tabs: renders the sidebar and feeds the permission sync.
// systemOnly tabs manage roles/users, so they are never put in the permission grid
// (anyone able to edit them could grant themselves Administrator). Only system roles see them.
const TABS = [
  {
    code: "settings_access",
    label: "Access",
    icon: <SiOpenaccess />,
    systemOnly: true,
    component: Access,
  },
  {
    code: "settings_sequence",
    label: "Sequence",
    icon: <TbFileBarcode />,
    actions: ["VIEW", "EDIT"],
    component: MaintenanceSequence,
  },
  // {
  //   code: "settings_barcode",
  //   label: "Barcode Settings",
  //   icon: <PiBarcode />,
  //   actions: ["VIEW", "EDIT"],
  //   component: BarcodeSequence,
  // },
  {
    code: "settings_users",
    label: "Users",
    icon: <LuUsers />,
    systemOnly: true,
    component: Users,
  },
  // {
  //   code: "settings_invoice_layout",
  //   label: "Invoice Layout",
  //   icon: <TbFileInvoice />,
  //   actions: ["VIEW", "EDIT"],
  //   component: InvoiceLayout,
  // },
];

// Read by the page collector. `route` must match this page's `link` in the menu config.
export const pageMeta = {
  route: "settings",
  actions: ["VIEW"],
  tabs: TABS.filter((t) => !t.systemOnly).map(({ code, label, actions }) => ({
    code,
    name: label,
    actions,
  })),
};

const Settings = () => {
  const { can, isSystem, loading } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState(null);

  const canOpenPage = can("settings");
  const allowedTabs = useMemo(
    () => TABS.filter((t) => (t.systemOnly ? isSystem : can(t.code, "view"))),
    [can, isSystem]
  );

  // Keep the active tab valid: default to the first allowed one
  useEffect(() => {
    if (!allowedTabs.find((t) => t.label === activePage)) {
      setActivePage(allowedTabs[0]?.label ?? null);
    }
  }, [allowedTabs, activePage]);

  const toggleSidebar = () => setCollapsed(!collapsed);

  const renderMainContent = () => {
    if (loading) {
      return <div className="py-16 text-center text-gray-400">Loading...</div>;
    }
    const tab = allowedTabs.find((t) => t.label === activePage);
    if (!tab) {
      return (
        <div className="py-16 text-center text-gray-400">
          You don't have access to any section of this page.
        </div>
      );
    }
    const Component = tab.component;
    return <Component />;
  };

  const NavItem = ({ label, icon, active, collapsed, onClick }) => (
    <div
      onClick={() => onClick(label)}
      className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
        ${
          active
            ? "bg-[var(--main-color)] text-[var(--main-text-color)] font-semibold shadow-md"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-[var(--main-color)]"
        }`}
    >
      <span className={`${collapsed ? "mr-0" : "mr-3"} text-lg`}>{icon}</span>
      {!collapsed && <span className="text-sm tracking-wide">{label}</span>}
    </div>
  );

  if (!loading && !canOpenPage) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center bg-white dark:bg-slate-900 shadow-xl rounded-2xl">
        <div className="text-center">
          <p className="text-lg font-semibold dark:text-white">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">You don't have permission to view Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-64"
        } bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col p-4 transition-all duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between mb-6">
          {!collapsed && <span className="text-2xl font-bold">Settings</span>}
        </div>

        <nav className="flex-1 space-y-2">
          {allowedTabs.map((t) => (
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
              className={`transition-transform duration-300 ${
                collapsed ? "rotate-180 mt-2" : "rotate-0"
              }`}
            >
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
        <main className="p-6">{renderMainContent()}</main>
      </div>
    </div>
  );
};

export default Settings;