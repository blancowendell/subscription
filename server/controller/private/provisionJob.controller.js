const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { SelectParameter, Transaction } = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger");
const { text, normalizeCode } = require("../../services/utility/validation");
const {
  ACTIONS,
  QueueProvisionJob,
  ProcessJob,
  RunDueJobs,
  RunExpiryCheck,
} = require("../../services/utility/provisionService");

const STATUSES = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED"];
const REMARKS_MAX = 255;
const AUDIT_MODULE = "Provision Job";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const SELECT_JOB = `
  SELECT pj.pj_id AS id,
         pj.pj_subscription_id AS subscription_id,
         s.s_ref AS subscription_ref,
         pj.pj_tenant_code AS tenant_code,
         ca.ca_company_name AS company_name,
         pj.pj_action AS action,
         pj.pj_attempts AS attempts,
         pj.pj_last_error AS last_error,
         REPLACE(REPLACE(pj.pj_next_retry_at, 'T', ' '), 'Z', '') AS next_retry_at,
         REPLACE(REPLACE(pj.pj_completed_at, 'T', ' '), 'Z', '') AS completed_at,
         pj.pj_status AS status,
         REPLACE(REPLACE(pj.pj_create_date, 'T', ' '), 'Z', '') AS create_date,
         pj.pj_create_by AS create_by,
         REPLACE(REPLACE(pj.pj_update_date, 'T', ' '), 'Z', '') AS update_date,
         pj.pj_update_by AS update_by
    FROM provision_job pj
    INNER JOIN subscription s ON s.s_id = pj.pj_subscription_id
    INNER JOIN client_account ca ON ca.ca_id = s.s_account_id`;

const loadJob = async (id) => {
  const rows = await query(`SELECT * FROM provision_job WHERE pj_id = ?`, [id]);
  return rows[0] || null;
};

// GET /provision-job/load-provision-job?status=FAILED&tenantCode=ACME
const getProvisionJobs = async (req, res) => {
  try {
    const status = normalizeCode(req.query?.status);
    const tenantCode = normalizeCode(req.query?.tenantCode);
    const where = [];
    const params = [];

    if (status) {
      where.push("pj.pj_status = ?");
      params.push(status);
    }
    if (tenantCode) {
      where.push("pj.pj_tenant_code = ?");
      params.push(tenantCode);
    }

    const rows = await query(
      `${SELECT_JOB} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY pj.pj_id DESC LIMIT 500`,
      params
    );
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /provision-job/get-provision-job/:id — includes payload and ERP response
const getProvisionJobById = async (req, res) => {
  try {
    const rows = await query(
      `${SELECT_JOB.replace(
        "pj.pj_status AS status,",
        "pj.pj_status AS status, pj.pj_payload AS payload, pj.pj_response AS response,"
      )} WHERE pj.pj_id = ?`,
      [req.params.id]
    );
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /provision-job/retry-provision-job/:id — FAILED → PENDING, attempts reset, runs now
const retryProvisionJob = async (req, res) => {
  const id = req.params.id;
  let job = null;

  try {
    job = await loadJob(id);
    if (!job) {
      return res.status(404).json(JsonWarningResponse("Provision job not found."));
    }
    if (job.pj_status !== "FAILED") {
      return res.status(400).json(JsonWarningResponse("Only failed jobs can be retried."));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE provision_job
              SET pj_status = 'PENDING', pj_attempts = 0, pj_next_retry_at = NULL,
                  pj_update_date = NOW(), pj_update_by = ?
              WHERE pj_id = ? AND pj_status = 'FAILED'`,
        values: [updatedBy, id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RETRY",
      entity: "provision_job",
      entityId: id,
      referenceNo: `${job.pj_tenant_code} / ${job.pj_action}`,
      before: { status: job.pj_status, attempts: job.pj_attempts, lastError: job.pj_last_error },
      after: { status: "PENDING", attempts: 0 },
      remarks: "Provision job retried",
    });

    const result = await ProcessJob(id);
    return res.status(200).json(JsonDataResponse(result));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RETRY",
      status: "FAILED",
      entity: "provision_job",
      entityId: id,
      referenceNo: job ? `${job.pj_tenant_code} / ${job.pj_action}` : null,
      error,
      remarks: `Provision job not retried (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /provision-job/cancel-provision-job/:id — { remarks }
// PENDING/FAILED → CANCELLED. Unblocks later jobs of the same tenant.
const cancelProvisionJob = async (req, res) => {
  const id = req.params.id;
  let job = null;

  try {
    job = await loadJob(id);
    if (!job) {
      return res.status(404).json(JsonWarningResponse("Provision job not found."));
    }
    if (!["PENDING", "FAILED"].includes(job.pj_status)) {
      return res
        .status(400)
        .json(JsonWarningResponse("Only pending or failed jobs can be cancelled."));
    }

    const remarks = text(req.body?.remarks);
    if (!remarks) {
      return res.status(400).json(JsonWarningResponse("A reason is required when cancelling."));
    }
    if (remarks.length > REMARKS_MAX) {
      return res
        .status(400)
        .json(JsonWarningResponse(`Remarks can be up to ${REMARKS_MAX} characters.`));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE provision_job
              SET pj_status = 'CANCELLED', pj_next_retry_at = NULL,
                  pj_last_error = CONCAT(IFNULL(pj_last_error, ''), ?),
                  pj_update_date = NOW(), pj_update_by = ?
              WHERE pj_id = ? AND pj_status IN ('PENDING', 'FAILED')`,
        values: [` [cancelled: ${remarks}]`, updatedBy, id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CANCEL",
      entity: "provision_job",
      entityId: id,
      referenceNo: `${job.pj_tenant_code} / ${job.pj_action}`,
      before: { status: job.pj_status },
      after: { status: "CANCELLED" },
      remarks,
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CANCEL",
      status: "FAILED",
      entity: "provision_job",
      entityId: id,
      referenceNo: job ? `${job.pj_tenant_code} / ${job.pj_action}` : null,
      error,
      remarks: `Provision job not cancelled (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /provision-job/queue-provision-job — { subscriptionId, action }
// Manual push to the ERP, e.g. SYNC after editing plan features, or re-queue after a lost job.
const queueProvisionJob = async (req, res) => {
  const subscriptionId = Number(req.body?.subscriptionId);
  const action = normalizeCode(req.body?.action);

  try {
    if (!ACTIONS.includes(action)) {
      return res
        .status(400)
        .json(JsonWarningResponse(`Action must be one of: ${ACTIONS.join(", ")}.`));
    }

    const subs = await query(`SELECT s_id, s_ref FROM subscription WHERE s_id = ?`, [
      subscriptionId,
    ]);
    if (subs.length === 0) {
      return res.status(404).json(JsonWarningResponse("Subscription not found."));
    }

    const createBy = req.session.user.fullname;
    const jobId = await QueueProvisionJob(subscriptionId, action, createBy);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "QUEUE",
      entity: "provision_job",
      entityId: jobId,
      referenceNo: `${subs[0].s_ref} / ${action}`,
      remarks: "Provision job queued manually",
    });

    return res.status(200).json(JsonDataResponse({ id: jobId }));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "QUEUE",
      status: "FAILED",
      entity: "provision_job",
      entityId: null,
      referenceNo: `#${subscriptionId} / ${action || "-"}`,
      error,
      remarks: "Provision job not queued",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /provision-job/sync-plan/:planId — queue SYNC for every live subscription on a plan
// Use after saving the plan's features.
const syncPlanSubscriptions = async (req, res) => {
  const planId = req.params.planId;

  try {
    const subs = await query(
      `SELECT s_id FROM subscription
        WHERE s_plan_id = ? AND s_status IN ('TRIAL', 'ACTIVE', 'SUSPENDED')`,
      [planId]
    );

    const createBy = req.session.user.fullname;
    const jobIds = [];
    for (const sub of subs) {
      jobIds.push(await QueueProvisionJob(sub.s_id, "SYNC", createBy));
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SYNC_PLAN",
      entity: "master_plan",
      entityId: planId,
      referenceNo: `plan #${planId}`,
      after: { queued: jobIds.length },
      remarks: `Plan sync queued for ${jobIds.length} subscription(s)`,
    });

    return res.status(200).json(JsonDataResponse({ queued: jobIds.length, jobIds }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /provision-job/run-due — run due jobs now instead of waiting for the worker
const runDueJobs = async (req, res) => {
  try {
    const results = await RunDueJobs();
    return res.status(200).json(JsonDataResponse(results));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /provision-job/run-expiry — run the expiry check now
const runExpiryCheck = async (req, res) => {
  try {
    const expired = await RunExpiryCheck();

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RUN_EXPIRY",
      entity: "subscription",
      entityId: null,
      referenceNo: null,
      after: { expired },
      remarks: `Expiry check run manually (${expired} expired)`,
    });

    return res.status(200).json(JsonDataResponse({ expired }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getProvisionJobs,
  getProvisionJobById,
  retryProvisionJob,
  cancelProvisionJob,
  queueProvisionJob,
  syncPlanSubscriptions,
  runDueJobs,
  runExpiryCheck,
};