// Builds the page tree for the permission sync from what the app already has:
//  1. The sidebar menu config -> groups and pages
//  2. `export const pageMeta` in each page's index file -> that page's actions and tabs
// Nothing here needs editing when you add pages.

import { MENU_CONFIGS, EXCLUDED_CODES, groupCode, pageCode } from "./permissionCodes";

// Only each page folder's own index file (pages/Private/<Page>/index.jsx), not its parts.
// The whole module is imported so pages without `pageMeta` are simply skipped.
const pageModules = import.meta.glob("../../pages/Private/*/index.{js,jsx}", {
  eager: true,
});

const metaByRoute = new Map();
Object.values(pageModules).forEach((mod) => {
  const meta = mod?.pageMeta;
  if (meta?.route) metaByRoute.set(meta.route, meta);
});

const withView = (actions) => {
  const list = (actions || []).map((a) => String(a).toUpperCase());
  return list.includes("VIEW") ? list : ["VIEW", ...list];
};

const toTabNodes = (tabs) =>
  (tabs || []).map((tab) => ({
    code: tab.code,
    name: tab.name,
    route: null,
    actions: withView(tab.actions),
    children: toTabNodes(tab.tabs),
  }));

export const collectPages = () => {
  const roots = [];
  const byCode = new Map();

  const addNode = (siblings, node) => {
    if (byCode.has(node.code)) return byCode.get(node.code);
    byCode.set(node.code, node);
    siblings.push(node);
    return node;
  };

  const walk = (items, siblings) => {
    (items || []).forEach((item) => {
      // antd section labels are not pages, just flatten them
      if (item.type === "group") {
        walk(item.children, siblings);
        return;
      }

      // Submenu -> group page
      if (item.children && item.children.length) {
        const code = groupCode(item);
        if (EXCLUDED_CODES.has(code)) return;
        const group = addNode(siblings, {
          code,
          name: item.label,
          route: null,
          actions: ["VIEW"],
          children: [],
        });
        walk(item.children, group.children);
        return;
      }

      if (!item.link) return;

      // Leaf page
      const code = pageCode(item);
      if (EXCLUDED_CODES.has(code) || byCode.has(code)) return;

      const meta = metaByRoute.get(item.link);
      addNode(siblings, {
        code,
        name: item.label,
        route: item.link.startsWith("/") ? "index" : item.link,
        actions: withView(meta?.actions),
        children: toTabNodes(meta?.tabs),
      });
    });
  };

  MENU_CONFIGS.forEach((config) => walk(config, roots));
  return roots;
};

export const countPages = (nodes) =>
  (nodes || []).reduce((total, n) => total + 1 + countPages(n.children), 0);