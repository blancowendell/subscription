const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { SelectParameter, Transaction } = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Master Plan Feature";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

const toWhole = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

const loadPlanFeatures = (planId) =>
  query(
    `SELECT mpf.mpf_id AS id,
            mpf.mpf_plan_id AS plan_id,
            mpf.mpf_feature_id AS feature_id,
            mf.mf_code AS feature_code,
            mf.mf_name AS feature_name,
            mf.mf_module AS feature_module,
            mf.mf_type AS feature_type,
            mf.mf_status AS feature_status,
            mpf.mpf_limit_value AS limit_value,
            REPLACE(REPLACE(mpf.mpf_create_date, 'T', ' '), 'Z', '') AS create_date,
            mpf.mpf_create_by AS create_by
       FROM master_plan_feature mpf
       INNER JOIN master_feature mf ON mf.mf_id = mpf.mpf_feature_id
      WHERE mpf.mpf_plan_id = ?
      ORDER BY mf.mf_module, mf.mf_sort_order, mf.mf_name`,
    [planId]
  );

const toSnapshot = (rows) =>
  rows.map((r) => ({ code: r.feature_code, limit: r.limit_value }));

// GET /plan-feature/load-plan-feature/:planId — features assigned to a plan
const getPlanFeatures = async (req, res) => {
  try {
    const rows = await loadPlanFeatures(req.params.planId);
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /plan-feature/save-plan-feature/:planId — { features: [{ featureId, limitValue }] }
// Replaces the plan's whole feature list in one transaction.
// MODULE features: limitValue is ignored (stored as NULL).
// LIMIT features: limitValue blank = unlimited (NULL), otherwise a whole number, 0 or more.
const savePlanFeatures = async (req, res) => {
  const planId = req.params.planId;
  let before = null;
  let planCode = null;

  try {
    const plans = await query(`SELECT mp_id, mp_code FROM master_plan WHERE mp_id = ?`, [planId]);
    if (plans.length === 0) {
      return res.status(404).json(JsonWarningResponse("Plan not found."));
    }
    planCode = plans[0].mp_code;

    const input = req.body?.features;
    if (!Array.isArray(input)) {
      return res.status(400).json(JsonWarningResponse("Features must be a list."));
    }

    const featureIds = input.map((f) => toWhole(f?.featureId));
    if (featureIds.some((id) => Number.isNaN(id) || id <= 0)) {
      return res.status(400).json(JsonWarningResponse("Every feature needs a valid feature ID."));
    }
    if (new Set(featureIds).size !== featureIds.length) {
      return res.status(400).json(JsonWarningResponse("A feature can only be added once per plan."));
    }

    const features = featureIds.length
      ? await query(
          `SELECT mf_id, mf_code, mf_type, mf_status FROM master_feature WHERE mf_id IN (?)`,
          [featureIds]
        )
      : [];
    const byId = new Map(features.map((f) => [Number(f.mf_id), f]));

    const rowsToInsert = [];
    for (const item of input) {
      const featureId = toWhole(item.featureId);
      const feature = byId.get(featureId);

      if (!feature) {
        return res.status(400).json(JsonWarningResponse(`Feature #${featureId} not found.`));
      }
      if (feature.mf_status !== "ACTIVE") {
        return res
          .status(400)
          .json(JsonWarningResponse(`Feature ${feature.mf_code} is inactive and can't be assigned.`));
      }

      let limit = null;
      if (feature.mf_type === "LIMIT" && !isBlank(item.limitValue)) {
        limit = toWhole(item.limitValue);
        if (Number.isNaN(limit) || limit < 0) {
          return res
            .status(400)
            .json(
              JsonWarningResponse(`Limit for ${feature.mf_code} must be a whole number, 0 or more.`)
            );
        }
      }

      rowsToInsert.push({ featureId, code: feature.mf_code, limit });
    }

    before = toSnapshot(await loadPlanFeatures(planId));

    const createBy = req.session.user.fullname;
    const statements = [
      {
        sql: `DELETE FROM master_plan_feature WHERE mpf_plan_id = ?`,
        values: [planId],
      },
    ];

    if (rowsToInsert.length) {
      statements.push({
        sql: `INSERT INTO master_plan_feature
                (mpf_plan_id, mpf_feature_id, mpf_limit_value, mpf_create_date, mpf_create_by)
              VALUES ${rowsToInsert.map(() => "(?, ?, ?, NOW(), ?)").join(", ")}`,
        values: rowsToInsert.flatMap((r) => [planId, r.featureId, r.limit, createBy]),
      });
    }

    await Transaction(statements);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_plan_feature",
      entityId: planId,
      referenceNo: planCode,
      before,
      after: rowsToInsert.map((r) => ({ code: r.code, limit: r.limit })),
      remarks: `Plan features saved (${rowsToInsert.length})`,
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "master_plan_feature",
      entityId: planId,
      referenceNo: planCode,
      before,
      error,
      remarks: `Plan features not saved (#${planId})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getPlanFeatures,
  savePlanFeatures,
};