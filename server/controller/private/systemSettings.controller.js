const {
  JsonErrorResponse,
  JsonDataResponse,
  MessageStatus,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { validateOrLink } = require("../../services/utility/validator");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { System } = require("../../database/model/System"); // ADJUST to your generated model
const {
  DataModeling,
  SelectParameter,
  Select,
  Check,
  SelectStatement,
  SelectAllStatement,
  InsertStatementTransCommit,
  UpdateStatement,
  TransactionWithReturn,
} = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const SS = System.system_settings;
const AUDIT_MODULE = "System Settings";
const TYPES = ["BOOLEAN", "STRING", "NUMBER"];

const isValidKey = (key) => /^[A-Z0-9_]{2,100}$/.test(String(key ?? ""));

// Returns the value as stored ("1"/"0" for BOOLEAN), or null if invalid for the type.
const normalizeValue = (type, value) => {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();

  if (type === "BOOLEAN") {
    const lower = v.toLowerCase();
    if (["1", "true", "on"].includes(lower)) return "1";
    if (["0", "false", "off"].includes(lower)) return "0";
    return null;
  }

  if (type === "NUMBER") {
    return v !== "" && !isNaN(Number(v)) ? v : null;
  }

  return v !== "" ? v : null;
};

const selectSql = () => SelectAllStatement(SS.tablename, SS.selectColumns, SS.selectDateFormatColumns);

// GET
const loadSystemSettings = async (req, res) => {
  try {
    Select(`${selectSql()} ORDER BY ss_key`, (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }
      const rows = result || [];
      return res.json(JsonDataResponse(rows.length ? DataModeling(rows, SS.prefix_) : []));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error.message));
  }
};

// GET BY ID
const getSystemSettings = async (req, res) => {
  try {
    const { id } = req.params;

    SelectParameter(`${selectSql()} WHERE ss_id = ?`, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }
      const rows = result || [];
      if (rows.length === 0) {
        return res.status(404).json(JsonWarningResponse(MessageStatus.NOTEXIST));
      }
      return res.json(JsonDataResponse(DataModeling(rows, SS.prefix_)[0]));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error.message));
  }
};

// POST — { key, value, type, description }
const addSystemSettings = async (req, res) => {
  const key = req.body?.key ? String(req.body.key).trim().toUpperCase() : null;

  try {
    const required = {
      key: "Key is required",
      value: "Value is required",
    };

    if (!validateOrLink(req, res, required)) return;

    const type = TYPES.includes(req.body.type) ? req.body.type : "BOOLEAN";
    const description = req.body.description ? String(req.body.description).trim() : null;

    if (!isValidKey(key)) {
      return res
        .status(400)
        .json(JsonWarningResponse("Key must be letters, numbers and underscores only (e.g. FIFO_ENABLED)."));
    }

    const value = normalizeValue(type, req.body.value);
    if (value === null) {
      return res.status(400).json(JsonWarningResponse(`Invalid value for a ${type} setting.`));
    }

    const exists = await Check(SelectStatement(`SELECT 1 FROM system_settings WHERE ss_key = ?`, [key]));
    if (exists.length > 0) {
      return res.status(409).json(JsonWarningResponse("This setting key already exists."));
    }

    const create_by = req.session.user.fullname;
    const now = GetCurrentDatetime();

    const sql = InsertStatementTransCommit(SS.tablename, SS.prefix, SS.insertColumns);

    // Order must match insertColumns.
    const data = [
      key, // key
      value, // value
      type, // type
      description, // description
      create_by, // created_by
      null, // updated_by
      now, // created_at
      now, // updated_at
    ];

    const result = await TransactionWithReturn([{ sql, values: data }]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: SS.tablename,
      entityId: result?.insertId ?? result?.[0]?.insertId ?? null,
      referenceNo: key,
      after: { key, value, type, description },
      remarks: `Setting created: ${key} = ${value}`,
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: SS.tablename,
      referenceNo: key,
      error,
      remarks: "Setting not created",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

// PUT — { value?, description? }. Key and type are not editable.
const editSystemSettings = async (req, res) => {
  const { id } = req.params;
  let current = null;

  try {
    const { value, description } = req.body || {};

    if (value === undefined && description === undefined) {
      return res.status(400).json(JsonWarningResponse("Nothing to update."));
    }

    const existing = await Check(
      SelectStatement(
        `SELECT ss_key, ss_type, ss_value, ss_description FROM system_settings WHERE ss_id = ?`,
        [id],
      ),
    );

    if (existing.length === 0) {
      return res.status(404).json(JsonWarningResponse(MessageStatus.NOTEXIST));
    }

    current = existing[0];
    const type = current.ss_type;
    const columns = [];
    const data = [];

    let newValue = current.ss_value;
    let newDescription = current.ss_description;

    if (value !== undefined) {
      const normalized = normalizeValue(type, value);
      if (normalized === null) {
        return res.status(400).json(JsonWarningResponse(`Invalid value for a ${type} setting.`));
      }
      newValue = normalized;
      columns.push(SS.updateOptionColumns.value);
      data.push(normalized);
    }

    if (description !== undefined) {
      newDescription = description ? String(description).trim() : null;
      columns.push(SS.updateOptionColumns.description);
      data.push(newDescription);
    }

    columns.push(SS.updateOptionColumns.updated_by, SS.updateOptionColumns.updated_at);
    data.push(req.session.user.fullname, GetCurrentDatetime());

    const sql = UpdateStatement(SS.tablename, SS.prefix, columns, [SS.updateOptionColumns.id]);
    data.push(id);

    await TransactionWithReturn([{ sql, values: data }]);

    const before = {
      key: current.ss_key,
      value: current.ss_value,
      type,
      description: current.ss_description,
    };
    const after = { ...before, value: newValue, description: newDescription };

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: SS.tablename,
      entityId: id,
      referenceNo: current.ss_key,
      before,
      after,
      remarks:
        before.value !== after.value
          ? `${current.ss_key} changed ${before.value} → ${after.value}`
          : `${current.ss_key} description updated`,
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: SS.tablename,
      entityId: id ?? null,
      referenceNo: current?.ss_key ?? null,
      error,
      remarks: "Setting not changed",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

module.exports = {
  loadSystemSettings,
  getSystemSettings,
  addSystemSettings,
  editSystemSettings,
};