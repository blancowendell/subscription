import { AiOutlineDashboard, AiOutlineSetting } from "react-icons/ai";
import { FaRegFileCode } from "react-icons/fa";
import { TbCategory, TbReport, TbChartPie } from "react-icons/tb";
import { GrHostMaintenance, GrTask } from "react-icons/gr";
import { MdOutlineInventory2, MdOutlineHistory } from "react-icons/md";

// One menu for every role. What each role actually sees is decided by
// Role Permissions in Dev Tools, not by this file.
// Keys (groups) and links (pages) are the permission codes, so don't rename them.
export const MENU_CONFIG = [
  {
    key: "masterTabs",
    icon: <TbCategory size={20} />,
    label: "Master's",
    children: [
      // { key: "accountingPanel", label: "Accounting", link: "accounting" },
      // { key: "customerPanel", label: "Customer", link: "customer" },
      // { key: "vendorPanel", label: "Vendor", link: "vendor" },
      { key: "employeePanel", label: "Employee", link: "employees" },
      // { key: "samplePagePanel", label: "Sample Page", link: "samplepage" },
    ],
  },
  // {
  //   key: "inventoryTabs",
  //   icon: <MdOutlineInventory2 size={20} />,
  //   label: "Inventory",
  //   children: [
  //     { key: "warehousePanel", label: "Warehouse", link: "warehouse" },
  //     { key: "inventoryPanel", label: "Inventory", link: "inventory" },
  //     { key: "warrantyPanel", label: "Warranty", link: "warrantyPanel" },
  //   ],
  // },
  {
    key: "maintain",
    icon: <GrHostMaintenance size={20} />,
    label: "Maintain",
    link: "maintainPanel",
  },
  // {
  //   key: "taskTabs",
  //   icon: <GrTask size={20} />,
  //   label: "Tasks",
  //   children: [
  //     { key: "invoicingPanel", label: "Sales/Invoicing", link: "invoicing" },
  //     { key: "creditsPaymentsPanel", label: "Credits & Payments", link: "creditsPayments" },
  //     { key: "salesOrderPanel", label: "Sales Orders", link: "salesOrder" },
  //     { key: "requestPanel", label: "Requests", link: "requestPanel" },
  //     { key: "deliveryReceiptsPanel", label: "Delivery Receipts", link: "deliveryReceiptsPanel" },
  //     { key: "purchaseOrderPanel", label: "Purchase Orders", link: "purchaseOrders" },
  //   ],
  // },
  // {
  //   key: "reports",
  //   icon: <TbReport size={20} />,
  //   label: "Reports",
  //   link: "reportsPanel",
  // },
  // {
  //   key: "audit",
  //   icon: <MdOutlineHistory size={20} />,
  //   label: "Audit",
  //   link: "audit",
  // },
  {
    key: "settingTabs",
    icon: <AiOutlineSetting size={20} />,
    label: "Settings",
    children: [
      { key: "settingsPanel", label: "Settings", link: "settings" },
    ],
  },
  {
    key: "developerTabs",
    icon: <FaRegFileCode size={20} />,
    label: "Developer Tabs",
    children: [
      { key: "devToolsPanel", label: "Dev Tools", link: "devtools" },
    ],
  },
];

// Every role lands on /index now. Kept only so existing imports keep working;
// any role name (including new ones) returns "/index".
export const ROLE_DASHBOARDS = new Proxy({}, { get: () => "/index" });

export const DASHBOARD_ITEM = {
  key: "dashboard",
  icon: <AiOutlineDashboard size={20} />,
  label: "Dashboard",
};