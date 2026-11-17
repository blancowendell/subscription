const { TransactionWithConnection } = require("../connections/sqlhelper");
const { GetCurrentDatetime } = require("../repository/customhelper");

const SYSTEM = "SYSTEM";
const PAGE_CODE = /^[a-z][a-z0-9_]*$/;
const ACTION_CODE = /^[A-Z][A-Z0-9_]*$/;
const MAX_DEPTH = 5;

const titleCase = (code) =>
  code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const cleanText = (v, max) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

// Tree sent by the frontend -> flat list with parent codes
const flatten = (nodes, parentCode = null, depth = 0, out = []) => {
  if (!Array.isArray(nodes)) throw new Error("VALIDATION: Pages must be an array.");
  if (depth > MAX_DEPTH) throw new Error(`VALIDATION: Pages are nested deeper than ${MAX_DEPTH} levels.`);

  nodes.forEach((node, index) => {
    if (!node || typeof node !== "object") throw new Error("VALIDATION: Invalid page entry.");
    const code = cleanText(node.code, 50);
    out.push({
      code,
      name: cleanText(node.name, 100),
      route: cleanText(node.route, 150),
      icon: cleanText(node.icon, 50),
      sort: index + 1,
      actions: Array.isArray(node.actions)
        ? [...new Set(node.actions.map((a) => String(a).trim().toUpperCase()))]
        : [],
      parentCode,
    });
    if (Array.isArray(node.children) && node.children.length) {
      flatten(node.children, code, depth + 1, out);
    }
  });
  return out;
};

const validate = (pages) => {
  if (pages.length === 0) throw new Error("VALIDATION: No pages received.");
  const seen = new Set();

  for (const p of pages) {
    if (!p.code || !PAGE_CODE.test(p.code)) throw new Error(`VALIDATION: Invalid page code "${p.code}" (lowercase, numbers, underscores only).`);
    if (seen.has(p.code)) throw new Error(`VALIDATION: Duplicate page code "${p.code}".`);
    seen.add(p.code);
    if (!p.name) throw new Error(`VALIDATION: Page "${p.code}" has no name.`);
    if (!p.actions.includes("VIEW")) throw new Error(`VALIDATION: Page "${p.code}" must include VIEW.`);
    for (const a of p.actions) {
      if (!ACTION_CODE.test(a)) throw new Error(`VALIDATION: Page "${p.code}" has invalid action code "${a}".`);
    }
  }
};

const syncPageRegistry = async (pageTree) => {
  const pages = flatten(pageTree);
  validate(pages);

  const now = GetCurrentDatetime();
  const summary = {
    actionsAdded: 0,
    pagesAdded: 0,
    pagesUpdated: 0,
    pagesDeactivated: 0,
    pageActionsAdded: 0,
    pageActionsReactivated: 0,
    pageActionsDeactivated: 0,
  };

  await TransactionWithConnection(async (conn) => {
    /* ---------- 1. Actions used by any page ---------- */
    const usedCodes = [...new Set(pages.flatMap((p) => p.actions))];

    const [existingActions] = await conn.query(
      `SELECT mac_id, mac_code, mac_sort_order, mac_status FROM master_actions`,
    );
    const actionByCode = new Map(existingActions.map((a) => [a.mac_code, a]));
    let nextSort = Math.max(0, ...existingActions.map((a) => a.mac_sort_order || 0)) + 1;

    for (const code of usedCodes) {
      const existing = actionByCode.get(code);
      if (!existing) {
        await conn.execute(
          `INSERT INTO master_actions (mac_code, mac_name, mac_sort_order, mac_status, mac_create_date, mac_create_by)
           VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
          [code, titleCase(code), nextSort++, now, SYSTEM],
        );
        summary.actionsAdded++;
      } else if (existing.mac_status !== "ACTIVE") {
        await conn.execute(`UPDATE master_actions SET mac_status = 'ACTIVE' WHERE mac_id = ?`, [existing.mac_id]);
      }
    }

    const [actionRows] = await conn.query(`SELECT mac_id, mac_code FROM master_actions`);
    const actionIdByCode = new Map(actionRows.map((a) => [a.mac_code, a.mac_id]));

    /* ---------- 2. Pages (fields, no parents yet) ---------- */
    const [existingPages] = await conn.query(
      `SELECT mp_id, mp_code, mp_name, mp_parent_id, mp_route, mp_icon, mp_sort_order, mp_status
         FROM master_pages`,
    );
    const pageByCode = new Map(existingPages.map((p) => [p.mp_code, p]));

    for (const p of pages) {
      const existing = pageByCode.get(p.code);
      if (!existing) {
        await conn.execute(
          `INSERT INTO master_pages
             (mp_code, mp_name, mp_route, mp_icon, mp_sort_order, mp_status, mp_create_date, mp_create_by)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
          [p.code, p.name, p.route, p.icon, p.sort, now, SYSTEM],
        );
        summary.pagesAdded++;
        continue;
      }

      const changed =
        existing.mp_name !== p.name ||
        (existing.mp_route ?? null) !== p.route ||
        (existing.mp_icon ?? null) !== p.icon ||
        existing.mp_sort_order !== p.sort ||
        existing.mp_status !== "ACTIVE";

      if (changed) {
        await conn.execute(
          `UPDATE master_pages
              SET mp_name = ?, mp_route = ?, mp_icon = ?, mp_sort_order = ?,
                  mp_status = 'ACTIVE', mp_update_date = ?, mp_update_by = ?
            WHERE mp_id = ?`,
          [p.name, p.route, p.icon, p.sort, now, SYSTEM, existing.mp_id],
        );
        summary.pagesUpdated++;
      }
    }

    const [pageRows] = await conn.query(`SELECT mp_id, mp_code, mp_parent_id, mp_status FROM master_pages`);
    const pageIdByCode = new Map(pageRows.map((p) => [p.mp_code, p.mp_id]));
    const currentParentById = new Map(pageRows.map((p) => [p.mp_id, p.mp_parent_id]));

    /* ---------- 3. Parents ---------- */
    for (const p of pages) {
      const id = pageIdByCode.get(p.code);
      const parentId = p.parentCode ? pageIdByCode.get(p.parentCode) : null;
      if ((currentParentById.get(id) ?? null) !== parentId) {
        await conn.execute(
          `UPDATE master_pages SET mp_parent_id = ?, mp_update_date = ?, mp_update_by = ? WHERE mp_id = ?`,
          [parentId, now, SYSTEM, id],
        );
      }
    }

    /* ---------- 4. Page actions ---------- */
    const [paRows] = await conn.query(`SELECT mpa_id, mpa_page_id, mpa_action_id, mpa_status FROM master_page_actions`);
    const paByPage = new Map();
    paRows.forEach((r) => {
      if (!paByPage.has(r.mpa_page_id)) paByPage.set(r.mpa_page_id, []);
      paByPage.get(r.mpa_page_id).push(r);
    });

    for (const p of pages) {
      const pageId = pageIdByCode.get(p.code);
      const desired = new Set(p.actions.map((code) => actionIdByCode.get(code)));
      const current = paByPage.get(pageId) || [];
      const currentByAction = new Map(current.map((r) => [r.mpa_action_id, r]));

      for (const actionId of desired) {
        const row = currentByAction.get(actionId);
        if (!row) {
          await conn.execute(
            `INSERT INTO master_page_actions (mpa_page_id, mpa_action_id, mpa_status, mpa_create_date, mpa_create_by)
             VALUES (?, ?, 'ACTIVE', ?, ?)`,
            [pageId, actionId, now, SYSTEM],
          );
          summary.pageActionsAdded++;
        } else if (row.mpa_status !== "ACTIVE") {
          await conn.execute(`UPDATE master_page_actions SET mpa_status = 'ACTIVE' WHERE mpa_id = ?`, [row.mpa_id]);
          summary.pageActionsReactivated++;
        }
      }

      for (const row of current) {
        if (!desired.has(row.mpa_action_id) && row.mpa_status === "ACTIVE") {
          await conn.execute(`UPDATE master_page_actions SET mpa_status = 'INACTIVE' WHERE mpa_id = ?`, [row.mpa_id]);
          summary.pageActionsDeactivated++;
        }
      }
    }

    /* ---------- 5. Pages no longer in the app ---------- */
    const receivedCodes = new Set(pages.map((p) => p.code));
    for (const row of pageRows) {
      if (!receivedCodes.has(row.mp_code) && row.mp_status === "ACTIVE") {
        await conn.execute(
          `UPDATE master_pages SET mp_status = 'INACTIVE', mp_update_date = ?, mp_update_by = ? WHERE mp_id = ?`,
          [now, SYSTEM, row.mp_id],
        );
        summary.pagesDeactivated++;
      }
    }
  });

  return summary;
};

module.exports = { syncPageRegistry };