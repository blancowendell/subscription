const crypto = require("crypto");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
} = require("../../services/repository/response");
const { SelectParameter, Transaction } = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger");
const { text, normalizeCode } = require("../../services/utility/validation");
const {
  GetCurrentDate,
  AddDay,
  AddMonth,
  IsValidDate,
  IsDateBefore,
  MaxDate,
} = require("../../services/repository/customhelper");
const { QueueProvisionJob, ResolveStartAction } = require("../../services/utility/provisionService");

const CYCLES = ["MONTHLY", "YEARLY"];
const LIVE_STATUSES = ["PENDING", "TRIAL", "ACTIVE", "SUSPENDED"];
const REMARKS_MAX = 255;
const EXTEND_MAX_DAYS = 365;
const AUDIT_MODULE = "Subscription";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

// ==========================================
// Helpers
// ==========================================

const newRef = () =>
  `SUB-${GetCurrentDate().replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const cyclePrice = (plan, cycle) =>
  Number(cycle === "YEARLY" ? plan.mp_price_yearly : plan.mp_price_monthly);

// Last covered day of a period that starts on `start` (inclusive).
const periodEnd = (start, cycle) => AddDay(AddMonth(start, cycle === "YEARLY" ? 12 : 1), -1);

const graceEnd = (end, graceDays) => AddDay(end, Number(graceDays) || 0);

const readRemarks = (body) => {
  const remarks = text(body?.remarks) || null;
  if (remarks && remarks.length > REMARKS_MAX)
    return { error: `Remarks can be up to ${REMARKS_MAX} characters.` };
  return { remarks };
};

const SELECT_SUBSCRIPTION = `
  SELECT sb.s_id AS id,
         sb.s_ref AS ref,
         sb.s_account_id AS account_id,
         ca.ca_tenant_code AS tenant_code,
         ca.ca_company_name AS company_name,
         sb.s_plan_id AS plan_id,
         mp.mp_code AS plan_code,
         mp.mp_name AS plan_name,
         sb.s_billing_cycle AS billing_cycle,
         sb.s_price AS price,
         sb.s_is_trial AS is_trial,
         DATE_FORMAT(sb.s_start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(sb.s_end_date, '%Y-%m-%d') AS end_date,
         DATE_FORMAT(sb.s_grace_end_date, '%Y-%m-%d') AS grace_end_date,
         REPLACE(REPLACE(sb.s_cancelled_at, 'T', ' '), 'Z', '') AS cancelled_at,
         sb.s_cancel_reason AS cancel_reason,
         sb.s_status AS status,
         REPLACE(REPLACE(sb.s_create_date, 'T', ' '), 'Z', '') AS create_date,
         sb.s_create_by AS create_by,
         REPLACE(REPLACE(sb.s_update_date, 'T', ' '), 'Z', '') AS update_date,
         sb.s_update_by AS update_by
    FROM subscription sb
    INNER JOIN client_account ca ON ca.ca_id = sb.s_account_id
    INNER JOIN master_plan mp ON mp.mp_id = sb.s_plan_id`;

// Raw row used by actions (dates as YYYY-MM-DD strings).
const loadSubscription = async (id) => {
  const rows = await query(
    `SELECT sb.*,
            DATE_FORMAT(sb.s_start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(sb.s_end_date, '%Y-%m-%d') AS end_date,
            ca.ca_tenant_code AS tenant_code
       FROM subscription sb
       INNER JOIN client_account ca ON ca.ca_id = sb.s_account_id
      WHERE sb.s_id = ?`,
    [id]
  );
  return rows[0] || null;
};

const loadPlan = async (planId) => {
  const rows = await query(`SELECT * FROM master_plan WHERE mp_id = ?`, [planId]);
  return rows[0] || null;
};

const toSnapshot = (row) => ({
  id: row.s_id,
  ref: row.s_ref,
  accountId: row.s_account_id,
  planId: row.s_plan_id,
  billingCycle: row.s_billing_cycle,
  price: Number(row.s_price),
  isTrial: Number(row.s_is_trial) === 1,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.s_status,
});

const historyStatement = (h) => ({
  sql: `INSERT INTO subscription_history
          (sh_subscription_id, sh_action, sh_from_plan_id, sh_to_plan_id,
           sh_from_status, sh_to_status, sh_from_end_date, sh_to_end_date,
           sh_remarks, sh_create_date, sh_create_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
  values: [
    h.subscriptionId,
    h.action,
    h.fromPlanId ?? null,
    h.toPlanId ?? null,
    h.fromStatus ?? null,
    h.toStatus,
    h.fromEndDate ?? null,
    h.toEndDate,
    h.remarks ?? null,
    h.createBy,
  ],
});

// Shared flow for every action on an existing subscription:
// load → check status → build changes → UPDATE + history in one transaction → audit.
// build(current) returns { error } or
//   { set: { column: value }, action, toPlanId, remarks, auditRemarks, provision }
// provision = ERP job to queue after saving (SYNC, SUSPEND, REACTIVATE).
const runAction = async (req, res, { action, label, allowed, build }) => {
  const id = req.params.id;
  let before = null;
  let ref = null;

  try {
    const current = await loadSubscription(id);
    if (!current) {
      return res.status(404).json(JsonWarningResponse("Subscription not found."));
    }

    before = toSnapshot(current);
    ref = current.s_ref;

    if (!allowed.includes(current.s_status)) {
      return res
        .status(400)
        .json(
          JsonWarningResponse(`Can't ${label} a ${current.s_status.toLowerCase()} subscription.`)
        );
    }

    const change = await build(current);
    if (change.error) {
      return res.status(400).json(JsonWarningResponse(change.error));
    }

    const updatedBy = req.session.user.fullname;
    const set = change.set;
    const columns = Object.keys(set);

    await Transaction([
      {
        sql: `UPDATE subscription
              SET ${columns.map((c) => `${c} = ?`).join(", ")},
                  s_update_date = NOW(), s_update_by = ?
              WHERE s_id = ?`,
        values: [...columns.map((c) => set[c]), updatedBy, id],
      },
      historyStatement({
        subscriptionId: id,
        action: change.action || action,
        fromPlanId: current.s_plan_id,
        toPlanId: change.toPlanId ?? current.s_plan_id,
        fromStatus: current.s_status,
        toStatus: set.s_status ?? current.s_status,
        fromEndDate: current.end_date,
        toEndDate: set.s_end_date ?? current.end_date,
        remarks: change.remarks,
        createBy: updatedBy,
      }),
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: change.action || action,
      entity: "subscription",
      entityId: id,
      referenceNo: `${current.tenant_code} / ${ref}`,
      before,
      after: { ...before, ...change.after },
      remarks: change.auditRemarks || change.remarks || `Subscription ${label}`,
    });

    let jobId = null;
    if (change.provision) {
      try {
        jobId = await QueueProvisionJob(id, change.provision, updatedBy);
      } catch (queueError) {
        console.error("Queue Provision Error:", queueError);
        return res
          .status(200)
          .json(
            JsonWarningResponse(
              "Saved, but the ERP update couldn't be queued. Queue it from Provision Jobs."
            )
          );
      }
    }

    return res.status(200).json(JsonDataResponse({ jobId }));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action,
      status: "FAILED",
      entity: "subscription",
      entityId: id,
      referenceNo: ref,
      before,
      error,
      remarks: `Subscription not updated: ${label} (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// ==========================================
// Reads
// ==========================================

// GET /subscription/load-subscription?status=ACTIVE — all subscriptions (optional status filter)
const getSubscriptions = async (req, res) => {
  try {
    const status = normalizeCode(req.query?.status);
    const rows = status
      ? await query(`${SELECT_SUBSCRIPTION} WHERE sb.s_status = ? ORDER BY sb.s_id DESC`, [
          status,
        ])
      : await query(`${SELECT_SUBSCRIPTION} ORDER BY sb.s_id DESC`);
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /subscription/get-subscription/:id — one subscription
const getSubscriptionById = async (req, res) => {
  try {
    const rows = await query(`${SELECT_SUBSCRIPTION} WHERE sb.s_id = ?`, [req.params.id]);
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /subscription/load-account-subscription/:accountId — all subscriptions of one client
const getAccountSubscriptions = async (req, res) => {
  try {
    const rows = await query(
      `${SELECT_SUBSCRIPTION} WHERE sb.s_account_id = ? ORDER BY sb.s_id DESC`,
      [req.params.accountId]
    );
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /subscription/load-subscription-history/:id — change log of one subscription
const getSubscriptionHistory = async (req, res) => {
  try {
    const rows = await query(
      `SELECT sh.sh_id AS id,
              sh.sh_action AS action,
              fp.mp_code AS from_plan_code,
              tp.mp_code AS to_plan_code,
              sh.sh_from_status AS from_status,
              sh.sh_to_status AS to_status,
              DATE_FORMAT(sh.sh_from_end_date, '%Y-%m-%d') AS from_end_date,
              DATE_FORMAT(sh.sh_to_end_date, '%Y-%m-%d') AS to_end_date,
              sh.sh_remarks AS remarks,
              REPLACE(REPLACE(sh.sh_create_date, 'T', ' '), 'Z', '') AS create_date,
              sh.sh_create_by AS create_by
         FROM subscription_history sh
         LEFT JOIN master_plan fp ON fp.mp_id = sh.sh_from_plan_id
         LEFT JOIN master_plan tp ON tp.mp_id = sh.sh_to_plan_id
        WHERE sh.sh_subscription_id = ?
        ORDER BY sh.sh_id DESC`,
      [req.params.id]
    );
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// ==========================================
// Create
// ==========================================

// POST /subscription/add-subscription — { accountId, planId, billingCycle, startDate, isTrial, remarks }
// One live subscription (PENDING/TRIAL/ACTIVE/SUSPENDED) per account.
// Trial: only once per account, plan must have trial days.
// Admin-created paid subscriptions start ACTIVE (payment handled outside for now).
const addSubscription = async (req, res) => {
  const accountId = Number(req.body?.accountId);
  let tenantCode = null;

  try {
    const accounts = await query(
      `SELECT ca_id, ca_tenant_code, ca_status FROM client_account WHERE ca_id = ?`,
      [accountId]
    );
    if (accounts.length === 0) {
      return res.status(404).json(JsonWarningResponse("Client account not found."));
    }
    tenantCode = accounts[0].ca_tenant_code;
    if (accounts[0].ca_status !== "ACTIVE") {
      return res.status(400).json(JsonWarningResponse("Client account must be active."));
    }

    const plan = await loadPlan(req.body?.planId);
    if (!plan) {
      return res.status(404).json(JsonWarningResponse("Plan not found."));
    }
    if (plan.mp_status !== "ACTIVE") {
      return res.status(400).json(JsonWarningResponse("Plan is inactive."));
    }

    const cycle = normalizeCode(req.body?.billingCycle);
    if (!CYCLES.includes(cycle)) {
      return res.status(400).json(JsonWarningResponse("Billing cycle must be MONTHLY or YEARLY."));
    }

    const startDate = text(req.body?.startDate) || GetCurrentDate();
    if (!IsValidDate(startDate)) {
      return res.status(400).json(JsonWarningResponse("Start date must be YYYY-MM-DD."));
    }

    const { remarks, error: badRemarks } = readRemarks(req.body);
    if (badRemarks) {
      return res.status(400).json(JsonWarningResponse(badRemarks));
    }

    const live = await query(
      `SELECT s_id FROM subscription WHERE s_account_id = ? AND s_status IN (?) LIMIT 1`,
      [accountId, LIVE_STATUSES]
    );
    if (live.length > 0) {
      return res
        .status(409)
        .json(JsonWarningResponse("This client already has a live subscription."));
    }

    const isTrial = req.body?.isTrial === true || req.body?.isTrial === 1 || req.body?.isTrial === "1";
    if (isTrial) {
      if (Number(plan.mp_trial_days) <= 0) {
        return res.status(400).json(JsonWarningResponse("This plan has no trial."));
      }
      const usedTrial = await query(
        `SELECT s_id FROM subscription WHERE s_account_id = ? AND s_is_trial = 1 LIMIT 1`,
        [accountId]
      );
      if (usedTrial.length > 0) {
        return res.status(400).json(JsonWarningResponse("This client already used a trial."));
      }
    }

    const endDate = isTrial
      ? AddDay(startDate, Number(plan.mp_trial_days) - 1)
      : periodEnd(startDate, cycle);
    const status = isTrial ? "TRIAL" : "ACTIVE";
    const price = cyclePrice(plan, cycle);
    const ref = newRef();
    const createBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `INSERT INTO subscription
                (s_ref, s_account_id, s_plan_id, s_billing_cycle, s_price, s_is_trial,
                 s_start_date, s_end_date, s_grace_end_date, s_cancelled_at, s_cancel_reason,
                 s_status, s_create_date, s_create_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NOW(), ?)`,
        values: [
          ref,
          accountId,
          plan.mp_id,
          cycle,
          price,
          isTrial ? 1 : 0,
          startDate,
          endDate,
          graceEnd(endDate, plan.mp_grace_days),
          status,
          createBy,
        ],
      },
      {
        sql: `INSERT INTO subscription_history
                (sh_subscription_id, sh_action, sh_from_plan_id, sh_to_plan_id,
                 sh_from_status, sh_to_status, sh_from_end_date, sh_to_end_date,
                 sh_remarks, sh_create_date, sh_create_by)
              VALUES (LAST_INSERT_ID(), 'CREATE', NULL, ?, NULL, ?, NULL, ?, ?, NOW(), ?)`,
        values: [plan.mp_id, status, endDate, remarks, createBy],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "subscription",
      entityId: null,
      referenceNo: `${tenantCode} / ${ref}`,
      after: {
        ref,
        accountId,
        planCode: plan.mp_code,
        billingCycle: cycle,
        price,
        isTrial,
        startDate,
        endDate,
        status,
      },
      remarks: remarks || (isTrial ? "Trial subscription created" : "Subscription created"),
    });

    const created = await query(`SELECT s_id FROM subscription WHERE s_ref = ? LIMIT 1`, [ref]);
    const id = created[0]?.s_id;

    let jobId = null;
    try {
      const startAction = await ResolveStartAction(tenantCode);
      jobId = await QueueProvisionJob(id, startAction, createBy);
    } catch (queueError) {
      console.error("Queue Provision Error:", queueError);
      return res
        .status(200)
        .json(
          JsonWarningResponse(
            `Subscription ${ref} created, but the ERP setup couldn't be queued. Queue it from Provision Jobs.`
          )
        );
    }

    return res.status(200).json(JsonDataResponse({ id, ref, jobId }));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: "subscription",
      entityId: null,
      referenceNo: tenantCode,
      error,
      remarks: "Subscription not created",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// ==========================================
// Actions
// ==========================================

// PUT /subscription/change-plan/:id — { planId, billingCycle, remarks }
// Takes effect now; the new plan's price is locked in. Dates stay the same until renewal.
const changePlan = (req, res) =>
  runAction(req, res, {
    action: "CHANGE_PLAN",
    label: "change the plan of",
    allowed: ["TRIAL", "ACTIVE"],
    build: async (current) => {
      const plan = await loadPlan(req.body?.planId);
      if (!plan) return { error: "Plan not found." };
      if (plan.mp_status !== "ACTIVE") return { error: "Plan is inactive." };

      const cycle = normalizeCode(req.body?.billingCycle) || current.s_billing_cycle;
      if (!CYCLES.includes(cycle)) return { error: "Billing cycle must be MONTHLY or YEARLY." };

      const samePlan = Number(plan.mp_id) === Number(current.s_plan_id);
      if (samePlan && cycle === current.s_billing_cycle) {
        return { error: "Nothing to change; that's the current plan and cycle." };
      }

      const { remarks, error } = readRemarks(req.body);
      if (error) return { error };

      let action = "CHANGE_CYCLE";
      if (!samePlan) {
        const currentPlan = await loadPlan(current.s_plan_id);
        action =
          Number(plan.mp_price_monthly) >= Number(currentPlan?.mp_price_monthly || 0)
            ? "UPGRADE"
            : "DOWNGRADE";
      }

      const price = cyclePrice(plan, cycle);
      return {
        action,
        toPlanId: plan.mp_id,
        set: { s_plan_id: plan.mp_id, s_billing_cycle: cycle, s_price: price },
        after: { planId: plan.mp_id, billingCycle: cycle, price },
        provision: "SYNC",
        remarks,
        auditRemarks: remarks || `${action} to ${plan.mp_code} (${cycle})`,
      };
    },
  });

// PUT /subscription/renew-subscription/:id — { remarks }
// Adds one billing period. Starts the day after the current end, or today if already past.
// A trial that renews becomes a paid subscription.
const renewSubscription = (req, res) =>
  runAction(req, res, {
    action: "RENEW",
    label: "renew",
    allowed: ["TRIAL", "ACTIVE", "EXPIRED"],
    build: async (current) => {
      const { remarks, error } = readRemarks(req.body);
      if (error) return { error };

      const plan = await loadPlan(current.s_plan_id);
      const nextStart = MaxDate(AddDay(current.end_date, 1), GetCurrentDate());
      const endDate = periodEnd(nextStart, current.s_billing_cycle);
      const wasTrial = Number(current.s_is_trial) === 1;
      const price = wasTrial ? cyclePrice(plan, current.s_billing_cycle) : Number(current.s_price);

      return {
        set: {
          s_end_date: endDate,
          s_grace_end_date: graceEnd(endDate, plan.mp_grace_days),
          s_is_trial: 0,
          s_price: price,
          s_status: "ACTIVE",
        },
        after: { endDate, isTrial: false, price, status: "ACTIVE" },
        provision: current.s_status === "EXPIRED" ? "REACTIVATE" : "SYNC",
        remarks,
        auditRemarks: remarks || `Renewed until ${endDate}`,
      };
    },
  });

// PUT /subscription/extend-subscription/:id — { days, remarks }
// Free extra days (goodwill, downtime credit). Remarks required.
const extendSubscription = (req, res) =>
  runAction(req, res, {
    action: "EXTEND",
    label: "extend",
    allowed: ["TRIAL", "ACTIVE", "SUSPENDED"],
    build: async (current) => {
      const days = Number(req.body?.days);
      if (!Number.isInteger(days) || days < 1 || days > EXTEND_MAX_DAYS) {
        return { error: `Days must be a whole number from 1 to ${EXTEND_MAX_DAYS}.` };
      }

      const { remarks, error } = readRemarks(req.body);
      if (error) return { error };
      if (!remarks) return { error: "Remarks are required when extending." };

      const plan = await loadPlan(current.s_plan_id);
      const endDate = AddDay(current.end_date, days);

      return {
        set: {
          s_end_date: endDate,
          s_grace_end_date: graceEnd(endDate, plan.mp_grace_days),
        },
        after: { endDate },
        provision: "SYNC",
        remarks,
        auditRemarks: `Extended ${days} day(s) until ${endDate}: ${remarks}`,
      };
    },
  });

// PUT /subscription/suspend-subscription/:id — { remarks }
const suspendSubscription = (req, res) =>
  runAction(req, res, {
    action: "SUSPEND",
    label: "suspend",
    allowed: ["TRIAL", "ACTIVE"],
    build: async () => {
      const { remarks, error } = readRemarks(req.body);
      if (error) return { error };
      if (!remarks) return { error: "Remarks are required when suspending." };

      return {
        set: { s_status: "SUSPENDED" },
        after: { status: "SUSPENDED" },
        provision: "SUSPEND",
        remarks,
      };
    },
  });

// PUT /subscription/reactivate-subscription/:id — { remarks }
// Only while still within the paid/trial period; otherwise renew instead.
const reactivateSubscription = (req, res) =>
  runAction(req, res, {
    action: "REACTIVATE",
    label: "reactivate",
    allowed: ["SUSPENDED"],
    build: async (current) => {
      const { remarks, error } = readRemarks(req.body);
      if (error) return { error };

      if (IsDateBefore(current.end_date, GetCurrentDate())) {
        return { error: "This subscription has already ended. Renew it instead." };
      }

      const status = Number(current.s_is_trial) === 1 ? "TRIAL" : "ACTIVE";
      return {
        set: { s_status: status },
        after: { status },
        provision: "REACTIVATE",
        remarks,
      };
    },
  });

// PUT /subscription/cancel-subscription/:id — { remarks }
const cancelSubscription = (req, res) =>
  runAction(req, res, {
    action: "CANCEL",
    label: "cancel",
    allowed: LIVE_STATUSES,
    build: async () => {
      const { remarks, error } = readRemarks(req.body);
      if (error) return { error };
      if (!remarks) return { error: "A reason is required when cancelling." };

      return {
        set: {
          s_status: "CANCELLED",
          s_cancelled_at: new Date(),
          s_cancel_reason: remarks,
        },
        after: { status: "CANCELLED" },
        provision: "SUSPEND",
        remarks,
      };
    },
  });

module.exports = {
  getSubscriptions,
  getSubscriptionById,
  getAccountSubscriptions,
  getSubscriptionHistory,
  addSubscription,
  changePlan,
  renewSubscription,
  extendSubscription,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscription,
};