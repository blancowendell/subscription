const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
} = require("../../services/repository/response");
const { Check, SelectStatement, TransactionWithReturn } = require("../../services/connections/sqlhelper");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { EncrypterString, DecrypterString } = require("../../services/repository/cryptography");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

// master_users = developer accounts (separate from employee user accounts)
const AUDIT_MODULE = "Developer Users";
const AUDIT_ENTITY = "master_users";
const STATUSES = ["ACTIVE", "INACTIVE"];
const USERNAME_MAX = 100;

const safeDecrypt = (value) => {
  if (!value) return "";
  try {
    return DecrypterString(value);
  } catch {
    return "";
  }
};

const SELECT_USERS = `
  SELECT mu.mu_id, mu.mu_access_id, mu.mu_username, mu.mu_status,
         mu.mu_create_date, mu.mu_create_by,
         ma.ma_name, ma.ma_is_system
    FROM master_users mu
    LEFT JOIN master_access ma ON ma.ma_id = mu.mu_access_id`;

// The password is never returned
const toUser = (row) => ({
  id: row.mu_id,
  access_id: row.mu_access_id,
  access_name: row.ma_name || null,
  is_system_access: Number(row.ma_is_system) === 1,
  username: safeDecrypt(row.mu_username),
  status: row.mu_status,
  create_date: row.mu_create_date,
  create_by: row.mu_create_by,
});

// Active role by id, or a message explaining why it can't be used
const accessError = async (accessId) => {
  if (!accessId) return "Access role is required.";
  const rows = await Check(SelectStatement(`SELECT ma_status FROM master_access WHERE ma_id = ?`, [accessId]));
  if (rows.length === 0) return "Access role not found.";
  if (rows[0].ma_status !== "ACTIVE") return "This access role is inactive.";
  return null;
};

// Usernames are encrypted, so they're compared after decrypting
const isUsernameTaken = async (username, excludeId = null) => {
  const rows = await Check(
    SelectStatement(
      `SELECT mu_username FROM master_users ${excludeId ? "WHERE mu_id <> ?" : ""}`,
      excludeId ? [excludeId] : [],
    ),
  );
  const target = username.toLowerCase();
  return rows.some((r) => safeDecrypt(r.mu_username).toLowerCase() === target);
};

// GET /load-maintenance-users
const loadUsers = async (req, res) => {
  try {
    const rows = await Check(SelectStatement(`${SELECT_USERS} ORDER BY mu.mu_id DESC`, []));
    return res.json(JsonDataResponse(rows.map(toUser)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /load-maintenance-users-access — every active role, system roles first
const loadAccessOptions = async (req, res) => {
  try {
    const rows = await Check(
      SelectStatement(
        `SELECT ma_id, ma_name, ma_is_system FROM master_access
          WHERE ma_status = 'ACTIVE'
          ORDER BY ma_is_system DESC, ma_name`,
        [],
      ),
    );
    return res.json(
      JsonDataResponse(
        rows.map((r) => ({ id: r.ma_id, name: r.ma_name, is_system: Number(r.ma_is_system) === 1 })),
      ),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /get-maintenance-users/:id
const getUsers = async (req, res) => {
  try {
    const rows = await Check(SelectStatement(`${SELECT_USERS} WHERE mu.mu_id = ?`, [req.params.id]));
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("User not found."));
    }
    return res.json(JsonDataResponse([toUser(rows[0])]));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /add-maintenance-users — { access_id, username, password }
const addUsers = async (req, res) => {
  const username = String(req.body?.username || "").trim();

  try {
    const accessId = req.body?.access_id;
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res.status(400).json(JsonWarningResponse("Username and password are required."));
    }
    if (username.length > USERNAME_MAX) {
      return res.status(400).json(JsonWarningResponse(`Username can be up to ${USERNAME_MAX} characters.`));
    }

    const accessProblem = await accessError(accessId);
    if (accessProblem) {
      return res.status(400).json(JsonWarningResponse(accessProblem));
    }

    if (await isUsernameTaken(username)) {
      return res.status(409).json(JsonWarningResponse("Username is already taken."));
    }

    const createBy = req.session.user.fullname;
    const createDate = GetCurrentDatetime();

    const result = await TransactionWithReturn([
      {
        sql: `INSERT INTO master_users
                (mu_access_id, mu_username, mu_password, mu_status, mu_is_update_password, mu_create_date, mu_create_by)
              VALUES (?, ?, ?, 'ACTIVE', 0, ?, ?)`,
        values: [accessId, EncrypterString(username), EncrypterString(password), createDate, createBy],
      },
    ]);

    // The password is never written to the audit log
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: AUDIT_ENTITY,
      entityId: result?.insertId ?? result?.[0]?.insertId ?? null,
      referenceNo: username,
      after: { username, access_id: accessId, status: "ACTIVE" },
      remarks: `Developer account created: ${username}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      referenceNo: username || null,
      error,
      remarks: "Developer account not created",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

// PUT /edit-maintenance-users/:id — { access_id, username, password?, status }
// A blank password keeps the current one
const editUsers = async (req, res) => {
  const { id } = req.params;
  let before = null;

  try {
    const accessId = req.body?.access_id;
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    const status = req.body?.status;

    if (!username) {
      return res.status(400).json(JsonWarningResponse("Username is required."));
    }
    if (username.length > USERNAME_MAX) {
      return res.status(400).json(JsonWarningResponse(`Username can be up to ${USERNAME_MAX} characters.`));
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Status must be ACTIVE or INACTIVE."));
    }

    const rows = await Check(SelectStatement(`${SELECT_USERS} WHERE mu.mu_id = ?`, [id]));
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("User not found."));
    }
    const current = toUser(rows[0]);
    before = { username: current.username, access_id: current.access_id, status: current.status };

    if (String(accessId) !== String(current.access_id)) {
      const accessProblem = await accessError(accessId);
      if (accessProblem) {
        return res.status(400).json(JsonWarningResponse(accessProblem));
      }
    }

    if (await isUsernameTaken(username, id)) {
      return res.status(409).json(JsonWarningResponse("Username is already taken."));
    }

    const sets = ["mu_access_id = ?", "mu_username = ?", "mu_status = ?"];
    const values = [accessId, EncrypterString(username), status];
    if (password) {
      sets.push("mu_password = ?");
      values.push(EncrypterString(password));
    }
    values.push(id);

    await TransactionWithReturn([
      { sql: `UPDATE master_users SET ${sets.join(", ")} WHERE mu_id = ?`, values },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: AUDIT_ENTITY,
      entityId: id,
      referenceNo: username,
      before,
      after: { username, access_id: accessId, status, password_changed: !!password },
      remarks:
        before.status !== status
          ? `Developer account ${status === "ACTIVE" ? "activated" : "deactivated"}: ${username}`
          : password
            ? `Developer account updated, password changed: ${username}`
            : `Developer account updated: ${username}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: id ?? null,
      referenceNo: before?.username ?? null,
      before,
      error,
      remarks: "Developer account not updated",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

module.exports = {
  loadUsers,
  loadAccessOptions,
  getUsers,
  addUsers,
  editUsers,
};