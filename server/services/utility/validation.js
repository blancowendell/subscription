// Shared input rules for the subscription system (admin + client portal).

const BUSINESS_TYPES = ["RETAIL", "TRADING", "RESTAURANT", "MANUFACTURING", "SERVICES", "OTHER"];
const RESERVED_TENANT_CODES = ["ADMIN", "MASTER", "ROOT", "SYSTEM", "ERP", "SUBS", "TEST", "DEMO", "MYSQL"];
const TENANT_CODE_MIN = 3;
const TENANT_CODE_MAX = 20;
const TENANT_CODE_PATTERN = /^[A-Z][A-Z0-9]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIN_PATTERN = /^[0-9-]+$/;
const PASSWORD_MIN = 8;

// Trimmed string; null/undefined become "".
const text = (v) => String(v ?? "").trim();

// Trimmed string, or null when blank.
const optional = (v) => text(v) || null;

const normalizeEmail = (v) => text(v).toLowerCase();
const normalizeCode = (v) => text(v).toUpperCase();

const isValidEmail = (email, max = 150) =>
  !!email && email.length <= max && EMAIL_PATTERN.test(email);

// Each validator returns an error message, or null when valid.

const validateTenantCode = (code, label = "Tenant code") => {
  if (!code) return `${label} is required.`;
  if (code.length < TENANT_CODE_MIN || code.length > TENANT_CODE_MAX)
    return `${label} must be ${TENANT_CODE_MIN} to ${TENANT_CODE_MAX} characters.`;
  if (!TENANT_CODE_PATTERN.test(code))
    return `${label} must start with a letter and use only letters and numbers.`;
  if (RESERVED_TENANT_CODES.includes(code)) return `That ${label.toLowerCase()} is reserved.`;
  return null;
};

const validatePassword = (pw) => {
  if (!pw) return "Password is required.";
  if (pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))
    return "Password must have at least one letter and one number.";
  return null;
};

const validateTin = (tin) => {
  if (!tin) return null;
  if (tin.length > 20 || !TIN_PATTERN.test(tin)) return "TIN can only use numbers and dashes.";
  return null;
};

const validateBusinessType = (type) =>
  BUSINESS_TYPES.includes(type) ? null : "Unknown business type.";

// Returns "<label> is required." / "<label> can be up to N characters." / null
const validateLength = (value, label, max, required = true) => {
  if (!value) return required ? `${label} is required.` : null;
  if (value.length > max) return `${label} can be up to ${max} characters.`;
  return null;
};

// Runs validators in order and returns the first error, or null.
const firstError = (...results) => results.find((r) => r) || null;

module.exports = {
  BUSINESS_TYPES,
  RESERVED_TENANT_CODES,
  EMAIL_PATTERN,
  PASSWORD_MIN,
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
};