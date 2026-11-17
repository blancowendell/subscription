const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { validateOrLink } = require("../../services/utility/validator");
const { SelectParameter, Transaction } = require("../../services/connections/sqlhelper");
const { clearAccessCache, getRequestUserName } = require("../../services/dashboard/apiAccess");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Data Source Access";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const toIdList = (value) =>
  [...new Set((Array.isArray(value) ? value : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];

// Roles that can be granted: active and not a system role (system roles see everything)
const loadGrantableRoles = () =>
  query(
    `SELECT ma_id, ma_name
     FROM master_access
     WHERE ma_status = 'ACTIVE' AND COALESCE(ma_is_system, 0) = 0
     ORDER BY ma_name`
  );

const findApi = async (apiId) => {
  const rows = await query(
    `SELECT ma_id, ma_name, ma_api_name, ma_status
     FROM maintenance_api WHERE ma_id = ? LIMIT 1`,
    [apiId]
  );
  return rows[0] || null;
};

// Rejects ids that aren't grantable roles, so a bad request can't grant to a system role
const checkRoles = async (accessIds) => {
  if (accessIds.length === 0) return null;
  const grantable = new Set((await loadGrantableRoles()).map((r) => Number(r.ma_id)));
  const invalid = accessIds.filter((id) => !grantable.has(id));
  return invalid.length ? `These roles can't be granted: ${invalid.join(", ")}.` : null;
};

// Role ids -> sorted role names for the audit log
const roleNames = async (ids) => {
  if (!ids.length) return [];
  const rows = await query(
    `SELECT ma_id, ma_name FROM master_access WHERE ma_id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
  const byId = new Map(rows.map((r) => [Number(r.ma_id), r.ma_name]));
  return ids.map((id) => byId.get(Number(id)) || `#${id}`).sort();
};

const toApi = (row) => ({
  id: row.ma_id,
  name: row.ma_name,
  apiName: row.ma_api_name,
  status: row.ma_status,
});

const toRole = (row) => ({ id: row.ma_id, name: row.ma_name });

// GET /load-maintenance_api_access — the whole grid: data sources × roles
const loadMaintenanceApiAccess = async (req, res) => {
  try {
    const [apis, roles, grants] = await Promise.all([
      query(
        `SELECT ma_id, ma_name, ma_api_name, ma_status
         FROM maintenance_api
         ORDER BY ma_name`
      ),
      loadGrantableRoles(),
      query(`SELECT maa_api_id, maa_access_id FROM maintenance_api_access`),
    ]);

    return res.json(
      JsonDataResponse({
        apis: apis.map(toApi),
        roles: roles.map(toRole),
        grants: grants.map((g) => ({ apiId: g.maa_api_id, accessId: g.maa_access_id })),
      })
    );
  } catch (error) {
    console.error("Load data source access error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /get-maintenance_api_access/:id — one data source and which roles may use it
const getMaintenanceApiAccess = async (req, res) => {
  try {
    const required = { id: "Data source ID is required." };
    if (!validateOrLink(req, res, required)) return;

    const api = await findApi(req.params.id);
    if (!api) return res.status(404).json(JsonWarningResponse("Data source not found."));

    const [roles, grants] = await Promise.all([
      loadGrantableRoles(),
      query(`SELECT maa_access_id FROM maintenance_api_access WHERE maa_api_id = ?`, [api.ma_id]),
    ]);
    const allowed = new Set(grants.map((g) => Number(g.maa_access_id)));

    return res.json(
      JsonDataResponse({
        api: toApi(api),
        roles: roles.map((r) => ({ ...toRole(r), allowed: allowed.has(Number(r.ma_id)) })),
      })
    );
  } catch (error) {
    console.error("Get data source access error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /add-maintenance_api_access — { apiId, accessIds: [] }
// Grants the listed roles; roles already granted stay as they are.
const addMaintenanceApiAccess = async (req, res) => {
  let api = null;

  try {
    const required = { apiId: "Data source ID is required." };
    if (!validateOrLink(req, res, required)) return;

    api = await findApi(req.body.apiId);
    if (!api) return res.status(404).json(JsonWarningResponse("Data source not found."));

    const accessIds = toIdList(req.body.accessIds);
    if (accessIds.length === 0) {
      return res.status(400).json(JsonWarningResponse("Choose at least one role."));
    }

    const invalid = await checkRoles(accessIds);
    if (invalid) return res.status(400).json(JsonWarningResponse(invalid));

    const current = await query(
      `SELECT maa_access_id FROM maintenance_api_access WHERE maa_api_id = ?`,
      [api.ma_id]
    );
    const currentIds = current.map((r) => Number(r.maa_access_id));
    const newIds = accessIds.filter((id) => !currentIds.includes(id));

    const by = getRequestUserName(req);

    await Transaction(
      accessIds.map((accessId) => ({
        sql: `INSERT IGNORE INTO maintenance_api_access
                (maa_api_id, maa_access_id, maa_created_by, maa_created_at)
              VALUES (?, ?, ?, NOW())`,
        values: [api.ma_id, accessId, by],
      }))
    );

    clearAccessCache();

    if (newIds.length > 0) {
      const [beforeNames, addedNames] = await Promise.all([
        roleNames(currentIds),
        roleNames(newIds),
      ]);

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        entity: "maintenance_api_access",
        entityId: api.ma_id,
        referenceNo: api.ma_name,
        before: { roles: beforeNames },
        after: { roles: [...beforeNames, ...addedNames].sort() },
        remarks: `Access granted to ${addedNames.join(", ")}`,
      });
    }

    return res.json(JsonSuccess());
  } catch (error) {
    console.error("Add data source access error:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "maintenance_api_access",
      entityId: api?.ma_id ?? req.body?.apiId ?? null,
      referenceNo: api?.ma_name ?? null,
      error,
      remarks: "Data source access not granted",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /edit-maintenance_api_access/:id — { accessIds: [] }
// Sets exactly which roles may use this data source (an empty list removes everyone
// except system roles).
const editMaintenanceApiAccess = async (req, res) => {
  let api = null;

  try {
    const required = { id: "Data source ID is required." };
    if (!validateOrLink(req, res, required)) return;

    api = await findApi(req.params.id);
    if (!api) return res.status(404).json(JsonWarningResponse("Data source not found."));

    if (!Array.isArray(req.body?.accessIds)) {
      return res.status(400).json(JsonWarningResponse("accessIds must be a list."));
    }

    const accessIds = toIdList(req.body.accessIds);
    const invalid = await checkRoles(accessIds);
    if (invalid) return res.status(400).json(JsonWarningResponse(invalid));

    const current = await query(
      `SELECT maa_access_id FROM maintenance_api_access WHERE maa_api_id = ?`,
      [api.ma_id]
    );
    const currentIds = new Set(current.map((r) => Number(r.maa_access_id)));
    const wanted = new Set(accessIds);

    const toRemove = [...currentIds].filter((id) => !wanted.has(id));
    const toAdd = accessIds.filter((id) => !currentIds.has(id));
    const by = getRequestUserName(req);

    const statements = [
      ...toRemove.map((accessId) => ({
        sql: `DELETE FROM maintenance_api_access WHERE maa_api_id = ? AND maa_access_id = ?`,
        values: [api.ma_id, accessId],
      })),
      ...toAdd.map((accessId) => ({
        sql: `INSERT IGNORE INTO maintenance_api_access
                (maa_api_id, maa_access_id, maa_created_by, maa_created_at)
              VALUES (?, ?, ?, NOW())`,
        values: [api.ma_id, accessId, by],
      })),
    ];

    if (statements.length > 0) await Transaction(statements);

    clearAccessCache();

    if (statements.length > 0) {
      const [beforeNames, afterNames, addedNames, removedNames] = await Promise.all([
        roleNames([...currentIds]),
        roleNames(accessIds),
        roleNames(toAdd),
        roleNames(toRemove),
      ]);

      const parts = [];
      if (addedNames.length) parts.push(`granted: ${addedNames.join(", ")}`);
      if (removedNames.length) parts.push(`removed: ${removedNames.join(", ")}`);

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        entity: "maintenance_api_access",
        entityId: api.ma_id,
        referenceNo: api.ma_name,
        before: { roles: beforeNames },
        after: { roles: afterNames },
        remarks: `Access ${parts.join("; ")}`,
      });
    }

    return res.json(JsonDataResponse({ granted: toAdd.length, removed: toRemove.length }));
  } catch (error) {
    console.error("Edit data source access error:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "maintenance_api_access",
      entityId: api?.ma_id ?? req.params?.id ?? null,
      referenceNo: api?.ma_name ?? null,
      error,
      remarks: "Data source access not changed",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  loadMaintenanceApiAccess,
  getMaintenanceApiAccess,
  addMaintenanceApiAccess,
  editMaintenanceApiAccess,
};