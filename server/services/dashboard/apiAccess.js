const jwt = require("jsonwebtoken");
const { DecrypterString } = require("../repository/cryptography");
const { SelectParameter } = require("../connections/sqlhelper");

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

// A role's allowed data sources are kept briefly so a dashboard full of widgets
// doesn't run the same query for each one. Saving access clears it.
const CACHE_MS = 30 * 1000;
const roleCache = new Map();

const clearAccessCache = () => roleCache.clear();

const bearerToken = (req) => {
  const header = String(req.headers?.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

// Login signs JSON.stringify(payload) and encrypts the result; undo both
const readTokenPayload = (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(DecrypterString(token), process.env._SECRET_KEY);
    return typeof decoded === "string" ? JSON.parse(decoded) : decoded;
  } catch {
    return null;
  }
};

// The role behind a request: the user logged in here, or, for a call from another
// KAPS_ERP system, the user whose token that system passed along.
const getRequestAccessId = (req) => {
  const fromSession = Number(req.session?.user?.access_id);
  if (fromSession) return fromSession;

  const fromToken = Number(readTokenPayload(bearerToken(req))?.access_id);
  return fromToken || null;
};

// Who made the change, for maa_created_by (works for calls from SPARK_BOOKS too)
const getRequestUserName = (req) =>
  String(
    req.session?.user?.fullname || readTokenPayload(bearerToken(req))?.fullname || "System"
  ).slice(0, 100);

const loadRole = async (accessId) => {
  const hit = roleCache.get(accessId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;

  const [role] = await query(
    `SELECT ma_id, ma_status, ma_is_system FROM master_access WHERE ma_id = ? LIMIT 1`,
    [accessId]
  );

  const isSystem = Number(role?.ma_is_system) === 1;
  let apiNames = new Set();

  if (role && !isSystem) {
    // maintenance_api and master_access share the ma_ prefix, so every column is qualified
    const rows = await query(
      `SELECT api.ma_api_name
       FROM maintenance_api_access maa
       INNER JOIN maintenance_api api ON api.ma_id = maa.maa_api_id
       WHERE maa.maa_access_id = ? AND api.ma_status = 'ACTIVE'`,
      [accessId]
    );
    apiNames = new Set(rows.map((r) => String(r.ma_api_name)));
  }

  const entry = {
    at: Date.now(),
    exists: Boolean(role),
    active: role?.ma_status === "ACTIVE",
    isSystem,
    apiNames,
  };
  roleCache.set(accessId, entry);
  return entry;
};

// System roles (Administrator) may use every data source, like every page
const canUseDataSource = async (accessId, apiName) => {
  if (!accessId || !apiName) return false;
  const role = await loadRole(accessId);
  if (!role.exists || !role.active) return false;
  if (role.isSystem) return true;
  return role.apiNames.has(String(apiName));
};

// True for an active system role (Administrator)
const isSystemAccess = async (accessId) => {
  if (!accessId) return false;
  const role = await loadRole(accessId);
  return role.exists && role.active && role.isSystem;
};

module.exports = {
  getRequestAccessId,
  getRequestUserName,
  canUseDataSource,
  isSystemAccess,
  clearAccessCache,
};