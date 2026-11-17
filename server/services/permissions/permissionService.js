const { CheckParam } = require("../connections/sqlhelper");
const { JsonErrorResponse, JsonWarningResponse } = require("../repository/response");

// Short cache so every request doesn't hit the DB. Cleared whenever rights are saved.
const CACHE_TTL_MS = 60 * 1000;
const MAX_DEPTH = 20;
const cache = new Map();

const EMPTY = { accessId: null, isSystem: false, permissions: new Set() };

const toBool = (v) => v === true || v === 1 || v === "1";

const getRolePermissions = async (roleName) => {
  if (!roleName) return EMPTY;

  const cached = cache.get(roleName);
  if (cached && cached.expires > Date.now()) return cached.value;

  const roles = await CheckParam(
    `SELECT ma_id, ma_is_system, ma_status FROM master_access WHERE ma_name = ?`,
    [roleName],
  );

  let value = EMPTY;

  if (roles.length > 0 && roles[0].ma_status === "ACTIVE") {
    const role = roles[0];

    if (toBool(role.ma_is_system)) {
      value = { accessId: role.ma_id, isSystem: true, permissions: new Set() };
    } else {
      const rows = await CheckParam(
        `SELECT p.mp_id,
                CONCAT(p.mp_code, '.', LOWER(a.mac_code)) AS permission_key
           FROM master_access_rights r
           JOIN master_page_actions pa ON pa.mpa_id = r.mar_page_action_id AND pa.mpa_status = 'ACTIVE'
           JOIN master_pages p ON p.mp_id = pa.mpa_page_id AND p.mp_status = 'ACTIVE'
           JOIN master_actions a ON a.mac_id = pa.mpa_action_id AND a.mac_status = 'ACTIVE'
          WHERE r.mar_access_id = ? AND r.mar_is_allowed = 1`,
        [role.ma_id],
      );

      const pages = await CheckParam(
        `SELECT mp_id, mp_code, mp_parent_id FROM master_pages WHERE mp_status = 'ACTIVE'`,
        [],
      );
      const pageById = new Map(pages.map((p) => [p.mp_id, p]));

      const permissions = new Set(rows.map((r) => r.permission_key));

      // An allowed page is only reachable through its parent groups,
      // so every ancestor of an allowed page counts as viewable.
      rows.forEach((r) => {
        let parent = pageById.get(pageById.get(r.mp_id)?.mp_parent_id);
        let depth = 0;
        while (parent && depth++ < MAX_DEPTH) {
          permissions.add(`${parent.mp_code}.view`);
          parent = pageById.get(parent.mp_parent_id);
        }
      });

      value = { accessId: role.ma_id, isSystem: false, permissions };
    }
  }

  cache.set(roleName, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
};

const clearPermissionCache = () => cache.clear();

const hasPermission = (perms, pageCode, action = "view") =>
  perms.isSystem || perms.permissions.has(`${pageCode}.${String(action).toLowerCase()}`);

// Route guard: router.put("/approve/:id", checkPermission("credit_memos", "approve"), handler)
const checkPermission = (pageCode, action = "view") => async (req, res, next) => {
  try {
    const role = req.session?.user?.access_type;
    if (!role) {
      return res.status(401).json(JsonWarningResponse("Not logged in."));
    }

    const perms = await getRolePermissions(role);
    if (hasPermission(perms, pageCode, action)) return next();

    return res
      .status(403)
      .json(JsonWarningResponse(`You don't have permission to ${String(action).toLowerCase()} ${pageCode.replace(/_/g, " ")}.`));
  } catch (error) {
    console.error("Permission Check Error:", error);
    return res.status(500).json(JsonErrorResponse("Failed to check permissions."));
  }
};

// Route guard for Dev Tools: only system roles (Administrator)
const requireSystemRole = async (req, res, next) => {
  try {
    const role = req.session?.user?.access_type;
    if (!role) {
      return res.status(401).json(JsonWarningResponse("Not logged in."));
    }

    const perms = await getRolePermissions(role);
    if (perms.isSystem) return next();

    return res.status(403).json(JsonWarningResponse("Only system administrators can do this."));
  } catch (error) {
    console.error("System Role Check Error:", error);
    return res.status(500).json(JsonErrorResponse("Failed to check permissions."));
  }
};

module.exports = {
  getRolePermissions,
  clearPermissionCache,
  hasPermission,
  checkPermission,
  requireSystemRole,
};