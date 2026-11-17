const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { Master } = require("../../database/model/Master");
const {
  DataModeling,
  SelectParameter,
  Transaction,
  TransactionWithReturn,
  SelectAllStatement,
} = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const STATUSES = ["ACTIVE", "INACTIVE"];
const NAME_MAX = 50;
const AUDIT_MODULE = "Master Access";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const baseSelect = () =>
  SelectAllStatement(Master.master_access.tablename, Master.master_access.selectColumns);

const toRoles = (rows) =>
  rows.length ? DataModeling(rows, Master.master_access.prefix_) : [];

// GET /access/load-access — every role except system roles
const getAccess = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE ma_is_system = 0`);
    return res.json(JsonDataResponse(toRoles(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /access/get-access/:id — one role
const getAccessById = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE ma_id = ?`, [req.params.id]);
    return res.json(JsonDataResponse(toRoles(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /access/add-access — { accessName }
const addAccess = async (req, res) => {
  const name = String(req.body?.accessName || "").trim();

  try {
    if (!name) {
      return res.status(400).json(JsonWarningResponse("Name is required."));
    }
    if (name.length > NAME_MAX) {
      return res.status(400).json(JsonWarningResponse(`Name can be up to ${NAME_MAX} characters.`));
    }

    const existing = await query(`SELECT ma_id FROM master_access WHERE ma_name = ? LIMIT 1`, [name]);
    if (existing.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const createBy = req.session.user.fullname;

    const result = await TransactionWithReturn([
      {
        sql: `INSERT INTO master_access
                (ma_name, ma_is_system, ma_status, ma_create_date, ma_create_by)
              VALUES (?, 0, 'ACTIVE', NOW(), ?)`,
        values: [name, createBy],
      },
    ]);

    let id = result?.insertId ?? result?.[0]?.insertId;
    if (!id) {
      const created = await query(`SELECT ma_id FROM master_access WHERE ma_name = ? LIMIT 1`, [name]);
      id = created[0]?.ma_id;
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "master_access",
      entityId: id,
      referenceNo: name,
      after: { id, name, status: "ACTIVE" },
      remarks: "Role created",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: "master_access",
      entityId: null,
      referenceNo: name || null,
      error,
      remarks: "Role not created",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /access/update-access/:id — { accessName, accessStatus }
const updateAccess = async (req, res) => {
  const id = req.params.id;
  let before = null;

  try {
    const name = String(req.body?.accessName || "").trim();
    const status = req.body?.accessStatus;

    const rows = await query(
      `SELECT ma_id, ma_name, ma_status, ma_is_system FROM master_access WHERE ma_id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Role not found."));
    }

    const role = rows[0];
    before = { id: role.ma_id, name: role.ma_name, status: role.ma_status };

    if (Number(role.ma_is_system) === 1) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_access",
        entityId: id,
        referenceNo: role.ma_name,
        before,
        remarks: "Blocked: attempt to change a built-in role",
      });

      return res.status(403).json(JsonWarningResponse("Built-in roles can't be changed."));
    }

    if (!name) {
      return res.status(400).json(JsonWarningResponse("Name is required."));
    }
    if (name.length > NAME_MAX) {
      return res.status(400).json(JsonWarningResponse(`Name can be up to ${NAME_MAX} characters.`));
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Unknown status."));
    }

    const duplicate = await query(
      `SELECT ma_id FROM master_access WHERE ma_name = ? AND ma_id <> ? LIMIT 1`,
      [name, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE master_access
              SET ma_name = ?, ma_status = ?, ma_update_date = NOW(), ma_update_by = ?
              WHERE ma_id = ?`,
        values: [name, status, updatedBy, id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_access",
      entityId: id,
      referenceNo: name,
      before,
      after: { id: role.ma_id, name, status },
      remarks:
        role.ma_status !== status
          ? `Role ${status === "ACTIVE" ? "activated" : "deactivated"}`
          : "Role updated",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "master_access",
      entityId: id,
      referenceNo: before?.name || null,
      before,
      error,
      remarks: `Role not updated (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getAccess,
  getAccessById,
  addAccess,
  updateAccess,
};