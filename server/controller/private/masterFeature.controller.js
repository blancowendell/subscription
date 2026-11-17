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
const TYPES = ["MODULE", "LIMIT"];
const CODE_MAX = 50;
const NAME_MAX = 100;
const MODULE_MAX = 50;
const DESC_MAX = 255;
const CODE_PATTERN = /^[A-Z0-9_]+$/;
const AUDIT_MODULE = "Master Feature";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const baseSelect = () =>
  SelectAllStatement(Master.master_feature.tablename, Master.master_feature.selectColumns);

const toFeatures = (rows) =>
  rows.length ? DataModeling(rows, Master.master_feature.prefix_) : [];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

const toWhole = (v) => {
  if (isBlank(v)) return NaN;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

const toCode = (v) => String(v || "").trim().toUpperCase();

const readFeature = (body = {}) => ({
  name: String(body.featureName || "").trim(),
  module: toCode(body.featureModule),
  description: String(body.featureDescription || "").trim() || null,
  sortOrder: toWhole(body.sortOrder),
});

const validateCode = (code, label) => {
  if (!code) return `${label} is required.`;
  if (code.length > CODE_MAX) return `${label} can be up to ${CODE_MAX} characters.`;
  if (!CODE_PATTERN.test(code)) return `${label} can only use letters, numbers, and underscores.`;
  return null;
};

const validateFeature = (f) => {
  if (!f.name) return "Name is required.";
  if (f.name.length > NAME_MAX) return `Name can be up to ${NAME_MAX} characters.`;
  if (!f.module) return "Module is required.";
  if (f.module.length > MODULE_MAX) return `Module can be up to ${MODULE_MAX} characters.`;
  if (!CODE_PATTERN.test(f.module)) return "Module can only use letters, numbers, and underscores.";
  if (f.description && f.description.length > DESC_MAX)
    return `Description can be up to ${DESC_MAX} characters.`;
  if (Number.isNaN(f.sortOrder) || f.sortOrder < 0)
    return "Sort order must be a whole number, 0 or more.";
  return null;
};

const rowToSnapshot = (row) => ({
  id: row.mf_id,
  code: row.mf_code,
  name: row.mf_name,
  module: row.mf_module,
  type: row.mf_type,
  description: row.mf_description,
  sortOrder: row.mf_sort_order,
  status: row.mf_status,
});

// GET /feature/load-feature — all features
const getFeatures = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} ORDER BY mf_module, mf_sort_order, mf_name`);
    return res.json(JsonDataResponse(toFeatures(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /feature/get-feature/:id — one feature
const getFeatureById = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE mf_id = ?`, [req.params.id]);
    return res.json(JsonDataResponse(toFeatures(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /feature/add-feature — { featureCode, featureName, featureModule, featureType, featureDescription, sortOrder }
const addFeature = async (req, res) => {
  const code = toCode(req.body?.featureCode);

  try {
    const badCode = validateCode(code, "Code");
    if (badCode) {
      return res.status(400).json(JsonWarningResponse(badCode));
    }

    const type = toCode(req.body?.featureType);
    if (!TYPES.includes(type)) {
      return res.status(400).json(JsonWarningResponse("Type must be MODULE or LIMIT."));
    }

    const feature = readFeature(req.body);
    const invalid = validateFeature(feature);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const existing = await query(`SELECT mf_id FROM master_feature WHERE mf_code = ? LIMIT 1`, [code]);
    if (existing.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const createBy = req.session.user.fullname;

    const result = await TransactionWithReturn([
      {
        sql: `INSERT INTO master_feature
                (mf_code, mf_name, mf_module, mf_type, mf_description, mf_sort_order,
                 mf_status, mf_create_date, mf_create_by)
              VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?)`,
        values: [
          code,
          feature.name,
          feature.module,
          type,
          feature.description,
          feature.sortOrder,
          createBy,
        ],
      },
    ]);

    let id = result?.insertId ?? result?.[0]?.insertId;
    if (!id) {
      const created = await query(`SELECT mf_id FROM master_feature WHERE mf_code = ? LIMIT 1`, [code]);
      id = created[0]?.mf_id;
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "master_feature",
      entityId: id,
      referenceNo: code,
      after: { id, code, type, ...feature, status: "ACTIVE" },
      remarks: "Feature created",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: "master_feature",
      entityId: null,
      referenceNo: code || null,
      error,
      remarks: "Feature not created",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /feature/update-feature/:id — { featureName, featureModule, featureDescription, sortOrder, featureStatus }
// Code and type are locked after creation; the ERP checks features by code,
// and plan limits depend on the type.
const updateFeature = async (req, res) => {
  const id = req.params.id;
  let before = null;

  try {
    const rows = await query(`SELECT * FROM master_feature WHERE mf_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Feature not found."));
    }

    const current = rows[0];
    before = rowToSnapshot(current);

    const requestedCode = toCode(req.body?.featureCode);
    if (requestedCode && requestedCode !== current.mf_code) {
      return res.status(400).json(JsonWarningResponse("Feature code can't be changed."));
    }

    const requestedType = toCode(req.body?.featureType);
    if (requestedType && requestedType !== current.mf_type) {
      return res.status(400).json(JsonWarningResponse("Feature type can't be changed."));
    }

    const feature = readFeature(req.body);
    const invalid = validateFeature(feature);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const status = req.body?.featureStatus;
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Unknown status."));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE master_feature
              SET mf_name = ?, mf_module = ?, mf_description = ?, mf_sort_order = ?,
                  mf_status = ?, mf_update_date = NOW(), mf_update_by = ?
              WHERE mf_id = ?`,
        values: [
          feature.name,
          feature.module,
          feature.description,
          feature.sortOrder,
          status,
          updatedBy,
          id,
        ],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_feature",
      entityId: id,
      referenceNo: current.mf_code,
      before,
      after: {
        id: current.mf_id,
        code: current.mf_code,
        type: current.mf_type,
        ...feature,
        status,
      },
      remarks:
        current.mf_status !== status
          ? `Feature ${status === "ACTIVE" ? "activated" : "deactivated"}`
          : "Feature updated",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "master_feature",
      entityId: id,
      referenceNo: before?.code || null,
      before,
      error,
      remarks: `Feature not updated (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getFeatures,
  getFeatureById,
  addFeature,
  updateFeature,
};