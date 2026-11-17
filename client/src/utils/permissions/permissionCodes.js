// Shared by the page collector (sync), the sidebar filter and the route guard,
// so a page's permission code is derived the same way everywhere.

import { MENU_CONFIG } from "../../layouts/Sidebar/parts/MenuConfig";

export const MENU_CONFIGS = [MENU_CONFIG];

// System-only or test pages. Never registered, so only system roles can open them.
export const EXCLUDED_CODES = new Set(["developer_tabs", "devtools", "samplepage"]);

export const toSnake = (v) =>
  String(v || "")
    .replace(/^\/+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/_panel$/, "")
    .replace(/^_+|_+$/g, "");

// Submenu (group) -> code from its key
export const groupCode = (item) => toSnake(item.key);

// Leaf page -> code from its link. Absolute links (dashboards) use the key instead.
export const pageCode = (item) =>
  item.link && !item.link.startsWith("/") ? toSnake(item.link) : toSnake(item.key);