const { STATUS_LOG } = require("../../services/repository/enum/enums");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
  MessageStatus,
} = require("../../services/repository/response");
const {
  Check,
  SelectStatement,
  TransactionWithConnection,
} = require("../../services/connections/sqlhelper");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { validateOrLink } = require("../../services/utility/validator");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Master Actions";

const VALID_STATUS = ["ACTIVE", "INACTIVE"];

const handleError = (res, error) => {
  console.error("Master Actions Error:", error);
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

const SELECT_ACTIONS = `
  SELECT mac_id AS id,
         mac_code AS code,
         mac_name AS name,
         mac_sort_order AS sortOrder,
         mac_status AS status,
         mac_create_date AS createDate,
         mac_create_by AS createBy
    FROM master_actions`;

// GET /load-master_actions?status=ACTIVE
const loadMasterActions = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let sql = SELECT_ACTIONS;

    if (status) {
      sql += " WHERE mac_status = ?";
      params.push(status);
    }
    sql += " ORDER BY mac_sort_order, mac_id";

    const rows = await Check(SelectStatement(sql, params));
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    return handleError(res, error);
  }
};

// GET /get-master_actions/:id
const getMasterActions = async (req, res) => {
  try {
    const required = {
      id: "ID Number is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;
    const rows = await Check(SelectStatement(`${SELECT_ACTIONS} WHERE mac_id = ?`, [id]));

    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse(`Action ID "${id}" does not exist.`));
    }
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    return handleError(res, error);
  }
};

// POST /add-master_actions
const addMasterActions = async (req, res) => {
  const code = req.body?.code ? String(req.body.code).trim().toUpperCase() : null;

  try {
    const required = {
      code: "Action code is required",
      name: "Action name is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const name = String(req.body.name).trim();
    const sortOrder = Number(req.body.sortOrder) || 0;

    if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
      return res.status(400).json(JsonWarningResponse("Action code must be letters, numbers and underscores only (e.g. APPROVE)."));
    }

    const create_date = GetCurrentDatetime();
    const create_by = req.session.user.fullname;

    const newId = await TransactionWithConnection(async (connection) => {
      const [exists] = await connection.execute(
        `SELECT 1 FROM master_actions WHERE mac_code = ?`,
        [code],
      );
      if (exists.length > 0) {
        throw new Error(`DUPLICATE: Action code "${code}" already exists`);
      }

      const [result] = await connection.execute(
        `INSERT INTO master_actions
           (mac_code, mac_name, mac_sort_order, mac_status, mac_create_date, mac_create_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [code, name, sortOrder, STATUS_LOG.ACTIVE, create_date, create_by],
      );

      return result.insertId;
    });

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "master_actions",
      entityId: newId,
      referenceNo: code,
      after: {
        id: newId,
        code,
        name,
        sort_order: sortOrder,
        status: STATUS_LOG.ACTIVE,
      },
      remarks: `Action created: ${code}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "CREATE",
        status: "FAILED",
        entity: "master_actions",
        referenceNo: code,
        error,
        remarks: "Action not created",
      });
    }

    return handleError(res, error);
  }
};

// PUT /edit-master_actions/:id
// mac_code is locked after creation because permission keys depend on it
const editMasterActions = async (req, res) => {
  const { id } = req.params;
  let before = null;

  try {
    const required = {
      id: "ID Number is required",
      name: "Action name is required",
      status: "Status is required",
    };
    if (!validateOrLink(req, res, required)) return;

    const name = String(req.body.name).trim();
    const sortOrder = Number(req.body.sortOrder) || 0;
    const { status } = req.body;

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Status must be ACTIVE or INACTIVE."));
    }

    await TransactionWithConnection(async (connection) => {
      const [existing] = await connection.execute(
        `SELECT mac_id, mac_code, mac_name, mac_sort_order, mac_status
           FROM master_actions WHERE mac_id = ?`,
        [id],
      );
      if (existing.length === 0) {
        throw new Error(`VALIDATION: Action ID "${id}" does not exist.`);
      }

      before = {
        id: existing[0].mac_id,
        code: existing[0].mac_code,
        name: existing[0].mac_name,
        sort_order: existing[0].mac_sort_order,
        status: existing[0].mac_status,
      };

      const [noChange] = await connection.execute(
        `SELECT 1 FROM master_actions
          WHERE mac_id = ? AND mac_name = ? AND mac_sort_order = ? AND mac_status = ?`,
        [id, name, sortOrder, status],
      );
      if (noChange.length > 0) {
        throw new Error(`VALIDATION: ${MessageStatus.EXIST}`);
      }

      await connection.execute(
        `UPDATE master_actions
            SET mac_name = ?, mac_sort_order = ?, mac_status = ?
          WHERE mac_id = ?`,
        [name, sortOrder, status, id],
      );
    });

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_actions",
      entityId: id,
      referenceNo: before?.code ?? null,
      before,
      after: { ...before, name, sort_order: sortOrder, status },
      remarks:
        before && before.status !== status
          ? `Action ${before.code} ${status === "ACTIVE" ? "activated" : "deactivated"}`
          : `Action updated: ${before?.code}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    if (shouldAuditFailure(error)) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        status: "FAILED",
        entity: "master_actions",
        entityId: id ?? null,
        referenceNo: before?.code ?? null,
        before,
        error,
        remarks: "Action not updated",
      });
    }

    return handleError(res, error);
  }
};

module.exports = {
  loadMasterActions,
  getMasterActions,
  addMasterActions,
  editMasterActions,
};