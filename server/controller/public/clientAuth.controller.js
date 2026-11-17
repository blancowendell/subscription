const jwt = require("jsonwebtoken");
const { EncrypterString } = require("../../services/repository/cryptography");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
  MessageStatus,
} = require("../../services/repository/response");
const { SelectParameter, Transaction } = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger");
const { SendVerifyEmail, SendResetPasswordEmail } = require("../../services/utility/emailService");
const {
  HashPassword,
  PasswordMatches,
  NewToken,
  HashToken,
} = require("../../services/utility/security");
const {
  text,
  optional,
  normalizeEmail,
  normalizeCode,
  isValidEmail,
  validateTenantCode,
  validatePassword,
  validateTin,
  validateBusinessType,
  validateLength,
  firstError,
} = require("../../services/utility/validation");

const VERIFY_TTL_HOURS = 24;
const RESET_TTL_HOURS = 1;
const SELF_SIGNUP = "SELF_SIGNUP";
const USER_SOURCE = "CLIENT";
const AUDIT_MODULE = "Client Authentication";
const GENERIC_EMAIL_REPLY = "If that email is registered, we've sent a message to it.";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const clientActor = (user) => ({
  id: user?.id ?? null,
  source: USER_SOURCE,
  name: user?.name ?? null,
  role: user?.role ?? null,
});

// ==========================================
// Data helpers
// ==========================================

const validateSignUp = (s) =>
  firstError(
    validateTenantCode(s.tenantCode, "Company code"),
    validateLength(s.companyName, "Company name", 150),
    validateTin(s.tin),
    validateLength(s.address, "Address", 255, false),
    validateBusinessType(s.businessType),
    validateLength(s.fullname, "Full name", 100),
    isValidEmail(s.email) ? null : "Email is not valid.",
    validateLength(s.phone, "Phone", 30, false),
    validatePassword(s.password)
  );

const findValidToken = async (raw, type) => {
  const rows = await query(
    `SELECT ct.ct_id, ct.ct_user_id, cu.cu_account_id, cu.cu_email, cu.cu_fullname, cu.cu_role
       FROM client_tokens ct
       INNER JOIN client_users cu ON cu.cu_id = ct.ct_user_id
      WHERE ct.ct_token_hash = ? AND ct.ct_type = ?
        AND ct.ct_used_at IS NULL AND ct.ct_expires_at > NOW()
      LIMIT 1`,
    [HashToken(raw), type]
  );
  return rows[0] || null;
};

const findClientUser = async (email) => {
  const rows = await query(
    `SELECT
       cu.cu_id AS id,
       cu.cu_account_id AS account_id,
       cu.cu_fullname AS fullname,
       cu.cu_email AS email,
       cu.cu_password AS password,
       cu.cu_role AS role,
       cu.cu_is_verified AS is_verified,
       cu.cu_is_update_password AS is_update_password,
       cu.cu_status AS status,
       ca.ca_tenant_code AS tenant_code,
       ca.ca_company_name AS company_name,
       ca.ca_status AS account_status
     FROM client_users cu
     INNER JOIN client_account ca ON ca.ca_id = cu.cu_account_id
     WHERE cu.cu_email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

// Cancels any unused tokens of this type, then stores a new one.
const issueTokenStatements = (userId, type, tokenHash, ttlHours) => [
  {
    sql: `UPDATE client_tokens SET ct_used_at = NOW()
          WHERE ct_user_id = ? AND ct_type = ? AND ct_used_at IS NULL`,
    values: [userId, type],
  },
  {
    sql: `INSERT INTO client_tokens
            (ct_user_id, ct_type, ct_token_hash, ct_expires_at, ct_used_at, ct_create_date)
          VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NULL, NOW())`,
    values: [userId, type, tokenHash, ttlHours],
  },
];

// ==========================================
// Middleware
// ==========================================

// Protects client portal routes. Use on every client portal router.
// Client sessions live in req.session.client / req.session.clientJwt,
// never in req.session.user / req.session.jwt, so they can't pass admin auth.
const requireClient = (req, res, next) => {
  if (!req.session?.client?.id || !req.session?.clientJwt) {
    return res.status(401).json(JsonWarningResponse("Please log in."));
  }
  return next();
};

// ==========================================
// Controllers
// ==========================================

// POST /client-auth/sign-up
// { tenantCode, companyName, tin, address, businessType, fullname, email, phone, password }
// Creates the account (PENDING) + OWNER user (unverified) + VERIFY token in one transaction.
const signUp = async (req, res) => {
  const tenantCode = normalizeCode(req.body?.tenantCode);
  const email = normalizeEmail(req.body?.email);

  try {
    const s = {
      tenantCode,
      companyName: text(req.body?.companyName),
      tin: optional(req.body?.tin),
      address: optional(req.body?.address),
      businessType: normalizeCode(req.body?.businessType),
      fullname: text(req.body?.fullname),
      email,
      phone: optional(req.body?.phone),
      password: String(req.body?.password || ""),
    };

    const invalid = validateSignUp(s);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const codeTaken = await query(
      `SELECT ca_id FROM client_account WHERE ca_tenant_code = ? LIMIT 1`,
      [tenantCode]
    );
    if (codeTaken.length > 0) {
      return res.status(409).json(JsonWarningResponse("Company code is already taken."));
    }

    const emailTaken = await query(`SELECT cu_id FROM client_users WHERE cu_email = ? LIMIT 1`, [
      email,
    ]);
    if (emailTaken.length > 0) {
      return res.status(409).json(JsonWarningResponse("Email is already registered."));
    }

    const token = NewToken();

    // LAST_INSERT_ID() chains the inserts inside the same transaction connection.
    await Transaction([
      {
        sql: `INSERT INTO client_account
                (ca_tenant_code, ca_company_name, ca_tin, ca_address, ca_business_type,
                 ca_contact_person, ca_contact_email, ca_contact_phone,
                 ca_status, ca_create_date, ca_create_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), ?)`,
        values: [
          tenantCode,
          s.companyName,
          s.tin,
          s.address,
          s.businessType,
          s.fullname,
          email,
          s.phone,
          SELF_SIGNUP,
        ],
      },
      {
        sql: `INSERT INTO client_users
                (cu_account_id, cu_fullname, cu_email, cu_password, cu_role,
                 cu_is_verified, cu_verified_at, cu_is_update_password,
                 cu_status, cu_create_date, cu_create_by)
              VALUES (LAST_INSERT_ID(), ?, ?, ?, 'OWNER', 0, NULL, 0, 'ACTIVE', NOW(), ?)`,
        values: [s.fullname, email, HashPassword(s.password), SELF_SIGNUP],
      },
      {
        sql: `INSERT INTO client_tokens
                (ct_user_id, ct_type, ct_token_hash, ct_expires_at, ct_used_at, ct_create_date)
              VALUES (LAST_INSERT_ID(), 'VERIFY', ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NULL, NOW())`,
        values: [token.hash, VERIFY_TTL_HOURS],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SIGN_UP",
      entity: "client_account",
      entityId: null,
      referenceNo: `${tenantCode} / ${email}`,
      after: { tenantCode, companyName: s.companyName, businessType: s.businessType, email },
      remarks: "Client signed up",
      actor: clientActor({ name: email, role: "OWNER" }),
    });

    try {
      await SendVerifyEmail(email, s.fullname, token.raw, VERIFY_TTL_HOURS);
    } catch (mailError) {
      console.error("Verify Email Error:", mailError);
      return res
        .status(200)
        .json(
          JsonWarningResponse(
            "Account created, but we couldn't send the verification email. Use resend verification."
          )
        );
    }

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error("Sign Up Error:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SIGN_UP",
      status: "FAILED",
      entity: "client_account",
      entityId: null,
      referenceNo: `${tenantCode || "-"} / ${email || "-"}`,
      error,
      remarks: "Client sign-up failed",
      actor: clientActor({ name: email || null }),
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-auth/verify-email — { token }
// Marks the user verified and moves a PENDING account to ACTIVE.
const verifyEmail = async (req, res) => {
  try {
    const found = await findValidToken(req.body?.token, "VERIFY");
    if (!found) {
      return res.status(400).json(JsonWarningResponse("This link is invalid or has expired."));
    }

    await Transaction([
      {
        sql: `UPDATE client_tokens SET ct_used_at = NOW() WHERE ct_id = ?`,
        values: [found.ct_id],
      },
      {
        sql: `UPDATE client_users
              SET cu_is_verified = 1, cu_verified_at = NOW(),
                  cu_update_date = NOW(), cu_update_by = ?
              WHERE cu_id = ?`,
        values: [found.cu_email, found.ct_user_id],
      },
      {
        sql: `UPDATE client_account
              SET ca_status = 'ACTIVE', ca_update_date = NOW(), ca_update_by = ?
              WHERE ca_id = ? AND ca_status = 'PENDING'`,
        values: [found.cu_email, found.cu_account_id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "VERIFY_EMAIL",
      entity: "client_users",
      entityId: found.ct_user_id,
      referenceNo: found.cu_email,
      remarks: "Client email verified",
      actor: clientActor({ id: found.ct_user_id, name: found.cu_email, role: found.cu_role }),
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error("Verify Email Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-auth/resend-verification — { email }
// Always gives the same reply so emails can't be probed.
const resendVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const rows = await query(
      `SELECT cu_id, cu_fullname FROM client_users
        WHERE cu_email = ? AND cu_is_verified = 0 AND cu_status = 'ACTIVE' LIMIT 1`,
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const token = NewToken();

      await Transaction(issueTokenStatements(user.cu_id, "VERIFY", token.hash, VERIFY_TTL_HOURS));
      await SendVerifyEmail(email, user.cu_fullname, token.raw, VERIFY_TTL_HOURS);
    }

    return res.status(200).json(JsonDataResponse({ message: GENERIC_EMAIL_REPLY }));
  } catch (error) {
    console.error("Resend Verification Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-auth/login — { email, password }
const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json(JsonWarningResponse("Email and password are required."));
    }

    const user = await findClientUser(email);

    const failLogin = (remarks) =>
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "LOGIN_FAILED",
        entity: "client_users",
        entityId: user ? user.id : null,
        referenceNo: email,
        status: "FAILED",
        remarks,
        actor: clientActor({ id: user?.id, name: email, role: user?.role }),
      });

    if (!user || !PasswordMatches(password, user.password)) {
      failLogin(user ? "Wrong password" : "Unknown email");
      return res.status(401).json(JsonWarningResponse(MessageStatus.INCORRECT));
    }

    if (Number(user.is_verified) !== 1) {
      failLogin("Email not verified");
      return res.status(403).json(JsonWarningResponse("Please verify your email first."));
    }

    if (user.status !== "ACTIVE" || user.account_status === "BLOCKED") {
      failLogin(user.status !== "ACTIVE" ? "Inactive user" : "Blocked account");
      return res.status(403).json(JsonWarningResponse(MessageStatus.INACTIVE));
    }

    await Transaction([
      {
        sql: `UPDATE client_users SET cu_last_login_at = NOW() WHERE cu_id = ?`,
        values: [user.id],
      },
    ]);

    const tokenPayload = {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      account_id: user.account_id,
      tenant_code: user.tenant_code,
      role: user.role,
      user_source: USER_SOURCE,
    };

    const rawJwt = jwt.sign(JSON.stringify(tokenPayload), process.env._SECRET_KEY);
    const encryptedJwt = EncrypterString(rawJwt, {});

    req.session.clientJwt = encryptedJwt;
    req.session.client = {
      id: user.id,
      account_id: user.account_id,
      tenant_code: user.tenant_code,
      company_name: user.company_name,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      is_update_password: Number(user.is_update_password) === 1,
      user_source: USER_SOURCE,
    };

    req.session.save((err) => {
      if (err) {
        return res.status(500).json(JsonErrorResponse("Failed to create session."));
      }

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "LOGIN",
        entity: "client_users",
        entityId: user.id,
        referenceNo: email,
        actor: clientActor({ id: user.id, name: email, role: user.role }),
      });

      return res.status(200).json(
        JsonDataResponse({
          ...req.session.client,
          token: encryptedJwt,
        })
      );
    });
  } catch (error) {
    console.error("Client Login Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-auth/logout
// Only clears the client keys, so an admin logged in on the same browser stays logged in.
const logout = async (req, res) => {
  const client = req.session?.client || null;
  res.locals.logUser = client?.email;

  const finish = (err) => {
    if (err) {
      console.error("Client Logout Error:", err);
      return res.status(500).json(JsonErrorResponse("Failed to logout."));
    }

    if (client?.id) {
      logAudit(req, {
        module: AUDIT_MODULE,
        action: "LOGOUT",
        entity: "client_users",
        entityId: client.id,
        referenceNo: client.email,
        actor: clientActor({ id: client.id, name: client.email, role: client.role }),
      });
    }

    return res.status(200).json({ msg: "Logged out successfully." });
  };

  if (!req.session) return finish();

  delete req.session.client;
  delete req.session.clientJwt;

  if (req.session.user) {
    return req.session.save(finish);
  }

  return req.session.destroy((err) => {
    if (!err) res.clearCookie("connect.sid");
    finish(err);
  });
};

// GET /client-auth/session — current client session
const session = async (req, res) => {
  if (req.session && req.session.client) {
    return res.status(200).json({
      success: true,
      user: req.session.client,
    });
  }

  return res.status(401).json({
    success: false,
    message: "Not logged in.",
  });
};

// POST /client-auth/forgot-password — { email }
// Always gives the same reply so emails can't be probed.
const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const rows = await query(
      `SELECT cu_id, cu_fullname, cu_role FROM client_users
        WHERE cu_email = ? AND cu_status = 'ACTIVE' LIMIT 1`,
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const token = NewToken();

      await Transaction(issueTokenStatements(user.cu_id, "RESET", token.hash, RESET_TTL_HOURS));
      await SendResetPasswordEmail(email, user.cu_fullname, token.raw, RESET_TTL_HOURS);

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "FORGOT_PASSWORD",
        entity: "client_users",
        entityId: user.cu_id,
        referenceNo: email,
        remarks: "Password reset link sent",
        actor: clientActor({ id: user.cu_id, name: email, role: user.cu_role }),
      });
    }

    return res.status(200).json(JsonDataResponse({ message: GENERIC_EMAIL_REPLY }));
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-auth/reset-password — { token, password }
const resetPassword = async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    const badPassword = validatePassword(password);
    if (badPassword) {
      return res.status(400).json(JsonWarningResponse(badPassword));
    }

    const found = await findValidToken(req.body?.token, "RESET");
    if (!found) {
      return res.status(400).json(JsonWarningResponse("This link is invalid or has expired."));
    }

    await Transaction([
      {
        sql: `UPDATE client_tokens SET ct_used_at = NOW()
              WHERE ct_user_id = ? AND ct_type = 'RESET' AND ct_used_at IS NULL`,
        values: [found.ct_user_id],
      },
      {
        sql: `UPDATE client_users
              SET cu_password = ?, cu_is_update_password = 0,
                  cu_update_date = NOW(), cu_update_by = ?
              WHERE cu_id = ?`,
        values: [HashPassword(password), found.cu_email, found.ct_user_id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD",
      entity: "client_users",
      entityId: found.ct_user_id,
      referenceNo: found.cu_email,
      remarks: "Password reset via email link",
      actor: clientActor({ id: found.ct_user_id, name: found.cu_email, role: found.cu_role }),
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-auth/change-password — { currentPassword, newPassword }  (logged in)
// Also clears the first-login "must change password" flag.
const changePassword = async (req, res) => {
  const client = req.session?.client;

  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    const badPassword = validatePassword(newPassword);
    if (badPassword) {
      return res.status(400).json(JsonWarningResponse(badPassword));
    }
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json(JsonWarningResponse("New password must be different from the current one."));
    }

    const rows = await query(`SELECT cu_password FROM client_users WHERE cu_id = ?`, [client.id]);
    if (rows.length === 0 || !PasswordMatches(currentPassword, rows[0].cu_password)) {
      return res.status(400).json(JsonWarningResponse("Current password is incorrect."));
    }

    await Transaction([
      {
        sql: `UPDATE client_users
              SET cu_password = ?, cu_is_update_password = 0,
                  cu_update_date = NOW(), cu_update_by = ?
              WHERE cu_id = ?`,
        values: [HashPassword(newPassword), client.email, client.id],
      },
    ]);

    req.session.client.is_update_password = false;

    req.session.save((err) => {
      if (err) {
        return res.status(500).json(JsonErrorResponse("Failed to update session."));
      }

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "CHANGE_PASSWORD",
        entity: "client_users",
        entityId: client.id,
        referenceNo: client.email,
        remarks: "Client changed password",
        actor: clientActor({ id: client.id, name: client.email, role: client.role }),
      });

      return res.status(200).json(JsonSuccess());
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  requireClient,
  signUp,
  verifyEmail,
  resendVerification,
  login,
  logout,
  session,
  forgotPassword,
  resetPassword,
  changePassword,
};