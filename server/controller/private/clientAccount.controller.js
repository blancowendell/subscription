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

const STATUSES = ["PENDING", "ACTIVE", "BLOCKED"];
const BUSINESS_TYPES = ["RETAIL", "TRADING", "RESTAURANT", "MANUFACTURING", "SERVICES", "OTHER"];
const RESERVED_CODES = ["ADMIN", "MASTER", "ROOT", "SYSTEM", "ERP", "SUBS", "TEST", "DEMO", "MYSQL"];
const CODE_MIN = 3;
const CODE_MAX = 20;
const CODE_PATTERN = /^[A-Z][A-Z0-9]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIN_PATTERN = /^[0-9-]+$/;
const LIMITS = {
  companyName: 150,
  tin: 20,
  address: 255,
  contactPerson: 100,
  contactEmail: 150,
  contactPhone: 30,
};
const AUDIT_MODULE = "Client Account";

const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    SelectParameter(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );

const baseSelect = () =>
  SelectAllStatement(Client.client_account.tablename, Client.client_account.selectColumns);

const toAccounts = (rows) =>
  rows.length ? DataModeling(rows, Client.client_account.prefix_) : [];

const text = (v) => String(v ?? "").trim();
const optional = (v) => text(v) || null;

const readAccount = (body = {}) => ({
  companyName: text(body.companyName),
  tin: optional(body.tin),
  address: optional(body.address),
  businessType: text(body.businessType).toUpperCase(),
  contactPerson: text(body.contactPerson),
  contactEmail: text(body.contactEmail).toLowerCase(),
  contactPhone: optional(body.contactPhone),
});

const validateCode = (code) => {
  if (!code) return "Tenant code is required.";
  if (code.length < CODE_MIN || code.length > CODE_MAX)
    return `Tenant code must be ${CODE_MIN} to ${CODE_MAX} characters.`;
  if (!CODE_PATTERN.test(code))
    return "Tenant code must start with a letter and use only letters and numbers.";
  if (RESERVED_CODES.includes(code)) return "That tenant code is reserved.";
  return null;
};

const validateAccount = (a) => {
  if (!a.companyName) return "Company name is required.";
  if (a.companyName.length > LIMITS.companyName)
    return `Company name can be up to ${LIMITS.companyName} characters.`;
  if (a.tin && (a.tin.length > LIMITS.tin || !TIN_PATTERN.test(a.tin)))
    return "TIN can only use numbers and dashes.";
  if (a.address && a.address.length > LIMITS.address)
    return `Address can be up to ${LIMITS.address} characters.`;
  if (!BUSINESS_TYPES.includes(a.businessType)) return "Unknown business type.";
  if (!a.contactPerson) return "Contact person is required.";
  if (a.contactPerson.length > LIMITS.contactPerson)
    return `Contact person can be up to ${LIMITS.contactPerson} characters.`;
  if (!a.contactEmail) return "Contact email is required.";
  if (a.contactEmail.length > LIMITS.contactEmail || !EMAIL_PATTERN.test(a.contactEmail))
    return "Contact email is not valid.";
  if (a.contactPhone && a.contactPhone.length > LIMITS.contactPhone)
    return `Contact phone can be up to ${LIMITS.contactPhone} characters.`;
  return null;
};

const rowToSnapshot = (row) => ({
  id: row.ca_id,
  tenantCode: row.ca_tenant_code,
  companyName: row.ca_company_name,
  tin: row.ca_tin,
  address: row.ca_address,
  businessType: row.ca_business_type,
  contactPerson: row.ca_contact_person,
  contactEmail: row.ca_contact_email,
  contactPhone: row.ca_contact_phone,
  status: row.ca_status,
});

// GET /client-account/load-client-account — all client accounts
const getClientAccounts = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} ORDER BY ca_company_name`);
    return res.json(JsonDataResponse(toAccounts(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /client-account/get-client-account/:id — one client account
const getClientAccountById = async (req, res) => {
  try {
    const rows = await query(`${baseSelect()} WHERE ca_id = ?`, [req.params.id]);
    return res.json(JsonDataResponse(toAccounts(rows)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// GET /client-account/check-tenant-code/:code — is the tenant code available?
const checkTenantCode = async (req, res) => {
  try {
    const code = text(req.params.code).toUpperCase();
    const invalid = validateCode(code);
    if (invalid) {
      return res.json(JsonDataResponse([{ code, available: false, reason: invalid }]));
    }

    const existing = await query(
      `SELECT ca_id FROM client_account WHERE ca_tenant_code = ? LIMIT 1`,
      [code]
    );
    return res.json(
      JsonDataResponse([
        {
          code,
          available: existing.length === 0,
          reason: existing.length ? "Tenant code is already taken." : null,
        },
      ])
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// POST /client-account/add-client-account
// { tenantCode, companyName, tin, address, businessType, contactPerson, contactEmail, contactPhone }
// Admin-created accounts start ACTIVE. Self sign-ups (client portal) will start PENDING.
const addClientAccount = async (req, res) => {
  const code = text(req.body?.tenantCode).toUpperCase();

  try {
    const badCode = validateCode(code);
    if (badCode) {
      return res.status(400).json(JsonWarningResponse(badCode));
    }

    const account = readAccount(req.body);
    const invalid = validateAccount(account);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const existing = await query(
      `SELECT ca_id FROM client_account WHERE ca_tenant_code = ? LIMIT 1`,
      [code]
    );
    if (existing.length > 0) {
      return res.status(409).json(JsonWarningResponse("exist"));
    }

    const createBy = req.session.user.fullname;

    const result = await TransactionWithReturn([
      {
        sql: `INSERT INTO client_account
                (ca_tenant_code, ca_company_name, ca_tin, ca_address, ca_business_type,
                 ca_contact_person, ca_contact_email, ca_contact_phone,
                 ca_status, ca_create_date, ca_create_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?)`,
        values: [
          code,
          account.companyName,
          account.tin,
          account.address,
          account.businessType,
          account.contactPerson,
          account.contactEmail,
          account.contactPhone,
          createBy,
        ],
      },
    ]);

    let id = result?.insertId ?? result?.[0]?.insertId;
    if (!id) {
      const created = await query(
        `SELECT ca_id FROM client_account WHERE ca_tenant_code = ? LIMIT 1`,
        [code]
      );
      id = created[0]?.ca_id;
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: "client_account",
      entityId: id,
      referenceNo: code,
      after: { id, tenantCode: code, ...account, status: "ACTIVE" },
      remarks: "Client account created",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: "client_account",
      entityId: null,
      referenceNo: code || null,
      error,
      remarks: "Client account not created",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

// PUT /client-account/update-client-account/:id
// { companyName, tin, address, businessType, contactPerson, contactEmail, contactPhone, accountStatus }
// Tenant code is locked after creation; it becomes the ERP tenant code and database name.
const updateClientAccount = async (req, res) => {
  const id = req.params.id;
  let before = null;

  try {
    const rows = await query(`SELECT * FROM client_account WHERE ca_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Client account not found."));
    }

    const current = rows[0];
    before = rowToSnapshot(current);

    const requestedCode = text(req.body?.tenantCode).toUpperCase();
    if (requestedCode && requestedCode !== current.ca_tenant_code) {
      return res.status(400).json(JsonWarningResponse("Tenant code can't be changed."));
    }

    const account = readAccount(req.body);
    const invalid = validateAccount(account);
    if (invalid) {
      return res.status(400).json(JsonWarningResponse(invalid));
    }

    const status = text(req.body?.accountStatus).toUpperCase();
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Unknown status."));
    }

    const updatedBy = req.session.user.fullname;

    await Transaction([
      {
        sql: `UPDATE client_account
              SET ca_company_name = ?, ca_tin = ?, ca_address = ?, ca_business_type = ?,
                  ca_contact_person = ?, ca_contact_email = ?, ca_contact_phone = ?,
                  ca_status = ?, ca_update_date = NOW(), ca_update_by = ?
              WHERE ca_id = ?`,
        values: [
          account.companyName,
          account.tin,
          account.address,
          account.businessType,
          account.contactPerson,
          account.contactEmail,
          account.contactPhone,
          status,
          updatedBy,
          id,
        ],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: "client_account",
      entityId: id,
      referenceNo: current.ca_tenant_code,
      before,
      after: { id: current.ca_id, tenantCode: current.ca_tenant_code, ...account, status },
      remarks:
        current.ca_status !== status
          ? `Client account status changed to ${status}`
          : "Client account updated",
    });

    return res.status(200).json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: "client_account",
      entityId: id,
      referenceNo: before?.tenantCode || null,
      before,
      error,
      remarks: `Client account not updated (#${id})`,
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  getClientAccounts,
  getClientAccountById,
  checkTenantCode,
  addClientAccount,
  updateClientAccount,
};