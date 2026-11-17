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
const CODE_MAX = 30;
const NAME_MAX = 50;
const DESC_MAX = 255;
const PRICE_MAX = 9999999999.99;
const CODE_PATTERN = /^[A-Z0-9_]+$/;
const AUDIT_MODULE = "Master Plan";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const baseSelect = () =>
  SelectAllStatement(Master.master_plan.tablename, Master.master_plan.selectColumns);

const toPlans = (rows) =>
  rows.length ? DataModeling(rows, Master.master_plan.prefix_) : [];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

const toMoney = (v) => {
  if (isBlank(v)) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

const toWhole = (v) => {
  if (isBlank(v)) return NaN;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

const toBool = (v) => v === true || v === 1 || v === "1" || v === "true";

const readPlan = (body = {}) => ({
  name: String(body.planName || "").trim(),
  description: String(body.planDescription || "").trim() || null,
  priceMonthly: toMoney(body.priceMonthly),
  priceYearly: toMoney(body.priceYearly),
  trialDays: toWhole(body.trialDays),
  graceDays: toWhole(body.graceDays),
  sortOrder: toWhole(body.sortOrder),
  isPublic: toBool(body.isPublic),
});

const validatePlan = (p) => {
  if (!p.name) return "Name is required.";
  if (p.name.length > NAME_MAX) return `Name can be up to ${NAME_MAX} characters.`;
  if (p.description && p.description.length > DESC_MAX)
    return `Description can be up to ${DESC_MAX} characters.`;
  if (Number.isNaN(p.priceMonthly) || p.priceMonthly < 0 || p.priceMonthly > PRICE_MAX)
    return "Monthly price must be a valid amount, 0 or more.";
  if (Number.isNaN(p.priceYearly) || p.priceYearly < 0 || p.priceYearly > PRICE_MAX)
    return "Yearly price must be a valid amount, 0 or more.";
  if (Number.isNaN(p.trialDays) || p.trialDays < 0)
    return "Trial days must be a whole number, 0 or more.";
  if (Number.isNaN(p.graceDays) || p.graceDays < 0)
    return "Grace days must be a whole number, 0 or more.";
  if (Number.isNaN(p.sortOrder) || p.sortOrder < 0)
    return "Sort order must be a whole number, 0 or more.";
  return null;
};

const rowToSnapshot = (row) => ({
  id: row.mp_id,
  code: row.mp_code,
  name: row.mp_name,
  description: row.mp_description,
  priceMonthly: Number(row.mp_price_monthly),
  priceYearly: Number(row.mp_price_yearly),
  trialDays: row.mp_trial_days,
  graceDays: row.mp_grace_days,
  sortOrder: row.mp_sort_order,
  isPublic: Number(row.mp_is_public) === 1,
  status: row.mp_status,
});

// GET /plan/load-plan — all plans
const getPlans = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} ORDER BY mp_sort_order, mp_name`);
    return res.json(JsonDataResponse(toPlans(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /plan/get-plan/:id — one plan
const getPlanById = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE mp_id = ?`, [req.params.id]);
    return res.json(JsonDataResponse(toPlans(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /plan/add-plan — { planCode, planName, planDescription, priceMonthly, priceYearly, trialDays, graceDays, sortOrder, isPublic }
const addPlan = async (req, res) => {
  const code = String(req.body?.planCode || "").trim().toUpperCase();

  try {
    if (!code) {
      return res.status(400).json(JsonWarningResponse("Code is required."));
    }
    if (code.length > CODE_MAX) {
      return res.status(400).json(JsonWarningResponse(`Code can be up to ${CODE_MAX} characters.`));
    }
    if (!CODE_PATTERN.test(code)) {
      return res
        .status(400)
        .json(JsonWarningResponse("Code can only use letters, numbers, and underscores."));
    }

    const plan = readPlan(req.body);
    const invalid = validatePlan(plan);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const existing = await query(
      `SELECT mp_id FROM master_plan WHERE mp_code = ? OR mp_name = ? LIMIT 1`,
      [code, plan.name]
    );
    if (existing.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const createBy = req.session.user.fullname;

    const result = await TransactionWithReturn([
      {
        sql: `INSERT INTO master_plan
                (mp_code, mp_name, mp_description, mp_price_monthly, mp_price_yearly,
                 mp_trial_days, mp_grace_days, mp_sort_order, mp_is_public,
                 mp_status, mp_create_date, mp_create_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?)`,
        values: [
          code,
          plan.name,
          plan.description,
          plan.priceMonthly,
          plan.priceYearly,
          plan.trialDays,
          plan.graceDays,
          plan.sortOrder,
          plan.isPublic ? 1 : 0,
          createBy,
        ],
      },
    ]);

    let id = result?.insertId ?? result?.[0]?.insertId;
    if (!id) {
      const created = await query(`SELECT mp_id FROM master_plan WHERE mp_code = ? LIMIT 1`, [code]);
      id = created[0]?.mp_id;
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "master_plan",
      entityId: id,
      referenceNo: code,
      after: { id, code, ...plan, status: "ACTIVE" },
      remarks: "Plan created",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: "master_plan",
      entityId: null,
      referenceNo: code || null,
      error,
      remarks: "Plan not created",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /plan/update-plan/:id — { planName, planDescription, priceMonthly, priceYearly, trialDays, graceDays, sortOrder, isPublic, planStatus }
// Plan code is locked after creation; tenants in the ERP store it as plan_code.
const updatePlan = async (req, res) => {
  const id = req.params.id;
  let before = null;

  try {
    const rows = await query(`SELECT * FROM master_plan WHERE mp_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Plan not found."));
    }

    const current = rows[0];
    before = rowToSnapshot(current);

    const requestedCode = String(req.body?.planCode || "").trim().toUpperCase();
    if (requestedCode && requestedCode !== current.mp_code) {
      return res.status(400).json(JsonWarningResponse("Plan code can't be changed."));
    }

    const plan = readPlan(req.body);
    const invalid = validatePlan(plan);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const status = req.body?.planStatus;
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Unknown status."));
    }

    const duplicate = await query(
      `SELECT mp_id FROM master_plan WHERE mp_name = ? AND mp_id <> ? LIMIT 1`,
      [plan.name, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE master_plan
              SET mp_name = ?, mp_description = ?, mp_price_monthly = ?, mp_price_yearly = ?,
                  mp_trial_days = ?, mp_grace_days = ?, mp_sort_order = ?, mp_is_public = ?,
                  mp_status = ?, mp_update_date = NOW(), mp_update_by = ?
              WHERE mp_id = ?`,
        values: [
          plan.name,
          plan.description,
          plan.priceMonthly,
          plan.priceYearly,
          plan.trialDays,
          plan.graceDays,
          plan.sortOrder,
          plan.isPublic ? 1 : 0,
          status,
          updatedBy,
          id,
        ],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "master_plan",
      entityId: id,
      referenceNo: current.mp_code,
      before,
      after: { id: current.mp_id, code: current.mp_code, ...plan, status },
      remarks:
        current.mp_status !== status
          ? `Plan ${status === "ACTIVE" ? "activated" : "deactivated"}`
          : "Plan updated",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "master_plan",
      entityId: id,
      referenceNo: before?.code || null,
      before,
      error,
      remarks: `Plan not updated (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getPlans,
  getPlanById,
  addPlan,
  updatePlan,
};