const crypto = require("crypto");
const {
  InsertStatement,
  InsertCheck,
} = require("../connections/sqlhelper"); // ADJUST PATH
const { Audit } = require("../../database/model/Audit"); // ADJUST PATH

const T = Audit.audit_logs;

const SENSITIVE_KEY = /pass(word)?|token|secret|otp|pin|api_?key|jwt/i;
const MAX_STRING = 2000;

const nowSql = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// Masks secrets, drops base64, truncates long strings.
const sanitize = (value, key = "") => {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY.test(key)) return "***";
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[base64 omitted]";
    if (value.length > MAX_STRING && /^[A-Za-z0-9+/=\s]+$/.test(value)) return "[base64 omitted]";
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}...[truncated]` : value;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, key));
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitize(value[k], k);
    return out;
  }
  return value;
};

// Keys whose values differ between before and after.
const changedFields = (before, after) => {
  if (!before || !after) return null;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const k of keys) {
    if (/updated_at$|updated_by$/.test(k)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k);
  }
  return changed;
};

const toJson = (value) => (value === null || value === undefined ? null : JSON.stringify(value));

// From req.session.user set in the login controller.
const getActor = (req) => {
  const u = req.session?.user || {};
  return {
    id: u.id ?? null,
    source: u.user_source ?? null, // "MASTER" | "EMPLOYEE"
    name: u.fullname ?? null,
    role: u.access_type ?? null,
  };
};

const getIp = (req) =>
  req.headers["cf-connecting-ip"] ||
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.ip ||
  null;

const getRequestId = (req) => {
  if (!req.requestId) req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  return req.requestId;
};

// MOBILE when: passed explicitly, set on the session at mobile login,
// sent as x-client: mobile, or the request comes from Flutter/Dart's HTTP client.
const getDevice = (req, explicit) => {
  if (explicit === "MOBILE" || explicit === "WEB") return explicit;
  if (req.session?.device === "MOBILE") return "MOBILE";
  if (String(req.headers["x-client"] || "").toLowerCase() === "mobile") return "MOBILE";

  const ua = String(req.headers["user-agent"] || "");
  if (/^Dart\//i.test(ua) || /dart:io/i.test(ua)) return "MOBILE";

  return "WEB";
};

/**
 * Writes one audit log row in BOOKS. Never throws.
 *
 * logAudit(req, {
 *   module: "Sales Order",
 *   action: "UPDATE",            // CREATE | UPDATE | DELETE | VOID | APPROVE | REJECT | LOGIN | LOGIN_FAILED | LOGOUT | EXPORT | PRINT | SYNC
 *   entity: "sales_orders",
 *   entityId: id,
 *   referenceNo: "SO-0001",
 *   before: oldRow,
 *   after: newRow,
 *   remarks: "reason",
 *   status: "SUCCESS",           // SUCCESS | FAILED
 *   error: err,
 *   actor: { id, source, name, role }, // optional, overrides session (login/logout)
 *   device: "MOBILE",            // optional, overrides detection (MOBILE | WEB)
 * })
 */
const logAudit = async (req, opts) => {
  try {
    const actor = opts.actor || getActor(req);
    const before = sanitize(opts.before ?? null);
    const after = sanitize(opts.after ?? null);

    // Order must match T.insertColumns.
    const values = [
      "BOOKS",                                                      // system
      null,                                                         // source_log_id
      opts.module,                                                  // module
      opts.action,                                                  // action
      opts.entity ?? null,                                          // entity
      opts.entityId != null ? String(opts.entityId) : null,         // entity_id
      opts.referenceNo ?? null,                                     // reference_no
      actor.id != null ? String(actor.id) : null,                   // user_id
      actor.source ?? null,                                         // user_source
      actor.name ?? null,                                           // user_name
      actor.role ?? null,                                           // role
      toJson(before),                                               // before
      toJson(after),                                                // after
      toJson(changedFields(before, after)),                         // changed_fields
      opts.remarks ?? null,                                         // remarks
      opts.status || "SUCCESS",                                     // status
      opts.error ? String(opts.error.message || opts.error) : null, // error
      getRequestId(req),                                            // request_id
      getIp(req),                                                   // ip
      (req.headers["user-agent"] || "").slice(0, 255) || null,      // user_agent
      getDevice(req, opts.device),                                  // device
      nowSql(),                                                     // created_at
    ];

    const sql = InsertStatement(T.tablename, T.prefix, T.insertColumns);
    await InsertCheck(sql, [values]);
  } catch (error) {
    console.error("[logAudit] failed:", error.message);
  }
};

module.exports = {
  logAudit,
  sanitize,
  changedFields,
  getActor,
  getDevice,
  getRequestId,
  nowSql,
};