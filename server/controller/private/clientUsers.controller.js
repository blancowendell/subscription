const bcrypt = require("bcrypt"); // SWAP for your existing password helper if the boilerplate has one
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { Client } = require("../../database/model/Client");
const {
  DataModeling,
  SelectParameter,
  Transaction,
  TransactionWithReturn,
  SelectAllStatement,
} = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const STATUSES = ["ACTIVE", "INACTIVE"];
const ROLES = ["OWNER", "BILLING"];
const NAME_MAX = 100;
const EMAIL_MAX = 150;
const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUDIT_MODULE = "Client User";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

// Never return the password hash.
const safeColumns = () =>
  Client.client_users.selectColumns.filter((c) => c !== "cu_password");

const baseSelect = () => SelectAllStatement(Client.client_users.tablename, safeColumns());

const toUsers = (rows) =>
  rows.length ? DataModeling(rows, Client.client_users.prefix_) : [];

const text = (v) => String(v ?? "").trim();

const hashPassword = (plain) => bcrypt.hash(plain, Number(process.env._BCRYPT_SALT) || 10);

const validatePassword = (pw) => {
  if (!pw) return "Password is required.";
  if (pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))
    return "Password must have at least one letter and one number.";
  return null;
};

const validateUser = (u) => {
  if (!u.fullname) return "Full name is required.";
  if (u.fullname.length > NAME_MAX) return `Full name can be up to ${NAME_MAX} characters.`;
  if (!u.email) return "Email is required.";
  if (u.email.length > EMAIL_MAX || !EMAIL_PATTERN.test(u.email)) return "Email is not valid.";
  if (!ROLES.includes(u.role)) return "Role must be OWNER or BILLING.";
  return null;
};

const rowToSnapshot = (row) => ({
  id: row.cu_id,
  accountId: row.cu_account_id,
  fullname: row.cu_fullname,
  email: row.cu_email,
  role: row.cu_role,
  status: row.cu_status,
});

// Each account must keep at least one ACTIVE OWNER.
const countOtherActiveOwners = async (accountId, excludeUserId) => {
  const rows = await query(
    `SELECT COUNT(*) AS total FROM client_users
      WHERE cu_account_id = ? AND cu_role = 'OWNER' AND cu_status = 'ACTIVE' AND cu_id <> ?`,
    [accountId, excludeUserId]
  );
  return Number(rows[0]?.total || 0);
};

// GET /client-user/load-client-user/:accountId — users of one client account
const getClientUsers = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE cu_account_id = ? ORDER BY cu_fullname`, [
      req.params.accountId,
    ]);
    return res.json(JsonDataResponse(toUsers(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /client-user/get-client-user/:id — one user
const getClientUserById = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE cu_id = ?`, [req.params.id]);
    return res.json(JsonDataResponse(toUsers(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-user/add-client-user — { accountId, fullname, email, role, password }
// Admin-created users are marked verified and must change the password on first login.
const addClientUser = async (req, res) => {
  const email = text(req.body?.email).toLowerCase();

  try {
    const accountId = Number(req.body?.accountId);
    const accounts = await query(
      `SELECT ca_id, ca_tenant_code, ca_status FROM client_account WHERE ca_id = ?`,
      [accountId]
    );
    if (accounts.length === 0) {
      return res.status(404).json(JsonWarningResponse("Client account not found."));
    }
    if (accounts[0].ca_status === "BLOCKED") {
      return res.status(400).json(JsonWarningResponse("Client account is blocked."));
    }

    const user = {
      fullname: text(req.body?.fullname),
      email,
      role: text(req.body?.role).toUpperCase(),
    };
    const invalid = validateUser(user);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const password = String(req.body?.password || "");
    const badPassword = validatePassword(password);
    if (badPassword) {
      return res.status(400).json(JsonWarningResponse(badPassword));
    }

    const existing = await query(`SELECT cu_id FROM client_users WHERE cu_email = ? LIMIT 1`, [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const hashed = await hashPassword(password);
    const createBy = req.session.user.fullname;

    const result = await TransactionWithReturn([
      {
        sql: `INSERT INTO client_users
                (cu_account_id, cu_fullname, cu_email, cu_password, cu_role,
                 cu_is_verified, cu_verified_at, cu_is_update_password,
                 cu_status, cu_create_date, cu_create_by)
              VALUES (?, ?, ?, ?, ?, 1, NOW(), 1, 'ACTIVE', NOW(), ?)`,
        values: [accountId, user.fullname, email, hashed, user.role, createBy],
      },
    ]);

    let id = result?.insertId ?? result?.[0]?.insertId;
    if (!id) {
      const created = await query(`SELECT cu_id FROM client_users WHERE cu_email = ? LIMIT 1`, [
        email,
      ]);
      id = created[0]?.cu_id;
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "client_users",
      entityId: id,
      referenceNo: `${accounts[0].ca_tenant_code} / ${email}`,
      after: { id, accountId, ...user, status: "ACTIVE" },
      remarks: "Client user created",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: "client_users",
      entityId: null,
      referenceNo: email || null,
      error,
      remarks: "Client user not created",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client-user/update-client-user/:id — { fullname, email, role, userStatus }
const updateClientUser = async (req, res) => {
  const id = req.params.id;
  let before = null;

  try {
    const rows = await query(`SELECT * FROM client_users WHERE cu_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Client user not found."));
    }

    const current = rows[0];
    before = rowToSnapshot(current);

    const user = {
      fullname: text(req.body?.fullname),
      email: text(req.body?.email).toLowerCase(),
      role: text(req.body?.role).toUpperCase(),
    };
    const invalid = validateUser(user);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const status = text(req.body?.userStatus).toUpperCase();
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Unknown status."));
    }

    const losingOwner =
      current.cu_role === "OWNER" &&
      current.cu_status === "ACTIVE" &&
      (user.role !== "OWNER" || status !== "ACTIVE");
    if (losingOwner && (await countOtherActiveOwners(current.cu_account_id, id)) === 0) {
      return res
        .status(400)
        .json(JsonWarningResponse("The account must keep at least one active owner."));
    }

    const duplicate = await query(
      `SELECT cu_id FROM client_users WHERE cu_email = ? AND cu_id <> ? LIMIT 1`,
      [user.email, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE client_users
              SET cu_fullname = ?, cu_email = ?, cu_role = ?, cu_status = ?,
                  cu_update_date = NOW(), cu_update_by = ?
              WHERE cu_id = ?`,
        values: [user.fullname, user.email, user.role, status, updatedBy, id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "client_users",
      entityId: id,
      referenceNo: user.email,
      before,
      after: { id: current.cu_id, accountId: current.cu_account_id, ...user, status },
      remarks:
        current.cu_status !== status
          ? `Client user ${status === "ACTIVE" ? "activated" : "deactivated"}`
          : "Client user updated",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "client_users",
      entityId: id,
      referenceNo: before?.email || null,
      before,
      error,
      remarks: `Client user not updated (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client-user/reset-client-user-password/:id — { password }
// Admin sets a temporary password; the user must change it on next login.
const resetClientUserPassword = async (req, res) => {
  const id = req.params.id;
  let email = null;

  try {
    const rows = await query(`SELECT cu_id, cu_email FROM client_users WHERE cu_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Client user not found."));
    }
    email = rows[0].cu_email;

    const password = String(req.body?.password || "");
    const badPassword = validatePassword(password);
    if (badPassword) {
      return res.status(400).json(JsonWarningResponse(badPassword));
    }

    const hashed = await hashPassword(password);
    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE client_users
              SET cu_password = ?, cu_is_update_password = 1,
                  cu_update_date = NOW(), cu_update_by = ?
              WHERE cu_id = ?`,
        values: [hashed, updatedBy, id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD",
      entity: "client_users",
      entityId: id,
      referenceNo: email,
      remarks: "Client user password reset by admin",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD",
      status: "FAILED",
      entity: "client_users",
      entityId: id,
      referenceNo: email,
      error,
      remarks: `Client user password not reset (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getClientUsers,
  getClientUserById,
  addClientUser,
  updateClientUser,
  resetClientUserPassword,
};