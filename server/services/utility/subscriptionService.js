const crypto = require("crypto");
const { SelectParameter, Transaction } = require("../connections/sqlhelper"); // ADJUST PATH
const { GetCurrentDate, AddDay, AddMonth } = require("../repository/customhelper"); // ADJUST PATH

// Shared subscription rules for the admin and client portals.

const CYCLES = ["MONTHLY", "YEARLY"];
const LIVE_STATUSES = ["PENDING", "TRIAL", "ACTIVE", "SUSPENDED"];

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const NewRef = () =>
  `SUB-${GetCurrentDate().replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const CyclePrice = (plan, cycle) =>
  Number(cycle === "YEARLY" ? plan.mp_price_yearly : plan.mp_price_monthly);

// Last covered day of a period starting on `start` (inclusive)
const PeriodEnd = (start, cycle) => AddDay(AddMonth(start, cycle === "YEARLY" ? 12 : 1), -1);

const GraceEnd = (end, graceDays) => AddDay(end, Number(graceDays) || 0);

const LoadPlan = async (planId) => {
  const rows = await query(`SELECT * FROM master_plan WHERE mp_id = ?`, [planId]);
  return rows[0] || null;
};

const GetLiveSubscription = async (accountId) => {
  const rows = await query(
    `SELECT s_id, s_ref, s_status FROM subscription
      WHERE s_account_id = ? AND s_status IN (?) ORDER BY s_id DESC LIMIT 1`,
    [accountId, LIVE_STATUSES]
  );
  return rows[0] || null;
};

const HasUsedTrial = async (accountId) => {
  const rows = await query(
    `SELECT s_id FROM subscription WHERE s_account_id = ? AND s_is_trial = 1 LIMIT 1`,
    [accountId]
  );
  return rows.length > 0;
};

// Creates a subscription + CREATE history row in one transaction.
// status: TRIAL | ACTIVE | PENDING. Returns { id, ref, status, startDate, endDate, price }.
const CreateSubscription = async ({ accountId, plan, cycle, startDate, isTrial, status, remarks, createBy }) => {
  const endDate = isTrial ? AddDay(startDate, Number(plan.mp_trial_days) - 1) : PeriodEnd(startDate, cycle);
  const graceEnd = isTrial ? endDate : GraceEnd(endDate, plan.mp_grace_days);
  const price = CyclePrice(plan, cycle);
  const ref = NewRef();

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
        graceEnd,
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
      values: [plan.mp_id, status, endDate, remarks || null, createBy],
    },
  ]);

  const created = await query(`SELECT s_id FROM subscription WHERE s_ref = ? LIMIT 1`, [ref]);
  return { id: created[0]?.s_id, ref, status, startDate, endDate, price };
};

module.exports = {
  CYCLES,
  LIVE_STATUSES,
  NewRef,
  CyclePrice,
  PeriodEnd,
  GraceEnd,
  LoadPlan,
  GetLiveSubscription,
  HasUsedTrial,
  CreateSubscription,
  Today: GetCurrentDate,
};