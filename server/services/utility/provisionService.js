const crypto = require("crypto");
const { SelectParameter, Transaction } = require("../connections/sqlhelper"); // ADJUST PATH
const { GetCurrentDate } = require("../repository/customhelper"); // ADJUST PATH
const { SendToErp } = require("./erpClient");

const SYSTEM = "SYSTEM";
const ACTIONS = ["PROVISION", "SYNC", "SUSPEND", "REACTIVATE", "ARCHIVE"];
const MAX_ATTEMPTS = 5;
const RETRY_MINUTES = [1, 5, 15, 60]; // wait after attempt 1, 2, 3, 4
const STUCK_MINUTES = 10; // PROCESSING longer than this is reset to PENDING
const JOB_INTERVAL_MS = 30 * 1000;
const EXPIRY_INTERVAL_MS = 60 * 60 * 1000;
const BATCH_SIZE = 20;

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const errorText = (error) => String(error?.message || error).slice(0, 2000);

// ==========================================
// Payload
// ==========================================

// Full picture of the tenant: company, owner, plan, features, dates.
// Every action sends the same shape so the ERP can always resync from it.
const BuildPayload = async (subscriptionId, action, jobId = null) => {
  const rows = await query(
    `SELECT s.s_id, s.s_ref, s.s_billing_cycle, s.s_is_trial, s.s_status,
            DATE_FORMAT(s.s_start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(s.s_end_date, '%Y-%m-%d') AS end_date,
            DATE_FORMAT(s.s_grace_end_date, '%Y-%m-%d') AS grace_end_date,
            ca.ca_id, ca.ca_tenant_code, ca.ca_company_name, ca.ca_tin, ca.ca_address,
            ca.ca_business_type, ca.ca_contact_person, ca.ca_contact_email, ca.ca_contact_phone,
            mp.mp_id, mp.mp_code, mp.mp_name
       FROM subscription s
       INNER JOIN client_account ca ON ca.ca_id = s.s_account_id
       INNER JOIN master_plan mp ON mp.mp_id = s.s_plan_id
      WHERE s.s_id = ?`,
    [subscriptionId]
  );
  const sub = rows[0];
  if (!sub) throw new Error(`Subscription #${subscriptionId} not found.`);

  const owners = await query(
    `SELECT cu_fullname, cu_email FROM client_users
      WHERE cu_account_id = ? AND cu_role = 'OWNER' AND cu_status = 'ACTIVE'
      ORDER BY cu_id LIMIT 1`,
    [sub.ca_id]
  );

  const features = await query(
    `SELECT mf.mf_code AS code, mf.mf_type AS type, mpf.mpf_limit_value AS limit_value
       FROM master_plan_feature mpf
       INNER JOIN master_feature mf ON mf.mf_id = mpf.mpf_feature_id
      WHERE mpf.mpf_plan_id = ? AND mf.mf_status = 'ACTIVE'
      ORDER BY mf.mf_code`,
    [sub.mp_id]
  );

  return {
    action,
    job_id: jobId,
    subscription_ref: sub.s_ref,
    tenant_code: sub.ca_tenant_code,
    company: {
      name: sub.ca_company_name,
      tin: sub.ca_tin,
      address: sub.ca_address,
      business_type: sub.ca_business_type,
      contact_person: sub.ca_contact_person,
      contact_email: sub.ca_contact_email,
      contact_phone: sub.ca_contact_phone,
    },
    owner: owners[0] ? { fullname: owners[0].cu_fullname, email: owners[0].cu_email } : null,
    plan: { code: sub.mp_code, name: sub.mp_name },
    subscription: {
      status: sub.s_status,
      billing_cycle: sub.s_billing_cycle,
      is_trial: Number(sub.s_is_trial) === 1,
      start_date: sub.start_date,
      end_date: sub.end_date,
      grace_end_date: sub.grace_end_date,
    },
    features: features.map((f) => ({
      code: f.code,
      type: f.type,
      limit: f.limit_value === null ? null : Number(f.limit_value),
    })),
  };
};

// ==========================================
// Queue
// ==========================================

// For a new subscription: PROVISION if the tenant was never provisioned, else REACTIVATE.
const ResolveStartAction = async (tenantCode) => {
  const rows = await query(
    `SELECT pj_id FROM provision_job
      WHERE pj_tenant_code = ? AND pj_action = 'PROVISION' AND pj_status NOT IN ('FAILED', 'CANCELLED')
      LIMIT 1`,
    [tenantCode]
  );
  return rows.length ? "REACTIVATE" : "PROVISION";
};

// Saves a job and starts it right away in the background. Returns the job id.
const QueueProvisionJob = async (subscriptionId, action, createBy = SYSTEM) => {
  if (!ACTIONS.includes(action)) throw new Error(`Unknown provision action: ${action}`);

  const payload = await BuildPayload(subscriptionId, action);
  const marker = crypto.randomUUID();

  await Transaction([
    {
      sql: `INSERT INTO provision_job
              (pj_subscription_id, pj_tenant_code, pj_action, pj_payload, pj_response,
               pj_attempts, pj_last_error, pj_next_retry_at, pj_lock_token, pj_completed_at,
               pj_status, pj_create_date, pj_create_by)
            VALUES (?, ?, ?, ?, NULL, 0, NULL, NULL, ?, NULL, 'PENDING', NOW(), ?)`,
      values: [subscriptionId, payload.tenant_code, action, JSON.stringify(payload), marker, createBy],
    },
  ]);

  const created = await query(`SELECT pj_id FROM provision_job WHERE pj_lock_token = ? LIMIT 1`, [
    marker,
  ]);
  const jobId = created[0]?.pj_id;

  await Transaction([
    {
      sql: `UPDATE provision_job SET pj_lock_token = NULL WHERE pj_id = ? AND pj_lock_token = ?`,
      values: [jobId, marker],
    },
  ]);

  setImmediate(() => ProcessJob(jobId).catch((err) => console.error("Provision Job Error:", err)));
  return jobId;
};

// ==========================================
// Worker
// ==========================================

// Runs one job. Safe to call from anywhere: the claim makes sure only one runner takes it.
// Jobs for the same tenant run strictly in order; an unfinished earlier job blocks later ones.
const ProcessJob = async (jobId) => {
  const blockers = await query(
    `SELECT b.pj_id
       FROM provision_job j
       INNER JOIN provision_job b ON b.pj_tenant_code = j.pj_tenant_code AND b.pj_id < j.pj_id
      WHERE j.pj_id = ? AND b.pj_status NOT IN ('SUCCESS', 'CANCELLED')
      LIMIT 1`,
    [jobId]
  );
  if (blockers.length) return { skipped: true, reason: `Waiting for job #${blockers[0].pj_id}` };

  const token = crypto.randomUUID();
  await Transaction([
    {
      sql: `UPDATE provision_job
            SET pj_status = 'PROCESSING', pj_lock_token = ?, pj_attempts = pj_attempts + 1,
                pj_update_date = NOW(), pj_update_by = ?
            WHERE pj_id = ? AND pj_status = 'PENDING'
              AND (pj_next_retry_at IS NULL OR pj_next_retry_at <= NOW())`,
      values: [token, SYSTEM, jobId],
    },
  ]);

  const claimed = await query(
    `SELECT * FROM provision_job WHERE pj_id = ? AND pj_lock_token = ? AND pj_status = 'PROCESSING'`,
    [jobId, token]
  );
  const job = claimed[0];
  if (!job) return { skipped: true, reason: "Not due or taken by another runner" };

  try {
    // Rebuild so the ERP always gets the latest state, tagged with this job id.
    const payload = await BuildPayload(job.pj_subscription_id, job.pj_action, job.pj_id);
    const response = await SendToErp(job.pj_action, job.pj_tenant_code, payload);

    await Transaction([
      {
        sql: `UPDATE provision_job
              SET pj_status = 'SUCCESS', pj_payload = ?, pj_response = ?, pj_last_error = NULL,
                  pj_lock_token = NULL, pj_completed_at = NOW(),
                  pj_update_date = NOW(), pj_update_by = ?
              WHERE pj_id = ?`,
        values: [JSON.stringify(payload), JSON.stringify(response ?? {}), SYSTEM, job.pj_id],
      },
    ]);

    // Let the next job of this tenant go right away.
    setImmediate(() => RunNextForTenant(job.pj_tenant_code));
    return { success: true };
  } catch (error) {
    const attempts = Number(job.pj_attempts);
    const giveUp = attempts >= MAX_ATTEMPTS;
    const waitMinutes = RETRY_MINUTES[Math.min(attempts - 1, RETRY_MINUTES.length - 1)];

    await Transaction([
      {
        sql: giveUp
          ? `UPDATE provision_job
             SET pj_status = 'FAILED', pj_last_error = ?, pj_lock_token = NULL,
                 pj_next_retry_at = NULL, pj_update_date = NOW(), pj_update_by = ?
             WHERE pj_id = ?`
          : `UPDATE provision_job
             SET pj_status = 'PENDING', pj_last_error = ?, pj_lock_token = NULL,
                 pj_next_retry_at = DATE_ADD(NOW(), INTERVAL ${Number(waitMinutes)} MINUTE),
                 pj_update_date = NOW(), pj_update_by = ?
             WHERE pj_id = ?`,
        values: [errorText(error), SYSTEM, job.pj_id],
      },
    ]);

    console.error(
      `Provision job #${job.pj_id} ${job.pj_action} ${job.pj_tenant_code} attempt ${attempts} failed:`,
      error.message
    );
    return { success: false, error: error.message };
  }
};

const RunNextForTenant = async (tenantCode) => {
  try {
    const next = await query(
      `SELECT pj_id FROM provision_job
        WHERE pj_tenant_code = ? AND pj_status = 'PENDING'
          AND (pj_next_retry_at IS NULL OR pj_next_retry_at <= NOW())
        ORDER BY pj_id LIMIT 1`,
      [tenantCode]
    );
    if (next.length) await ProcessJob(next[0].pj_id);
  } catch (error) {
    console.error("Provision Next Job Error:", error);
  }
};

// Picks up due jobs (retries, jobs skipped while blocked) and frees stuck ones.
const RunDueJobs = async () => {
  await Transaction([
    {
      sql: `UPDATE provision_job
            SET pj_status = 'PENDING', pj_lock_token = NULL,
                pj_last_error = CONCAT(IFNULL(pj_last_error, ''), ' [reset: stuck in PROCESSING]'),
                pj_update_date = NOW(), pj_update_by = ?
            WHERE pj_status = 'PROCESSING'
              AND pj_update_date < DATE_SUB(NOW(), INTERVAL ${STUCK_MINUTES} MINUTE)`,
      values: [SYSTEM],
    },
  ]);

  const due = await query(
    `SELECT pj_id FROM provision_job
      WHERE pj_status = 'PENDING' AND (pj_next_retry_at IS NULL OR pj_next_retry_at <= NOW())
      ORDER BY pj_id LIMIT ${BATCH_SIZE}`
  );

  const results = [];
  for (const row of due) {
    results.push({ id: row.pj_id, ...(await ProcessJob(row.pj_id)) });
  }
  return results;
};

// ==========================================
// Expiry
// ==========================================

// TRIAL  → EXPIRED the day after the trial end date (no grace on trials).
// ACTIVE → EXPIRED the day after the grace end date.
// Each expiry writes history and queues SUSPEND to the ERP.
const RunExpiryCheck = async () => {
  const today = GetCurrentDate();
  const rows = await query(
    `SELECT s_id, s_plan_id, s_status,
            DATE_FORMAT(s_end_date, '%Y-%m-%d') AS end_date
       FROM subscription
      WHERE (s_status = 'TRIAL' AND s_end_date < ?)
         OR (s_status = 'ACTIVE' AND s_grace_end_date < ?)`,
    [today, today]
  );

  for (const sub of rows) {
    try {
      await Transaction([
        {
          sql: `UPDATE subscription
                SET s_status = 'EXPIRED', s_update_date = NOW(), s_update_by = ?
                WHERE s_id = ? AND s_status = ?`,
          values: [SYSTEM, sub.s_id, sub.s_status],
        },
        {
          sql: `INSERT INTO subscription_history
                  (sh_subscription_id, sh_action, sh_from_plan_id, sh_to_plan_id,
                   sh_from_status, sh_to_status, sh_from_end_date, sh_to_end_date,
                   sh_remarks, sh_create_date, sh_create_by)
                VALUES (?, 'EXPIRE', ?, ?, ?, 'EXPIRED', ?, ?, ?, NOW(), ?)`,
          values: [
            sub.s_id,
            sub.s_plan_id,
            sub.s_plan_id,
            sub.s_status,
            sub.end_date,
            sub.end_date,
            sub.s_status === "TRIAL" ? "Trial ended" : "Grace period ended",
            SYSTEM,
          ],
        },
      ]);

      await QueueProvisionJob(sub.s_id, "SUSPEND", SYSTEM);
    } catch (error) {
      console.error(`Expiry Error (subscription #${sub.s_id}):`, error);
    }
  }

  return rows.length;
};

// ==========================================
// Start
// ==========================================

let jobsRunning = false;
let expiryRunning = false;

const guarded = (flagGetter, flagSetter, fn, label) => async () => {
  if (flagGetter()) return;
  flagSetter(true);
  try {
    await fn();
  } catch (error) {
    console.error(`${label} Error:`, error);
  } finally {
    flagSetter(false);
  }
};

const tickJobs = guarded(() => jobsRunning, (v) => (jobsRunning = v), RunDueJobs, "Provision Worker");
const tickExpiry = guarded(
  () => expiryRunning,
  (v) => (expiryRunning = v),
  RunExpiryCheck,
  "Expiry Check"
);

// Call once at app start. Run a single app instance (pm2 instances: 1) for this worker.
const StartProvisionWorker = () => {
  setTimeout(tickJobs, 5000);
  setTimeout(tickExpiry, 10000);
  setInterval(tickJobs, JOB_INTERVAL_MS);
  setInterval(tickExpiry, EXPIRY_INTERVAL_MS);
  console.log("Provision worker started");
};

module.exports = {
  ACTIONS,
  BuildPayload,
  ResolveStartAction,
  QueueProvisionJob,
  ProcessJob,
  RunDueJobs,
  RunExpiryCheck,
  StartProvisionWorker,
};