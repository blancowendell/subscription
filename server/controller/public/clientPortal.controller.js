const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { SelectParameter, Transaction } = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger");
const { SendTemplateEmail, PortalLink } = require("../../services/utility/emailService");
const { HashPassword, NewToken } = require("../../services/utility/security");
const {
  text,
  optional,
  normalizeEmail,
  normalizeCode,
  isValidEmail,
  validateTin,
  validateLength,
  firstError,
} = require("../../services/utility/validation");
const {
  CYCLES,
  CyclePrice,
  LoadPlan,
  GetLiveSubscription,
  HasUsedTrial,
  CreateSubscription,
  Today,
} = require("../../services/utility/subscriptionService.js");
const { QueueProvisionJob, ResolveStartAction } = require("../../services/utility/provisionService");

const USER_SOURCE = "CLIENT";
const AUDIT_MODULE = "Client Portal";
const INVITE_TTL_HOURS = 72;
const ROLES = ["OWNER", "BILLING"];
const STATUSES = ["ACTIVE", "INACTIVE"];

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const me = (req) => req.session.client;

const actor = (client) => ({
  id: client?.id ?? null,
  source: USER_SOURCE,
  name: client?.email ?? null,
  role: client?.role ?? null,
});

const audit = (req, entry) => logAudit(req, { module: AUDIT_MODULE, actor: actor(me(req)), ...entry });

// ==========================================
// Middleware
// ==========================================

// Use after requireClient. Subscription and user management are owner-only.
const requireOwner = (req, res, next) => {
  if (me(req)?.role !== "OWNER") {
    return res.status(403).json(JsonWarningResponse("Only the account owner can do this."));
  }
  return next();
};

// ==========================================
// Helpers
// ==========================================

const loadAccount = async (accountId) => {
  const rows = await query(`SELECT * FROM client_account WHERE ca_id = ?`, [accountId]);
  return rows[0] || null;
};

const SELECT_MY_SUBSCRIPTION = `
  SELECT s.s_id AS id,
         s.s_ref AS ref,
         s.s_plan_id AS plan_id,
         mp.mp_code AS plan_code,
         mp.mp_name AS plan_name,
         s.s_billing_cycle AS billing_cycle,
         s.s_price AS price,
         s.s_is_trial AS is_trial,
         DATE_FORMAT(s.s_start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(s.s_end_date, '%Y-%m-%d') AS end_date,
         DATE_FORMAT(s.s_grace_end_date, '%Y-%m-%d') AS grace_end_date,
         s.s_status AS status,
         s.s_cancel_reason AS cancel_reason
    FROM subscription s
    INNER JOIN master_plan mp ON mp.mp_id = s.s_plan_id`;

const loadPlanFeatures = (planIds) =>
  planIds.length
    ? query(
        `SELECT mpf.mpf_plan_id AS plan_id, mf.mf_code AS code, mf.mf_name AS name,
                mf.mf_module AS module, mf.mf_type AS type, mpf.mpf_limit_value AS limit_value
           FROM master_plan_feature mpf
           INNER JOIN master_feature mf ON mf.mf_id = mpf.mpf_feature_id
          WHERE mpf.mpf_plan_id IN (?) AND mf.mf_status = 'ACTIVE'
          ORDER BY mf.mf_module, mf.mf_sort_order, mf.mf_name`,
        [planIds]
      )
    : Promise.resolve([]);

const toFeature = (f) => ({
  code: f.code,
  name: f.name,
  module: f.module,
  type: f.type,
  limit: f.limit_value === null ? null : Number(f.limit_value),
});

// Where the tenant's ERP stands, from the provision jobs
const loadErpStatus = async (tenantCode) => {
  const provisioned = await query(
    `SELECT pj_id FROM provision_job
      WHERE pj_tenant_code = ? AND pj_action = 'PROVISION' AND pj_status = 'SUCCESS' LIMIT 1`,
    [tenantCode]
  );
  const latest = await query(
    `SELECT pj_action AS action, pj_status AS status,
            REPLACE(REPLACE(pj_completed_at, 'T', ' '), 'Z', '') AS completed_at
       FROM provision_job WHERE pj_tenant_code = ? ORDER BY pj_id DESC LIMIT 1`,
    [tenantCode]
  );

  const job = latest[0] || null;
  let state = "NOT_SET_UP";
  if (job && ["PENDING", "PROCESSING"].includes(job.status)) state = "UPDATING";
  else if (job && job.status === "FAILED") state = "NEEDS_ATTENTION";
  else if (provisioned.length) state = job?.action === "SUSPEND" ? "SUSPENDED" : "READY";

  return {
    state,
    provisioned: provisioned.length > 0,
    latest_job: job,
    login_url: process.env._ERP_PORTAL_URL || null,
  };
};

// ==========================================
// Public
// ==========================================

// GET /client_portal/plans — pricing page (no login)
const getPublicPlans = async (req, res) => {
  try {
    const plans = await query(
      `SELECT mp_id AS id, mp_code AS code, mp_name AS name, mp_description AS description,
              mp_price_monthly AS price_monthly, mp_price_yearly AS price_yearly,
              mp_trial_days AS trial_days
         FROM master_plan
        WHERE mp_status = 'ACTIVE' AND mp_is_public = 1
        ORDER BY mp_sort_order, mp_name`
    );

    const features = await loadPlanFeatures(plans.map((p) => p.id));
    const byPlan = new Map();
    features.forEach((f) => {
      if (!byPlan.has(f.plan_id)) byPlan.set(f.plan_id, []);
      byPlan.get(f.plan_id).push(toFeature(f));
    });

    return res.json(
      JsonDataResponse(
        plans.map((p) => ({
          ...p,
          price_monthly: Number(p.price_monthly),
          price_yearly: Number(p.price_yearly),
          trial_days: Number(p.trial_days),
          features: byPlan.get(p.id) || [],
        }))
      )
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// ==========================================
// Account
// ==========================================

// GET /client_portal/my-account
const getMyAccount = async (req, res) => {
  try {
    const account = await loadAccount(me(req).account_id);
    if (!account) return res.status(404).json(JsonWarningResponse("Account not found."));

    return res.json(
      JsonDataResponse({
        id: account.ca_id,
        tenant_code: account.ca_tenant_code,
        company_name: account.ca_company_name,
        tin: account.ca_tin,
        address: account.ca_address,
        business_type: account.ca_business_type,
        contact_person: account.ca_contact_person,
        contact_email: account.ca_contact_email,
        contact_phone: account.ca_contact_phone,
        status: account.ca_status,
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client_portal/update-account — { companyName, tin, address, contactPerson, contactEmail, contactPhone }
// Tenant code and business type stay as set (ask support to change business type).
const updateMyAccount = async (req, res) => {
  const client = me(req);
  let before = null;

  try {
    const account = await loadAccount(client.account_id);
    if (!account) return res.status(404).json(JsonWarningResponse("Account not found."));

    const a = {
      companyName: text(req.body?.companyName),
      tin: optional(req.body?.tin),
      address: optional(req.body?.address),
      contactPerson: text(req.body?.contactPerson),
      contactEmail: normalizeEmail(req.body?.contactEmail),
      contactPhone: optional(req.body?.contactPhone),
    };

    const invalid = firstError(
      validateLength(a.companyName, "Company name", 150),
      validateTin(a.tin),
      validateLength(a.address, "Address", 255, false),
      validateLength(a.contactPerson, "Contact person", 100),
      isValidEmail(a.contactEmail) ? null : "Contact email is not valid.",
      validateLength(a.contactPhone, "Phone", 30, false)
    );
    if (invalid) return res.status(400).json(JsonWarningResponse(invalid));

    before = {
      companyName: account.ca_company_name,
      tin: account.ca_tin,
      address: account.ca_address,
      contactPerson: account.ca_contact_person,
      contactEmail: account.ca_contact_email,
      contactPhone: account.ca_contact_phone,
    };

    await Transaction([
      {
        sql: `UPDATE client_account
              SET ca_company_name = ?, ca_tin = ?, ca_address = ?, ca_contact_person = ?,
                  ca_contact_email = ?, ca_contact_phone = ?, ca_update_date = NOW(), ca_update_by = ?
              WHERE ca_id = ?`,
        values: [
          a.companyName,
          a.tin,
          a.address,
          a.contactPerson,
          a.contactEmail,
          a.contactPhone,
          client.email,
          client.account_id,
        ],
      },
    ]);

    req.session.client.company_name = a.companyName;

    audit(req, {
      action: "UPDATE_ACCOUNT",
      entity: "client_account",
      entityId: client.account_id,
      referenceNo: client.tenant_code,
      before,
      after: a,
      remarks: "Client updated company details",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// ==========================================
// Subscription
// ==========================================

// GET /client_portal/my-subscription
// { subscription (live, else the latest), features, erp }
const getMySubscription = async (req, res) => {
  try {
    const client = me(req);
    const rows = await query(
      `${SELECT_MY_SUBSCRIPTION}
        WHERE s.s_account_id = ?
        ORDER BY FIELD(s.s_status, 'ACTIVE', 'TRIAL', 'SUSPENDED', 'PENDING') DESC, s.s_id DESC
        LIMIT 1`,
      [client.account_id]
    );
    const sub = rows[0] || null;

    const features = sub ? (await loadPlanFeatures([sub.plan_id])).map(toFeature) : [];
    const erp = await loadErpStatus(client.tenant_code);

    return res.json(
      JsonDataResponse({
        subscription: sub
          ? { ...sub, price: Number(sub.price), is_trial: Number(sub.is_trial) === 1 }
          : null,
        features,
        erp,
        trial_used: await HasUsedTrial(client.account_id),
        today: Today(),
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /client_portal/my-subscription-history — every subscription of the account with its log
const getMySubscriptionHistory = async (req, res) => {
  try {
    const rows = await query(
      `SELECT sh.sh_id AS id, s.s_ref AS ref, sh.sh_action AS action,
              fp.mp_code AS from_plan_code, tp.mp_code AS to_plan_code,
              sh.sh_from_status AS from_status, sh.sh_to_status AS to_status,
              DATE_FORMAT(sh.sh_to_end_date, '%Y-%m-%d') AS to_end_date,
              REPLACE(REPLACE(sh.sh_create_date, 'T', ' '), 'Z', '') AS create_date
         FROM subscription_history sh
         INNER JOIN subscription s ON s.s_id = sh.sh_subscription_id
         LEFT JOIN master_plan fp ON fp.mp_id = sh.sh_from_plan_id
         LEFT JOIN master_plan tp ON tp.mp_id = sh.sh_to_plan_id
        WHERE s.s_account_id = ?
        ORDER BY sh.sh_id DESC
        LIMIT 200`,
      [me(req).account_id]
    );
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client_portal/subscribe — { planId, billingCycle, isTrial }
// Trial: starts now and the ERP is set up right away.
// Paid: saved as PENDING until payment is confirmed by the admin (Activate).
const subscribe = async (req, res) => {
  const client = me(req);

  try {
    const account = await loadAccount(client.account_id);
    if (!account || account.ca_status !== "ACTIVE") {
      return res.status(400).json(JsonWarningResponse("Your account isn't active yet."));
    }

    const live = await GetLiveSubscription(client.account_id);
    if (live) {
      return res
        .status(409)
        .json(JsonWarningResponse(`You already have a ${live.s_status.toLowerCase()} subscription (${live.s_ref}).`));
    }

    const plan = await LoadPlan(req.body?.planId);
    if (!plan || plan.mp_status !== "ACTIVE" || Number(plan.mp_is_public) !== 1) {
      return res.status(404).json(JsonWarningResponse("That plan isn't available."));
    }

    const cycle = normalizeCode(req.body?.billingCycle) || "MONTHLY";
    if (!CYCLES.includes(cycle)) {
      return res.status(400).json(JsonWarningResponse("Billing cycle must be MONTHLY or YEARLY."));
    }

    const isTrial = req.body?.isTrial === true || req.body?.isTrial === 1 || req.body?.isTrial === "1";
    if (isTrial) {
      if (Number(plan.mp_trial_days) <= 0) {
        return res.status(400).json(JsonWarningResponse("This plan has no free trial."));
      }
      if (await HasUsedTrial(client.account_id)) {
        return res.status(400).json(JsonWarningResponse("Your free trial has already been used."));
      }
    }

    const created = await CreateSubscription({
      accountId: client.account_id,
      plan,
      cycle,
      startDate: Today(),
      isTrial,
      status: isTrial ? "TRIAL" : "PENDING",
      remarks: isTrial ? "Trial started by client" : "Requested by client, awaiting payment",
      createBy: client.email,
    });

    audit(req, {
      action: "SUBSCRIBE",
      entity: "subscription",
      entityId: created.id,
      referenceNo: `${client.tenant_code} / ${created.ref}`,
      after: { planCode: plan.mp_code, billingCycle: cycle, isTrial, status: created.status },
      remarks: isTrial ? "Client started a trial" : "Client requested a paid subscription",
    });

    let jobId = null;
    if (isTrial) {
      try {
        jobId = await QueueProvisionJob(created.id, await ResolveStartAction(client.tenant_code), client.email);
      } catch (queueError) {
        console.error("Queue Provision Error:", queueError);
      }
    }

    return res.status(200).json(
      JsonDataResponse({
        ...created,
        jobId,
        amount_due: isTrial ? 0 : CyclePrice(plan, cycle),
      })
    );
  } catch (error) {
    console.error(error);
    audit(req, {
      action: "SUBSCRIBE",
      status: "FAILED",
      entity: "subscription",
      entityId: null,
      referenceNo: client?.tenant_code,
      error,
      remarks: "Client subscribe failed",
    });
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client_portal/change-trial-plan — { planId }
// Only while on trial (free to switch). Paid plan changes go through support for now.
const changeTrialPlan = async (req, res) => {
  const client = me(req);

  try {
    const rows = await query(
      `SELECT s_id, s_ref, s_plan_id, s_billing_cycle, s_status,
              DATE_FORMAT(s_end_date, '%Y-%m-%d') AS end_date
         FROM subscription WHERE s_account_id = ? AND s_status = 'TRIAL' ORDER BY s_id DESC LIMIT 1`,
      [client.account_id]
    );
    const sub = rows[0];
    if (!sub) return res.status(400).json(JsonWarningResponse("You can only switch plans during a trial."));

    const plan = await LoadPlan(req.body?.planId);
    if (!plan || plan.mp_status !== "ACTIVE" || Number(plan.mp_is_public) !== 1) {
      return res.status(404).json(JsonWarningResponse("That plan isn't available."));
    }
    if (Number(plan.mp_id) === Number(sub.s_plan_id)) {
      return res.status(400).json(JsonWarningResponse("You're already on that plan."));
    }

    const currentPlan = await LoadPlan(sub.s_plan_id);
    const action =
      Number(plan.mp_price_monthly) >= Number(currentPlan?.mp_price_monthly || 0) ? "UPGRADE" : "DOWNGRADE";
    const price = CyclePrice(plan, sub.s_billing_cycle);

    await Transaction([
      {
        sql: `UPDATE subscription
              SET s_plan_id = ?, s_price = ?, s_update_date = NOW(), s_update_by = ?
              WHERE s_id = ? AND s_status = 'TRIAL'`,
        values: [plan.mp_id, price, client.email, sub.s_id],
      },
      {
        sql: `INSERT INTO subscription_history
                (sh_subscription_id, sh_action, sh_from_plan_id, sh_to_plan_id,
                 sh_from_status, sh_to_status, sh_from_end_date, sh_to_end_date,
                 sh_remarks, sh_create_date, sh_create_by)
              VALUES (?, ?, ?, ?, 'TRIAL', 'TRIAL', ?, ?, 'Switched by client during trial', NOW(), ?)`,
        values: [sub.s_id, action, sub.s_plan_id, plan.mp_id, sub.end_date, sub.end_date, client.email],
      },
    ]);

    audit(req, {
      action,
      entity: "subscription",
      entityId: sub.s_id,
      referenceNo: `${client.tenant_code} / ${sub.s_ref}`,
      before: { planId: sub.s_plan_id },
      after: { planId: plan.mp_id, planCode: plan.mp_code },
      remarks: "Client switched plan during trial",
    });

    let jobId = null;
    try {
      jobId = await QueueProvisionJob(sub.s_id, "SYNC", client.email);
    } catch (queueError) {
      console.error("Queue Provision Error:", queueError);
    }

    return res.status(200).json(JsonDataResponse({ jobId }));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client_portal/cancel-pending — withdraw an unpaid (PENDING) request
const cancelPending = async (req, res) => {
  const client = me(req);

  try {
    const rows = await query(
      `SELECT s_id, s_ref, s_plan_id, DATE_FORMAT(s_end_date, '%Y-%m-%d') AS end_date
         FROM subscription WHERE s_account_id = ? AND s_status = 'PENDING' ORDER BY s_id DESC LIMIT 1`,
      [client.account_id]
    );
    const sub = rows[0];
    if (!sub) return res.status(400).json(JsonWarningResponse("There's no pending request to cancel."));

    await Transaction([
      {
        sql: `UPDATE subscription
              SET s_status = 'CANCELLED', s_cancelled_at = NOW(), s_cancel_reason = 'Withdrawn by client',
                  s_update_date = NOW(), s_update_by = ?
              WHERE s_id = ? AND s_status = 'PENDING'`,
        values: [client.email, sub.s_id],
      },
      {
        sql: `INSERT INTO subscription_history
                (sh_subscription_id, sh_action, sh_from_plan_id, sh_to_plan_id,
                 sh_from_status, sh_to_status, sh_from_end_date, sh_to_end_date,
                 sh_remarks, sh_create_date, sh_create_by)
              VALUES (?, 'CANCEL', ?, ?, 'PENDING', 'CANCELLED', ?, ?, 'Withdrawn by client', NOW(), ?)`,
        values: [sub.s_id, sub.s_plan_id, sub.s_plan_id, sub.end_date, sub.end_date, client.email],
      },
    ]);

    audit(req, {
      action: "CANCEL",
      entity: "subscription",
      entityId: sub.s_id,
      referenceNo: `${client.tenant_code} / ${sub.s_ref}`,
      remarks: "Client withdrew a pending request",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// ==========================================
// Users (owner manages the account's portal users)
// ==========================================

// GET /client_portal/users
const getMyUsers = async (req, res) => {
  try {
    const rows = await query(
      `SELECT cu_id AS id, cu_fullname AS fullname, cu_email AS email, cu_role AS role,
              cu_is_verified AS is_verified, cu_status AS status,
              REPLACE(REPLACE(cu_last_login_at, 'T', ' '), 'Z', '') AS last_login_at
         FROM client_users WHERE cu_account_id = ? ORDER BY cu_fullname`,
      [me(req).account_id]
    );
    return res.json(JsonDataResponse(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client_portal/invite-user — { fullname, email, role }
// Creates the user and emails a link to set their own password (valid 72 hours).
const inviteUser = async (req, res) => {
  const client = me(req);
  const email = normalizeEmail(req.body?.email);

  try {
    const fullname = text(req.body?.fullname);
    const role = normalizeCode(req.body?.role) || "BILLING";

    const invalid = firstError(
      validateLength(fullname, "Full name", 100),
      isValidEmail(email) ? null : "Email is not valid.",
      ROLES.includes(role) ? null : "Role must be OWNER or BILLING."
    );
    if (invalid) return res.status(400).json(JsonWarningResponse(invalid));

    const taken = await query(`SELECT cu_id FROM client_users WHERE cu_email = ? LIMIT 1`, [email]);
    if (taken.length) return res.status(409).json(JsonWarningResponse("That email is already registered."));

    const token = NewToken();
    const unusablePassword = HashPassword(NewToken().raw); // replaced when they set their own

    await Transaction([
      {
        sql: `INSERT INTO client_users
                (cu_account_id, cu_fullname, cu_email, cu_password, cu_role,
                 cu_is_verified, cu_verified_at, cu_is_update_password,
                 cu_status, cu_create_date, cu_create_by)
              VALUES (?, ?, ?, ?, ?, 1, NOW(), 0, 'ACTIVE', NOW(), ?)`,
        values: [client.account_id, fullname, email, unusablePassword, role, client.email],
      },
      {
        sql: `INSERT INTO client_tokens
                (ct_user_id, ct_type, ct_token_hash, ct_expires_at, ct_used_at, ct_create_date)
              VALUES (LAST_INSERT_ID(), 'RESET', ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NULL, NOW())`,
        values: [token.hash, INVITE_TTL_HOURS],
      },
    ]);

    audit(req, {
      action: "INVITE_USER",
      entity: "client_users",
      entityId: null,
      referenceNo: `${client.tenant_code} / ${email}`,
      after: { fullname, email, role },
      remarks: "Client owner invited a user",
    });

    try {
      await SendTemplateEmail(email, "You're invited", {
        greeting: `Hi ${fullname},`,
        paragraphs: [
          `${client.fullname} invited you to manage ${client.company_name} on ${process.env._APP_NAME}.`,
          "Set your password to get started.",
        ],
        action: { label: "Set password", url: PortalLink("/reset-password", { token: token.raw }) },
        note: `This link expires in ${INVITE_TTL_HOURS} hours.`,
      });
    } catch (mailError) {
      console.error("Invite Email Error:", mailError);
      return res
        .status(200)
        .json(JsonWarningResponse("User added, but the invite email failed. Ask them to use Forgot password."));
    }

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client_portal/update-user/:id — { role, status }
// Owners can't change themselves, and the account always keeps one active owner.
const updateMyUser = async (req, res) => {
  const client = me(req);
  const id = Number(req.params.id);

  try {
    if (id === Number(client.id)) {
      return res.status(400).json(JsonWarningResponse("You can't change your own role or status."));
    }

    const rows = await query(
      `SELECT cu_id, cu_email, cu_role, cu_status FROM client_users WHERE cu_id = ? AND cu_account_id = ?`,
      [id, client.account_id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json(JsonWarningResponse("User not found."));

    const role = normalizeCode(req.body?.role) || user.cu_role;
    const status = normalizeCode(req.body?.status) || user.cu_status;
    if (!ROLES.includes(role)) return res.status(400).json(JsonWarningResponse("Role must be OWNER or BILLING."));
    if (!STATUSES.includes(status)) return res.status(400).json(JsonWarningResponse("Unknown status."));

    const losingOwner = user.cu_role === "OWNER" && user.cu_status === "ACTIVE" && (role !== "OWNER" || status !== "ACTIVE");
    if (losingOwner) {
      const others = await query(
        `SELECT COUNT(*) AS total FROM client_users
          WHERE cu_account_id = ? AND cu_role = 'OWNER' AND cu_status = 'ACTIVE' AND cu_id <> ?`,
        [client.account_id, id]
      );
      if (Number(others[0]?.total || 0) === 0) {
        return res.status(400).json(JsonWarningResponse("The account must keep at least one active owner."));
      }
    }

    await Transaction([
      {
        sql: `UPDATE client_users
              SET cu_role = ?, cu_status = ?, cu_update_date = NOW(), cu_update_by = ?
              WHERE cu_id = ? AND cu_account_id = ?`,
        values: [role, status, client.email, id, client.account_id],
      },
    ]);

    audit(req, {
      action: "UPDATE_USER",
      entity: "client_users",
      entityId: id,
      referenceNo: `${client.tenant_code} / ${user.cu_email}`,
      before: { role: user.cu_role, status: user.cu_status },
      after: { role, status },
      remarks: "Client owner updated a user",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  requireOwner,
  getPublicPlans,
  getMyAccount,
  updateMyAccount,
  getMySubscription,
  getMySubscriptionHistory,
  subscribe,
  changeTrialPlan,
  cancelPending,
  getMyUsers,
  inviteUser,
  updateMyUser,
};