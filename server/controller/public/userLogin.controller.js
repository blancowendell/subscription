const {
  Encrypter,
  EncrypterString,
} = require("../../services/repository/cryptography");
const jwt = require("jsonwebtoken");
const {
  JsonErrorResponse,
  JsonDataResponse,
  MessageStatus,
  JsonWarningResponse,
} = require("../../services/repository/response");
const { Master } = require("../../database/model/Master");
const {
  DataModeling,
  SelectParameter,
} = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Authentication";

// Failed attempts have no session yet, so the attempted username is the reference.
// The password is never logged.
const logLoginFailed = (req, username, remarks, extra = {}) =>
  logAudit(req, {
    module: AUDIT_MODULE,
    action: "LOGIN_FAILED",
    status: "FAILED",
    entity: "master_employee_users",
    referenceNo: username ? String(username).slice(0, 100) : null,
    remarks,
    ...extra,
  });

const login = async (req, res) => {
  const username = req.body?.username;

  try {
    const { password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json(JsonWarningResponse("Username and password are required."));
    }

    const encryptedUsername = EncrypterString(username);

    const select_sql = `
     SELECT
      meu_id,
      meu_fullname,
      mw_name as meu_warehouse,
      mw_id as meu_warehouse_id,
      mc_name as meu_company,
      mc_id as meu_company_id,
      ma_name as meu_role,
      meu_access_id,
      meu_password,
      meu_status
      FROM master_employee_users
      INNER JOIN master_company ON master_employee_users.meu_company_id = mc_id
      INNER JOIN master_warehouse ON master_employee_users.meu_warehouse_id = mw_id
      INNER JOIN master_access ON master_employee_users.meu_access_id = master_access.ma_id
      WHERE meu_username = ?
    `;

    SelectParameter(select_sql, [encryptedUsername], async (err, result) => {
      if (err) {
        logLoginFailed(req, username, "Login error — database lookup failed", { error: err });
        return res.status(500).json(JsonErrorResponse(err));
      }

      if (!result || result.length === 0) {
        logLoginFailed(req, username, "Unknown username");
        return res.status(401).json(JsonWarningResponse(MessageStatus.INCORRECT));
      }

      const user = DataModeling(result, Master.master_employee_users.prefix_)[0];

      if (user.password !== EncrypterString(password)) {
        logLoginFailed(req, username, `Wrong password for ${user.fullname}`, {
          entityId: user.id,
        });
        return res.status(401).json(JsonWarningResponse(MessageStatus.INCORRECT));
      }

      if (user.status !== "ACTIVE") {
        logLoginFailed(req, username, `Inactive account: ${user.fullname}`, {
          entityId: user.id,
        });
        return res.status(403).json(JsonWarningResponse(MessageStatus.INACTIVE));
      }

      // access_id travels in the token so other KAPS_ERP systems can check this user's role
      const tokenPayload = {
        username,
        fullname: user.fullname,
        access_id: user.access_id,
        user_source: "EMPLOYEE",
      };

      const rawJwt = jwt.sign(JSON.stringify(tokenPayload), process.env._SECRET_KEY);
      const encryptedJwt = EncrypterString(rawJwt, {});

      req.session.jwt = encryptedJwt;
      req.session.user = {
        id: user.id,
        fullname: user.fullname,
        username,
        access_id: user.access_id,
        access_type: user.role,
        user_source: "EMPLOYEE",
        warehouse: user.warehouse,
        warehouse_id: user.warehouse_id,
        company: user.company,
        company_id: user.company_id,
      };

      req.session.save((err) => {
        if (err) {
          logLoginFailed(req, username, `Session could not be created for ${user.fullname}`, {
            entityId: user.id,
            error: err,
          });
          return res.status(500).json(JsonErrorResponse("Failed to create session."));
        }

        logAudit(req, {
          module: AUDIT_MODULE,
          action: "LOGIN",
          entity: "master_employee_users",
          entityId: user.id,
          referenceNo: user.fullname,
          after: {
            role: user.role,
            warehouse: user.warehouse,
            company: user.company,
          },
          remarks: `${user.fullname} logged in (${user.role}, ${user.warehouse})`,
        });

        const { password: _password, ...userWithoutPassword } = user;

        return res.status(200).json(
          JsonDataResponse({
            ...userWithoutPassword,
            user_source: "EMPLOYEE",
            token: encryptedJwt,
            access_type: user.role,
          })
        );
      });
    });
  } catch (error) {
    console.error("Login Error:", error);
    logLoginFailed(req, username, "Login error", { error });
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

const logout = async (req, res) => {
  // Keep the name for the request log before the session is destroyed
  res.locals.logUser = req.session?.user?.fullname;

  // Logged while the session still exists, so the actor is known
  if (req.session?.user) {
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "LOGOUT",
      entity: "master_employee_users",
      entityId: req.session.user.id,
      referenceNo: req.session.user.fullname,
      remarks: `${req.session.user.fullname} logged out`,
    });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.status(500).json(JsonErrorResponse("Failed to logout."));
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({ msg: "Logged out successfully." });
  });
};

const session = async (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({
      success: true,
      user: req.session.user,
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Not logged in.",
    });
  }
};

module.exports = {
  login,
  logout,
  session,
};