var express = require("express");
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
const { SelectParameter } = require("../../services/connections/sqlhelper");
const { logAudit, getActor } = require("../../services/utility/auditLogger"); // ADJUST PATH

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

// Matches encrypted usernames (new accounts) and plain-text usernames
// (accounts created before encryption). Encrypted match wins if both exist.
const findMasterUser = async (encryptedUsername, username) => {
  const rows = await query(
    `SELECT
       mu_id AS id,
       mu_password AS password,
       mu_status AS status,
       mu_is_update_password AS is_update_password,
       mu_access_id AS access_id,
       master_access.ma_name AS role,
       master_access.ma_is_system AS is_system
     FROM master_users
     INNER JOIN master_access ON master_users.mu_access_id = master_access.ma_id
     WHERE mu_username = ? OR mu_username = ?
     ORDER BY (mu_username = ?) DESC
     LIMIT 1`,
    [encryptedUsername, username, encryptedUsername]
  );

  if (!rows[0]) return null;

  return {
    ...rows[0],
    is_system: !!rows[0].is_system,
    fullname: username,
  };
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json(JsonWarningResponse("Username and password are required."));
    }

    const encryptedUsername = EncrypterString(username);
    const user = await findMasterUser(encryptedUsername, username);

    if (!user || user.password !== EncrypterString(password)) {
      logAudit(req, {
        module: "Authentication",
        action: "LOGIN_FAILED",
        entity: "master_users",
        entityId: user ? user.id : null,
        referenceNo: username,
        status: "FAILED",
        remarks: user ? "Wrong password" : "Unknown username",
        actor: {
          id: user ? user.id : null,
          source: "MASTER",
          name: username,
          role: user ? user.role : null,
        },
      });

      return res.status(401).json(JsonWarningResponse(MessageStatus.INCORRECT));
    }

    if (user.status !== "ACTIVE") {
      logAudit(req, {
        module: "Authentication",
        action: "LOGIN_FAILED",
        entity: "master_users",
        entityId: user.id,
        referenceNo: username,
        status: "FAILED",
        remarks: "Inactive account",
        actor: { id: user.id, source: "MASTER", name: user.fullname, role: user.role },
      });

      return res.status(403).json(JsonWarningResponse(MessageStatus.INACTIVE));
    }

    // access_id and is_system travel in the token so API calls with a bearer token can be authorized
    const tokenPayload = {
      username,
      fullname: user.fullname,
      access_id: user.access_id,
      access_type: user.role,
      is_system: user.is_system,
      user_source: "MASTER",
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
      is_system: user.is_system,
      user_source: "MASTER",
    };

    req.session.save((err) => {
      if (err) {
        return res.status(500).json(JsonErrorResponse("Failed to create session."));
      }

      logAudit(req, {
        module: "Authentication",
        action: "LOGIN",
        entity: "master_users",
        entityId: user.id,
        referenceNo: username,
      });

      const { password: _password, ...userWithoutPassword } = user;

      return res.status(200).json(
        JsonDataResponse({
          ...userWithoutPassword,
          user_source: "MASTER",
          token: encryptedJwt,
          access_type: user.role,
        })
      );
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

const logout = async (req, res) => {
  // Keep the name for the request log before the session is destroyed
  res.locals.logUser = req.session?.user?.fullname;

  // Capture actor before the session is gone
  const actor = getActor(req);
  const username = req.session?.user?.username ?? null;

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.status(500).json(JsonErrorResponse("Failed to logout."));
    }

    if (actor.id) {
      logAudit(req, {
        module: "Authentication",
        action: "LOGOUT",
        entity: "master_users",
        entityId: actor.id,
        referenceNo: username,
        actor,
      });
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