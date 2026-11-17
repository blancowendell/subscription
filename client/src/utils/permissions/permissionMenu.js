import { MENU_CONFIG, ROLE_DASHBOARDS, DASHBOARD_ITEM } from "../../layouts/Sidebar/parts/MenuConfig";
import { groupCode, pageCode } from "./permissionCodes";

// A group shows only if the user can view it AND at least one page inside it
const filterItems = (items, can) =>
  items
    .map((item) => {
      if (item.children) {
        if (!can(groupCode(item))) return null;
        const children = filterItems(item.children, can);
        return children.length ? { ...item, children } : null;
      }
      return can(pageCode(item)) ? item : null;
    })
    .filter(Boolean);

// Role's own dashboard (always shown) + every page the role can view
export const buildPermittedMenu = (role, can) => {
  const dashboardLink = ROLE_DASHBOARDS[role];
  const dashboard = dashboardLink ? [{ ...DASHBOARD_ITEM, link: dashboardLink }] : [];

  const permitted = filterItems(MENU_CONFIG, can);

  return [
    ...dashboard,
    ...(permitted.length ? [{ type: "group", label: "Menu", children: permitted }] : []),
  ];
};