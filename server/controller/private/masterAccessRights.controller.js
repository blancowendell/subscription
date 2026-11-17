const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
  MessageStatus,
} = require("../../services/repository/response");
const {
  CheckParam,
  TransactionWithConnection,
} = require("../../services/connections/sqlhelper");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { validateOrLink } = require("../../services/utility/validator");
const {
  getRolePermissions,
  clearPermissionCache,
} = require("../../services/permissions/permissionService");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Master Access Rights";

const MAX_DEPTH = 20;

const handleError = (res, error) => {
  console.error("Master Access Rights Error:", error);
  const msg = error.message || error.sqlMessage || "Unknown error";
  if (msg.startsWith("VALIDATION: ")) return res.status(400).json(JsonWarningResponse(msg.replace("VALIDATION: ", "")));
  if (msg.startsWith("DUPLICATE: ")) return res.status(409).json(JsonWarningResponse(msg.replace("DUPLICATE: ", "")));
  if (msg.startsWith("FORBIDDEN: ")) return res.status(403).json(JsonWarningResponse(msg.replace("FORBIDDEN: ", "")));
  return res.status(500).json(JsonErrorResponse(msg));
};

// Input mistakes (VALIDATION / DUPLICATE) aren't audit events; blocked and failed saves are
const shouldAuditFailure = (error) => {
  const msg = error?.message || "";
  return !msg.startsWith("VALIDATION: ") && !msg.startsWith("DUPLICATE: ");
};

const toBool = (v) => v === true || v === 1 || v === "1" || v === "true";

// Allowed permission keys for one role, e.g. ["credit_memos.view", "credit_memos.approve"]
const loadAllowedKeys = async (connection, accessId) => {
  const [rows] = await connection.execute(
    `SELECT CONCAT(p.mp_code, '.', LOWER(a.mac_code)) AS permission_key
       FROM master_access_rights r
       JOIN master_page_actions pa ON pa.mpa_id = r.mar_page_action_id
       JOIN master_pages p ON p.mp_id = pa.mpa_page_id
       JOIN master_actions a ON a.mac_id = pa.mpa_action_id
      WHERE r.mar_access_id = ? AND r.mar_is_allowed = 1
      ORDER BY permission_key`,
    [accessId],
  );
  return rows.map((r) => r.permission_key);
};

const diffKeys = (before, after) => {
  const b = new Set(before);
  const a = new Set(after);
  return {
    granted: after.filter((k) => !b.has(k)),
    revoked: before.filter((k) => !a.has(k)),
  };
};

const buildTree = (pages) => {
  const map = new Map();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));

  const roots = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
};

// Keeps one role's rights consistent with the page tree, inside the save transaction:
//  1. A revoked View clears that page and every page below it.
//  2. Anything allowed gets View on its own page and on every parent group above it.
// revokedPaIds: page action ids set to not-allowed in this request (only View ones cascade).
const enforceHierarchy = async (connection, accessId, revokedPaIds, now, user) => {
  const [pageRows] = await connection.query(
    `SELECT mp_id, mp_parent_id FROM master_pages WHERE mp_status = 'ACTIVE'`,
  );
  const [paRows] = await connection.query(
    `SELECT pa.mpa_id, pa.mpa_page_id, a.mac_code
       FROM master_page_actions pa
       JOIN master_actions a ON a.mac_id = pa.mpa_action_id
      WHERE pa.mpa_status = 'ACTIVE'`,
  );
  const [rightRows] = await connection.execute(
    `SELECT mar_page_action_id FROM master_access_rights WHERE mar_access_id = ? AND mar_is_allowed = 1`,
    [accessId],
  );

  const parentOf = new Map(pageRows.map((p) => [p.mp_id, p.mp_parent_id]));
  const childrenOf = new Map();
  pageRows.forEach((p) => {
    if (!p.mp_parent_id) return;
    if (!childrenOf.has(p.mp_parent_id)) childrenOf.set(p.mp_parent_id, []);
    childrenOf.get(p.mp_parent_id).push(p.mp_id);
  });

  const pageOfPa = new Map();
  const pasByPage = new Map();
  const viewPaByPage = new Map();
  paRows.forEach((r) => {
    pageOfPa.set(r.mpa_id, r.mpa_page_id);
    if (!pasByPage.has(r.mpa_page_id)) pasByPage.set(r.mpa_page_id, []);
    pasByPage.get(r.mpa_page_id).push(r.mpa_id);
    if (r.mac_code === "VIEW") viewPaByPage.set(r.mpa_page_id, r.mpa_id);
  });

  const allowed = new Set(rightRows.map((r) => r.mar_page_action_id));
  const toRevoke = new Set();
  const toGrant = new Set();

  const revokePage = (pageId) => {
    (pasByPage.get(pageId) || []).forEach((paId) => {
      if (allowed.has(paId)) {
        allowed.delete(paId);
        toRevoke.add(paId);
      }
    });
  };

  const revokeBelow = (pageId, depth = 0) => {
    if (depth > MAX_DEPTH) return;
    (childrenOf.get(pageId) || []).forEach((childId) => {
      revokePage(childId);
      revokeBelow(childId, depth + 1);
    });
  };

  // 1. Revoked View cascades down
  revokedPaIds.forEach((paId) => {
    const pageId = pageOfPa.get(paId);
    if (!pageId || viewPaByPage.get(pageId) !== paId) return;
    revokePage(pageId);
    revokeBelow(pageId);
  });

  // 2. Allowed anything -> View on own page and every ancestor
  [...allowed].forEach((paId) => {
    let pageId = pageOfPa.get(paId);
    let depth = 0;
    while (pageId && depth++ < MAX_DEPTH) {
      const viewPa = viewPaByPage.get(pageId);
      if (viewPa && !allowed.has(viewPa)) {
        allowed.add(viewPa);
        toGrant.add(viewPa);
      }
      pageId = parentOf.get(pageId);
    }
  });

  if (toRevoke.size > 0) {
    await connection.query(
      `UPDATE master_access_rights
          SET mar_is_allowed = 0, mar_update_date = ?, mar_update_by = ?
        WHERE mar_access_id = ? AND mar_page_action_id IN (?)`,
      [now, user, accessId, [...toRevoke]],
    );
  }

  if (toGrant.size > 0) {
    const values = [...toGrant].map((paId) => [accessId, paId, 1, now, user]);
    await connection.query(
      `INSERT INTO master_access_rights
         (mar_access_id, mar_page_action_id, mar_is_allowed, mar_create_date, mar_create_by)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         mar_is_allowed = 1,
         mar_update_date = ?,
         mar_update_by = ?`,
      [values, now, user],
    );
  }
};

// GET /my-permissions
// Permission keys for the logged-in user's role, e.g. ["credit_memos.view", "credit_memos.approve"]
const getMyPermissions = async (req, res) => {
  try {
    const role = req.session?.user?.access_type;
    if (!role) {
      return res.status(401).json(JsonWarningResponse("Not logged in."));
    }

    const perms = await getRolePermissions(role);
    return res.json(
      JsonDataResponse({
        role,
        accessId: perms.accessId,
        isSystem: perms.isSystem,
        permissions: [...perms.permissions],
      }),
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /load-master_access_rights?access_id=
// Returns the full checkbox matrix for one role.
// Unset rights come back as isAllowed: false.
const loadMasterAccessRights = async (req, res) => {
  try {
    const { access_id } = req.query;
    if (!access_id) {
      return res.status(400).json(JsonWarningResponse("access_id is required."));
    }

    const roles = await CheckParam(
      `SELECT ma_id AS id, ma_name AS name,
              ma_is_system AS isSystem, ma_status AS status
         FROM master_access
        WHERE ma_id = ?`,
      [access_id],
    );
    if (roles.length === 0) {
      return res.status(404).json(JsonWarningResponse(`Access ID "${access_id}" does not exist.`));
    }
    const role = roles[0];

    const rows = await CheckParam(
      `SELECT p.mp_id, p.mp_code, p.mp_name, p.mp_parent_id, p.mp_route, p.mp_icon, p.mp_sort_order,
              pa.mpa_id,
              a.mac_id, a.mac_code, a.mac_name,
              COALESCE(r.mar_is_allowed, 0) AS is_allowed
         FROM master_pages p
         LEFT JOIN master_page_actions pa
                ON pa.mpa_page_id = p.mp_id AND pa.mpa_status = 'ACTIVE'
         LEFT JOIN master_actions a
                ON a.mac_id = pa.mpa_action_id AND a.mac_status = 'ACTIVE'
         LEFT JOIN master_access_rights r
                ON r.mar_page_action_id = pa.mpa_id AND r.mar_access_id = ?
        WHERE p.mp_status = 'ACTIVE'
        ORDER BY p.mp_sort_order, p.mp_id, a.mac_sort_order, a.mac_id`,
      [access_id],
    );

    const pageMap = new Map();
    rows.forEach((row) => {
      if (!pageMap.has(row.mp_id)) {
        pageMap.set(row.mp_id, {
          id: row.mp_id,
          code: row.mp_code,
          name: row.mp_name,
          parentId: row.mp_parent_id,
          route: row.mp_route,
          icon: row.mp_icon,
          sortOrder: row.mp_sort_order,
          actions: [],
        });
      }
      // Skip page actions whose action was deactivated
      if (row.mpa_id && row.mac_id) {
        pageMap.get(row.mp_id).actions.push({
          pageActionId: row.mpa_id,
          actionId: row.mac_id,
          code: row.mac_code,
          name: row.mac_name,
          permissionKey: `${row.mp_code}.${String(row.mac_code).toLowerCase()}`,
          isAllowed: toBool(row.is_allowed),
        });
      }
    });

    return res.json(
      JsonDataResponse({
        access: {
          id: role.id,
          name: role.name,
          isSystem: toBool(role.isSystem),
          status: role.status,
        },
        pages: buildTree([...pageMap.values()]),
      }),
    );
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /get-master_access_rights/:id
const getMasterAccessRights = async (req, res) => {
  try {
    const required = {
      id: "ID Number is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;
    const rows = await CheckParam(
      `SELECT r.mar_id AS id,
              r.mar_access_id AS accessId,
              ma.ma_name AS accessName,
              r.mar_page_action_id AS pageActionId,
              p.mp_code AS pageCode,
              p.mp_name AS pageName,
              a.mac_code AS actionCode,
              a.mac_name AS actionName,
              CONCAT(p.mp_code, '.', LOWER(a.mac_code)) AS permissionKey,
              r.mar_is_allowed AS isAllowed,
              r.mar_create_date AS createDate,
              r.mar_create_by AS createBy,
              r.mar_update_date AS updateDate,
              r.mar_update_by AS updateBy
         FROM master_access_rights r
         JOIN master_access ma ON ma.ma_id = r.mar_access_id
         JOIN master_page_actions pa ON pa.mpa_id = r.mar_page_action_id
         JOIN master_pages p ON p.mp_id = pa.mpa_page_id
         JOIN master_actions a ON a.mac_id = pa.mpa_action_id
        WHERE r.mar_id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse(`Access right ID "${id}" does not exist.`));
    }
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /add-master_access_rights
// Bulk save from the checkbox grid.
// body: { accessId, rights: [{ pageActionId, isAllowed }] }
const addMasterAccessRights = async (req, res) => {
  const accessId = Number(req.body?.accessId);

  // Filled inside the transaction for the audit log
  const audit = { roleName: null, before: [], after: [] };

  try {
    const required = {
      accessId: "Access ID is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const { rights } = req.body;

    if (!Array.isArray(rights) || rights.length === 0) {
      return res.status(400).json(JsonWarningResponse("rights must be a non-empty array."));
    }

    // Last value wins if the same pageActionId is sent twice
    const rightsMap = new Map();
    for (const r of rights) {
      const pageActionId = Number(r.pageActionId);
      if (!pageActionId || r.isAllowed === undefined) {
        return res.status(400).json(JsonWarningResponse("Each right needs pageActionId and isAllowed."));
      }
      rightsMap.set(pageActionId, toBool(r.isAllowed) ? 1 : 0);
    }
    const pageActionIds = [...rightsMap.keys()];
    const revokedPaIds = pageActionIds.filter((id) => rightsMap.get(id) === 0);

    const now = GetCurrentDatetime();
    const user = req.session.user.fullname;

    await TransactionWithConnection(async (connection) => {
      const [role] = await connection.execute(
        `SELECT ma_name, ma_is_system FROM master_access WHERE ma_id = ?`,
        [accessId],
      );
      if (role.length === 0) {
        throw new Error(`VALIDATION: Access ID "${accessId}" does not exist.`);
      }
      audit.roleName = role[0].ma_name;
      if (toBool(role[0].ma_is_system)) {
        throw new Error("FORBIDDEN: System roles cannot be edited.");
      }

      const [found] = await connection.query(
        `SELECT mpa_id FROM master_page_actions WHERE mpa_id IN (?) AND mpa_status = 'ACTIVE'`,
        [pageActionIds],
      );
      if (found.length !== pageActionIds.length) {
        throw new Error("VALIDATION: One or more page actions do not exist or are inactive.");
      }

      audit.before = await loadAllowedKeys(connection, accessId);

      const values = pageActionIds.map((pageActionId) => [
        accessId,
        pageActionId,
        rightsMap.get(pageActionId),
        now,
        user,
      ]);

      await connection.query(
        `INSERT INTO master_access_rights
           (mar_access_id, mar_page_action_id, mar_is_allowed, mar_create_date, mar_create_by)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           mar_is_allowed = VALUES(mar_is_allowed),
           mar_update_date = ?,
           mar_update_by = ?`,
        [values, now, user],
      );

      await enforceHierarchy(connection, accessId, revokedPaIds, now, user);

      audit.after = await loadAllowedKeys(connection, accessId);
    });

    clearPermissionCache();

    const { granted, revoked } = diffKeys(audit.before, audit.after);

    if (granted.length > 0 || revoked.length > 0) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        entity: "master_access_rights",
        entityId: accessId,
        referenceNo: audit.roleName,
        before: { permissions: audit.before },
        after: { permissions: audit.after, granted, revoked },
        remarks: `Permissions for ${audit.roleName}: ${granted.length} granted, ${revoked.length} revoked`,
      });
    }

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_access_rights",
        entityId: accessId || null,
        referenceNo: audit.roleName,
        error,
        remarks: (error.message || "").startsWith("FORBIDDEN: ")
          ? "Blocked: attempt to edit a system role's permissions"
          : "Permissions not saved — transaction rolled back",
      });
    }

    return handleError(res, error);
  }
};

// PUT /edit-master_access_rights/:id
// Single toggle. body: { isAllowed }
const editMasterAccessRights = async (req, res) => {
  const { id } = req.params;

  // Filled inside the transaction for the audit log
  const audit = { accessId: null, roleName: null, permissionKey: null, before: [], after: [] };

  try {
    const required = {
      id: "ID Number is required",
    };
    if (!validateOrLink(req, res, required)) return;

    if (req.body.isAllowed === undefined) {
      return res.status(400).json(JsonWarningResponse("isAllowed is required."));
    }
    const isAllowed = toBool(req.body.isAllowed) ? 1 : 0;

    const update_date = GetCurrentDatetime();
    const update_by = req.session.user.fullname;

    await TransactionWithConnection(async (connection) => {
      const [existing] = await connection.execute(
        `SELECT r.mar_access_id, r.mar_page_action_id, r.mar_is_allowed,
                ma.ma_name, ma.ma_is_system,
                CONCAT(p.mp_code, '.', LOWER(a.mac_code)) AS permission_key
           FROM master_access_rights r
           JOIN master_access ma ON ma.ma_id = r.mar_access_id
           JOIN master_page_actions pa ON pa.mpa_id = r.mar_page_action_id
           JOIN master_pages p ON p.mp_id = pa.mpa_page_id
           JOIN master_actions a ON a.mac_id = pa.mpa_action_id
          WHERE r.mar_id = ?`,
        [id],
      );
      if (existing.length === 0) {
        throw new Error(`VALIDATION: Access right ID "${id}" does not exist.`);
      }

      audit.accessId = existing[0].mar_access_id;
      audit.roleName = existing[0].ma_name;
      audit.permissionKey = existing[0].permission_key;

      if (toBool(existing[0].ma_is_system)) {
        throw new Error("FORBIDDEN: System roles cannot be edited.");
      }
      if (Number(existing[0].mar_is_allowed) === isAllowed) {
        throw new Error(`VALIDATION: ${MessageStatus.EXIST}`);
      }

      audit.before = await loadAllowedKeys(connection, audit.accessId);

      await connection.execute(
        `UPDATE master_access_rights
            SET mar_is_allowed = ?, mar_update_date = ?, mar_update_by = ?
          WHERE mar_id = ?`,
        [isAllowed, update_date, update_by, id],
      );

      await enforceHierarchy(
        connection,
        existing[0].mar_access_id,
        isAllowed === 0 ? [existing[0].mar_page_action_id] : [],
        update_date,
        update_by,
      );

      audit.after = await loadAllowedKeys(connection, audit.accessId);
    });

    clearPermissionCache();

    const { granted, revoked } = diffKeys(audit.before, audit.after);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_access_rights",
      entityId: id,
      referenceNo: audit.roleName,
      before: { permissions: audit.before },
      after: { permissions: audit.after, granted, revoked },
      remarks: `${audit.permissionKey} ${isAllowed ? "granted to" : "revoked from"} ${audit.roleName}` +
        (granted.length + revoked.length > 1
          ? ` (${granted.length} granted, ${revoked.length} revoked incl. page hierarchy)`
          : ""),
    });

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_access_rights",
        entityId: id ?? null,
        referenceNo: audit.roleName,
        error,
        remarks: (error.message || "").startsWith("FORBIDDEN: ")
          ? `Blocked: attempt to change ${audit.permissionKey ?? "a permission"} on a system role`
          : "Permission not changed — transaction rolled back",
      });
    }

    return handleError(res, error);
  }
};

module.exports = {
  getMyPermissions,
  loadMasterAccessRights,
  getMasterAccessRights,
  addMasterAccessRights,
  editMasterAccessRights,
};