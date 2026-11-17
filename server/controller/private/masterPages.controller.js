const { STATUS_LOG } = require("../../services/repository/enum/enums");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
} = require("../../services/repository/response");
const {
  Check,
  SelectStatement,
  TransactionWithConnection,
} = require("../../services/connections/sqlhelper");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { validateOrLink } = require("../../services/utility/validator");
const { syncPageRegistry } = require("../../services/registry/pageRegistrySync");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Master Pages";

const VALID_STATUS = ["ACTIVE", "INACTIVE"];

let isSyncing = false;

const handleError = (res, error) => {
  console.error("Master Pages Error:", error);
  const msg = error.message || error.sqlMessage || "Unknown error";
  if (msg.startsWith("VALIDATION: ")) return res.status(400).json(JsonWarningResponse(msg.replace("VALIDATION: ", "")));
  if (msg.startsWith("DUPLICATE: ")) return res.status(409).json(JsonWarningResponse(msg.replace("DUPLICATE: ", "")));
  return res.status(500).json(JsonErrorResponse(msg));
};

// Input mistakes (VALIDATION / DUPLICATE) aren't audit events
const shouldAuditFailure = (error) => {
  const msg = error?.message || "";
  return !msg.startsWith("VALIDATION: ") && !msg.startsWith("DUPLICATE: ");
};

const toNullableInt = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const toNullableText = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());
const normalizeCode = (v) =>
  String(v)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildTree = (rows) => {
  const map = new Map();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));

  const roots = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
};

const SELECT_PAGES = `
  SELECT p.mp_id AS id,
         p.mp_code AS code,
         p.mp_name AS name,
         p.mp_parent_id AS parentId,
         pp.mp_name AS parentName,
         p.mp_route AS route,
         p.mp_icon AS icon,
         p.mp_sort_order AS sortOrder,
         p.mp_status AS status,
         p.mp_create_date AS createDate,
         p.mp_create_by AS createBy,
         p.mp_update_date AS updateDate,
         p.mp_update_by AS updateBy
    FROM master_pages p
    LEFT JOIN master_pages pp ON pp.mp_id = p.mp_parent_id`;

const validateActionIds = async (connection, actionIds) => {
  if (actionIds.length === 0) return;
  const [found] = await connection.query(
    `SELECT mac_id FROM master_actions WHERE mac_id IN (?) AND mac_status = 'ACTIVE'`,
    [actionIds],
  );
  if (found.length !== actionIds.length) {
    throw new Error("VALIDATION: One or more actions do not exist or are inactive.");
  }
};

// GET /load-master_pages?status=&tree=1
const loadMasterPages = async (req, res) => {
  try {
    const { status, tree } = req.query;
    const where = [];
    const params = [];

    if (status) {
      where.push("p.mp_status = ?");
      params.push(status);
    }

    let sql = SELECT_PAGES;
    if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY p.mp_sort_order, p.mp_id";

    const rows = await Check(SelectStatement(sql, params));
    return res.json(JsonDataResponse(tree === "1" ? buildTree(rows) : rows));
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /get-master_pages/:id
const getMasterPages = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await Check(SelectStatement(`${SELECT_PAGES} WHERE p.mp_id = ?`, [id]));

    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse(`Page ID "${id}" does not exist.`));
    }

    const actions = await Check(
      SelectStatement(
        `SELECT pa.mpa_id AS pageActionId,
                a.mac_id AS actionId,
                a.mac_code AS code,
                a.mac_name AS name,
                pa.mpa_status AS status
           FROM master_page_actions pa
           JOIN master_actions a ON a.mac_id = pa.mpa_action_id
          WHERE pa.mpa_page_id = ?
          ORDER BY a.mac_sort_order, a.mac_id`,
        [id],
      ),
    );

    return res.json(JsonDataResponse([{ ...rows[0], actions }]));
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /add-master_pages
// body: { code, name, parentId?, route?, icon?, sortOrder?, actionIds?: [] }
const addMasterPages = async (req, res) => {
  const code = req.body?.code ? normalizeCode(req.body.code) : null;

  try {
    const required = {
      code: "Page code is required",
      name: "Page name is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const name = String(req.body.name).trim();
    const parentId = toNullableInt(req.body.parentId);
    const route = toNullableText(req.body.route);
    const icon = toNullableText(req.body.icon);
    const sortOrder = Number(req.body.sortOrder) || 0;
    const actionIds = Array.isArray(req.body.actionIds)
      ? [...new Set(req.body.actionIds.map(Number).filter(Boolean))]
      : [];

    if (!code) {
      return res.status(400).json(JsonWarningResponse("Page code is invalid."));
    }

    const create_date = GetCurrentDatetime();
    const create_by = req.session.user.fullname;

    let actionCodes = [];

    const newPageId = await TransactionWithConnection(async (connection) => {
      const [exists] = await connection.execute(
        `SELECT 1 FROM master_pages WHERE mp_code = ?`,
        [code],
      );
      if (exists.length > 0) {
        throw new Error(`DUPLICATE: Page code "${code}" already exists`);
      }

      if (parentId) {
        const [parent] = await connection.execute(
          `SELECT 1 FROM master_pages WHERE mp_id = ?`,
          [parentId],
        );
        if (parent.length === 0) {
          throw new Error(`VALIDATION: Parent page ID "${parentId}" does not exist.`);
        }
      }

      await validateActionIds(connection, actionIds);

      const [insertResult] = await connection.execute(
        `INSERT INTO master_pages
           (mp_code, mp_name, mp_parent_id, mp_route, mp_icon,
            mp_sort_order, mp_status, mp_create_date, mp_create_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, name, parentId, route, icon, sortOrder, STATUS_LOG.ACTIVE, create_date, create_by],
      );
      const pageId = insertResult.insertId;

      if (actionIds.length > 0) {
        const values = actionIds.map((actionId) => [
          pageId,
          actionId,
          STATUS_LOG.ACTIVE,
          create_date,
          create_by,
        ]);
        await connection.query(
          `INSERT INTO master_page_actions
             (mpa_page_id, mpa_action_id, mpa_status, mpa_create_date, mpa_create_by)
           VALUES ?`,
          [values],
        );

        const [codeRows] = await connection.query(
          `SELECT mac_code FROM master_actions WHERE mac_id IN (?) ORDER BY mac_code`,
          [actionIds],
        );
        actionCodes = codeRows.map((r) => r.mac_code);
      }

      return pageId;
    });

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "master_pages",
      entityId: newPageId,
      referenceNo: code,
      after: {
        id: newPageId,
        code,
        name,
        parent_id: parentId,
        route,
        icon,
        sort_order: sortOrder,
        status: STATUS_LOG.ACTIVE,
        actions: actionCodes,
      },
      remarks: `Page created: ${code}${actionCodes.length ? ` (${actionCodes.join(", ")})` : ""}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "CREATE",
        status: "FAILED",
        entity: "master_pages",
        referenceNo: code,
        error,
        remarks: "Page not created — transaction rolled back",
      });
    }

    return handleError(res, error);
  }
};

// PUT /edit-master_pages/:id
// mp_code is locked after creation because permission keys depend on it
const editMasterPages = async (req, res) => {
  const { id } = req.params;
  let before = null;

  try {
    const required = {
      name: "Page name is required",
      status: "Status is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const name = String(req.body.name).trim();
    const parentId = toNullableInt(req.body.parentId);
    const route = toNullableText(req.body.route);
    const icon = toNullableText(req.body.icon);
    const sortOrder = Number(req.body.sortOrder) || 0;
    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Status must be ACTIVE or INACTIVE."));
    }

    const update_date = GetCurrentDatetime();
    const update_by = req.session.user.fullname;

    await TransactionWithConnection(async (connection) => {
      const [existing] = await connection.execute(
        `SELECT mp_id, mp_code, mp_name, mp_parent_id, mp_route,
                mp_icon, mp_sort_order, mp_status
           FROM master_pages WHERE mp_id = ?`,
        [id],
      );
      if (existing.length === 0) {
        throw new Error(`VALIDATION: Page ID "${id}" does not exist.`);
      }

      before = {
        id: existing[0].mp_id,
        code: existing[0].mp_code,
        name: existing[0].mp_name,
        parent_id: existing[0].mp_parent_id,
        route: existing[0].mp_route,
        icon: existing[0].mp_icon,
        sort_order: existing[0].mp_sort_order,
        status: existing[0].mp_status,
      };

      // Walk up from the new parent. If we reach this page, the menu would loop.
      let cursor = parentId;
      while (cursor) {
        if (Number(cursor) === Number(id)) {
          throw new Error("VALIDATION: A page cannot be its own parent or be placed under one of its own sub-pages.");
        }
        const [parentRows] = await connection.execute(
          `SELECT mp_parent_id FROM master_pages WHERE mp_id = ?`,
          [cursor],
        );
        if (parentRows.length === 0) {
          throw new Error(`VALIDATION: Parent page ID "${cursor}" does not exist.`);
        }
        cursor = parentRows[0].mp_parent_id;
      }

      await connection.execute(
        `UPDATE master_pages
            SET mp_name = ?, mp_parent_id = ?, mp_route = ?, mp_icon = ?,
                mp_sort_order = ?, mp_status = ?, mp_update_date = ?, mp_update_by = ?
          WHERE mp_id = ?`,
        [name, parentId, route, icon, sortOrder, status, update_date, update_by, id],
      );
    });

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_pages",
      entityId: id,
      referenceNo: before?.code ?? null,
      before,
      after: {
        ...before,
        name,
        parent_id: parentId,
        route,
        icon,
        sort_order: sortOrder,
        status,
      },
      remarks:
        before && before.status !== status
          ? `Page ${before.code} ${status === "ACTIVE" ? "activated" : "deactivated"}`
          : `Page updated: ${before?.code}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_pages",
        entityId: id ?? null,
        referenceNo: before?.code ?? null,
        before,
        error,
        remarks: "Page not updated — transaction rolled back",
      });
    }

    return handleError(res, error);
  }
};

// POST /sync-master_pages
// body: { pages: [ { code, name, route, actions, children: [...] } ] }
// The frontend collects this tree from its menus and each page's pageMeta.
const syncMasterPages = async (req, res) => {
  const { pages } = req.body;
  if (!Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json(JsonWarningResponse("No pages received to sync."));
  }

  if (isSyncing) {
    return res.status(409).json(JsonWarningResponse("A page sync is already running. Try again in a moment."));
  }

  isSyncing = true;
  try {
    const summary = await syncPageRegistry(pages);
    console.log(`✅ Pages synced by ${req.session?.user?.fullname || "unknown"}:`, summary);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SYNC",
      entity: "master_pages",
      referenceNo: "Page registry",
      after: { pages_received: pages.length, summary },
      remarks: "Pages synced from frontend menus",
    });

    return res.json(JsonDataResponse(summary));
  } catch (error) {
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SYNC",
      status: "FAILED",
      entity: "master_pages",
      referenceNo: "Page registry",
      after: { pages_received: pages.length },
      error,
      remarks: "Page sync failed",
    });

    return handleError(res, error);
  } finally {
    isSyncing = false;
  }
};

module.exports = {
  loadMasterPages,
  getMasterPages,
  addMasterPages,
  editMasterPages,
  syncMasterPages,
};