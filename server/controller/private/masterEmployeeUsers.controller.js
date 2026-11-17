const { Master } = require("../../database/model/Master");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { STATUS_LOG } = require("../../services/repository/enum/enums");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
} = require("../../services/repository/response");
const { EncrypterString, DecrypterString } = require("../../services/repository/cryptography");
const { validateOrLink } = require("../../services/utility/validator");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH
const {
  DataModeling,
  SelectParameter,
  Check,
  Query,
  TransactionWithReturn,
  TransactionWithConnection,
  SelectStatement,
  InsertStatementTransCommit,
} = require("../../services/connections/sqlhelper");
const {
  getPaginationParams,
  buildSearchQuery,
  buildPaginatedResponse,
} = require("../../services/utility/pagination_helper");
const XLSX = require("xlsx");
const { SendEmail } = require("../../services/repository/mailer");
const crypto = require("crypto");

const MEU = Master.master_employee_users;
const MC = Master.master_company;
const MW = Master.master_warehouse;
const MA = Master.master_access;

const APP_NAME = process.env._APP_NAME || "The Admin Team";

/* =======================
   AUDIT
======================= */

const AUDIT_MODULE = "Employee Users";
const AUDIT_ENTITY = MEU.tablename;

// Row without the table prefix
const stripPrefix = (row, prefix) =>
  row
    ? Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.startsWith(prefix) ? k.slice(prefix.length) : k, v]),
      )
    : null;

/* =======================
   GUARDS
======================= */

// Role row by id (ma_is_system = full-access role, never assignable here)
const getAccess = async (accessId) => {
  const rows = await Check(
    SelectStatement(`SELECT ma_id, ma_name, ma_is_system, ma_status FROM master_access WHERE ma_id = ?`, [accessId]),
  );
  return rows[0] || null;
};

const isSystemAccess = (access) => Number(access?.ma_is_system) === 1;

// True if this account belongs to a system role (hidden and protected here)
const isSystemUser = async (meuId) => {
  const rows = await Check(
    SelectStatement(
      `SELECT ma.ma_is_system
         FROM master_employee_users meu
         LEFT JOIN master_access ma ON ma.ma_id = meu.meu_access_id
        WHERE meu.meu_id = ?`,
      [meuId],
    ),
  );
  return rows.length > 0 && Number(rows[0].ma_is_system) === 1;
};

// One account per employee. Returns a message on conflict, otherwise null.
const findAccountConflict = async ({ employeeid, excludeId = null }) => {
  const conditions = ["meu.meu_employee_id = ?"];
  const params = [employeeid];

  if (excludeId) {
    conditions.push("meu.meu_id <> ?");
    params.push(excludeId);
  }

  const rows = await Check(
    SelectStatement(
      `SELECT meu.meu_id, ma.ma_name
         FROM master_employee_users meu
         LEFT JOIN master_access ma ON ma.ma_id = meu.meu_access_id
        WHERE ${conditions.join(" AND ")}
        LIMIT 1`,
      params,
    ),
  );

  if (rows.length === 0) return null;

  const role = rows[0].ma_name || "another role";
  return `This employee already has an account (${role}). Edit that account to change its role.`;
};

// Usernames are encrypted, so they're compared after decrypting
const isUsernameTaken = async (username, excludeId = null) => {
  const rows = await Check(
    SelectStatement(
      `SELECT meu_username FROM master_employee_users ${excludeId ? "WHERE meu_id <> ?" : ""}`,
      excludeId ? [excludeId] : [],
    ),
  );

  return rows.some((row) => {
    try {
      return DecrypterString(row.meu_username) === username;
    } catch {
      return false;
    }
  });
};

const credentialsEmail = (fullname, username, password, intro) => `
  <p>Hi ${fullname},</p>
  <p>${intro}</p>
  <ul>
    <li><strong>Username:</strong> ${username}</li>
    <li><strong>Password:</strong> ${password}</li>
  </ul>
  <p>For your security, please log in and change your password as soon as possible.</p>
  <p>— ${APP_NAME}</p>
`;

const generateRandomPassword = (length = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

/* =======================
   LOADERS
======================= */

const fromClauseBase = `
  FROM ${MEU.tablename}
  LEFT JOIN ${MA.tablename} ON ${MEU.tablename}.meu_access_id = ${MA.tablename}.ma_id
  LEFT JOIN ${MC.tablename} ON ${MEU.tablename}.meu_company_id = ${MC.tablename}.mc_id
  LEFT JOIN ${MW.tablename} ON ${MEU.tablename}.meu_warehouse_id = ${MW.tablename}.mw_id
  WHERE COALESCE(${MA.tablename}.ma_is_system, 0) = 0`;

// GET — system-role accounts are never listed
const loadEmployeeUsers = async (req, res) => {
  try {
    const cols = MEU.selectColumns.map((c) => `${MEU.tablename}.${c}`).join(", ");
    const sql = `SELECT ${cols}, mc_name, mw_name, ma_name ${fromClauseBase}`;

    SelectParameter(sql, [], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        return res.json(JsonDataResponse(DataModeling(result, MEU.prefix_)));
      }

      return res.json(JsonDataResponse([]));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

// GET paginated — system-role accounts are never listed
const loadEmployeeUsersPaginated = async (req, res) => {
  try {
    const { page, limit, offset, search } = getPaginationParams(req);

    const columnsToSearch = ["meu_fullname", "meu_id", "mc_name", "mw_name", "ma_name"];
    const { searchClause, searchParams } = buildSearchQuery(search, columnsToSearch);

    const fromClause = `${fromClauseBase} ${search ? searchClause : ""}`;
    const countParams = search ? searchParams : [];

    const countSql = `SELECT COUNT(${MEU.tablename}.meu_id) AS totalCount ${fromClause}`;

    SelectParameter(countSql, countParams, (countErr, countResult) => {
      if (countErr) {
        console.error("Count DB Error:", countErr);
        return res.json(JsonErrorResponse(countErr));
      }

      const totalItems = countResult[0].totalCount;
      const cols = MEU.selectColumns.map((c) => `${MEU.tablename}.${c}`).join(", ");

      const mainSql = `
        SELECT ${cols}, mc_name, mw_name, ma_name
        FROM (
          SELECT ${MEU.tablename}.meu_id AS paginated_id
          ${fromClause}
          ORDER BY ${MEU.tablename}.meu_id DESC
          LIMIT ? OFFSET ?
        ) AS paginated
        INNER JOIN ${MEU.tablename} ON paginated.paginated_id = ${MEU.tablename}.meu_id
        LEFT JOIN ${MA.tablename} ON ${MEU.tablename}.meu_access_id = ${MA.tablename}.ma_id
        LEFT JOIN ${MC.tablename} ON ${MEU.tablename}.meu_company_id = ${MC.tablename}.mc_id
        LEFT JOIN ${MW.tablename} ON ${MEU.tablename}.meu_warehouse_id = ${MW.tablename}.mw_id
        ORDER BY ${MEU.tablename}.meu_id DESC
      `;

      SelectParameter(mainSql, [...countParams, limit, offset], (err, result) => {
        if (err) {
          console.error("Main DB Error:", err);
          return res.json(JsonErrorResponse(err));
        }

        if (result && result.length > 0) {
          const modeled = DataModeling(result, MEU.prefix_);
          return res.json(buildPaginatedResponse(modeled, totalItems, page, limit));
        }

        return res.json(buildPaginatedResponse([], 0, page, limit));
      });
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

// GET BY ID — the username is decrypted; the password is never returned
const getEmployeeUsers = async (req, res) => {
  try {
    const { id } = req.params;

    if (await isSystemUser(id)) {
      return res.status(403).json(JsonWarningResponse("System accounts can't be viewed here."));
    }

    const sql = `SELECT ${MEU.selectColumns.join(", ")} FROM ${MEU.tablename} WHERE meu_id = ?`;

    SelectParameter(sql, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        const data = DataModeling(result, MEU.prefix_).map((user) => {
          let username = "";
          try {
            username = user.username ? DecrypterString(user.username) : "";
          } catch (decryptionError) {
            console.error("Decryption failed for user:", user.id, decryptionError.message);
          }
          const { password: _password, ...rest } = user;
          return { ...rest, username };
        });

        return res.json(JsonDataResponse(data));
      }

      return res.json(JsonDataResponse([]));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

/* =======================
   ADD / EDIT
======================= */

// POST
const addEmployeeUsers = async (req, res) => {
  const auditBody = req.body || {};

  try {
    const required = {
      employeeid: "Employee ID is required.",
      access_id: "Access ID is required.",
      company_id: "Company ID is required.",
      warehouse_id: "Warehouse ID is required.",
      username: "Username is required.",
      password: "Password is required.",
    };

    if (!validateOrLink(req, res, required)) return;

    const { employeeid, access_id, company_id, warehouse_id, username, password } = req.body;

    const access = await getAccess(access_id);
    if (!access) {
      return res.status(404).json(JsonWarningResponse("Access role not found"));
    }
    if (isSystemAccess(access)) {
      return res.status(403).json(JsonWarningResponse("System roles can't be assigned here."));
    }

    const conflict = await findAccountConflict({ employeeid });
    if (conflict) {
      return res.status(409).json(JsonWarningResponse(conflict));
    }

    if (await isUsernameTaken(username)) {
      return res.status(409).json(JsonWarningResponse("Username is already taken"));
    }

    const fullNameResult = await Check(
      SelectStatement(
        `SELECT CONCAT(me_first_name, ' ', me_last_name) AS fullname FROM master_employee WHERE me_id = ?`,
        [employeeid],
      ),
    );
    const fullName = fullNameResult[0]?.fullname;
    if (!fullName) {
      return res.status(404).json(JsonWarningResponse("Employee not found"));
    }

    const create_date = GetCurrentDatetime();
    const status = STATUS_LOG.ACTIVE;
    const create_by = req.session.user.fullname;

    const sql = InsertStatementTransCommit(MEU.tablename, MEU.prefix, MEU.insertColumns);

    const txResult = await TransactionWithReturn([
      {
        sql,
        values: [
          fullName,
          access_id,
          employeeid,
          company_id,
          warehouse_id,
          EncrypterString(username),
          EncrypterString(password),
          create_date,
          create_by,
          status,
        ],
      },
    ]);

    const newId = txResult?.[0]?.insertId ?? txResult?.[0]?.[0]?.insertId ?? txResult?.insertId ?? null;

    // The password is never written to the audit log
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: AUDIT_ENTITY,
      entityId: newId,
      referenceNo: String(employeeid),
      before: null,
      after: {
        fullname: fullName,
        employee_id: employeeid,
        access_id,
        company_id,
        warehouse_id,
        username,
        status,
      },
      remarks: `Account created (employee #${employeeid})`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: auditBody.employeeid != null ? String(auditBody.employeeid) : null,
      before: null,
      error,
      remarks: `Account not created (employee #${auditBody.employeeid ?? "?"})`,
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

// PUT — blank username/password keep the current ones
const editEmployeeUsers = async (req, res) => {
  const auditId = req.params?.id ?? null;
  let userBefore = null;

  try {
    const required = {
      access_id: "Access ID is required.",
      company_id: "Company ID is required.",
      warehouse_id: "Warehouse ID is required.",
    };

    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;
    const { access_id, company_id, warehouse_id, username, password, status } = req.body;

    if (await isSystemUser(id)) {
      return res.status(403).json(JsonWarningResponse("System accounts can't be edited here."));
    }

    const access = await getAccess(access_id);
    if (!access) {
      return res.status(404).json(JsonWarningResponse("Access role not found"));
    }
    if (isSystemAccess(access)) {
      return res.status(403).json(JsonWarningResponse("System roles can't be assigned here."));
    }

    const existingRows = await Check(
      SelectStatement(
        `SELECT meu_id, meu_fullname, meu_employee_id, meu_access_id, meu_company_id,
                meu_warehouse_id, meu_username, meu_password, meu_status
           FROM master_employee_users
          WHERE meu_id = ?`,
        [id],
      ),
    );

    if (existingRows.length === 0) {
      return res.status(404).json(JsonWarningResponse("User not found"));
    }

    const existing = existingRows[0];
    const employeeid = existing.meu_employee_id;
    const newStatus = status || STATUS_LOG.ACTIVE;

    // Audit before, without the credential columns
    const { meu_username: _u, meu_password: _p, ...beforeRow } = existing;
    userBefore = stripPrefix(beforeRow, "meu_");

    let decryptedOldUsername = "";
    try {
      decryptedOldUsername = existing.meu_username ? DecrypterString(existing.meu_username) : "";
    } catch (decryptionError) {
      console.error("Decryption failed for user:", id, decryptionError.message);
    }

    const newUsername = username || decryptedOldUsername;

    const conflict = await findAccountConflict({ employeeid, excludeId: id });
    if (conflict) {
      return res.status(409).json(JsonWarningResponse(conflict));
    }

    if (await isUsernameTaken(newUsername, id)) {
      return res.status(409).json(JsonWarningResponse("Username is already taken"));
    }

    const encryptedUsername = EncrypterString(newUsername);
    const encryptedPassword = password ? EncrypterString(password) : existing.meu_password;

    await TransactionWithConnection(async (connection) => {
      await connection.execute(
        `UPDATE master_employee_users
            SET meu_access_id = ?, meu_company_id = ?, meu_warehouse_id = ?,
                meu_username = ?, meu_password = ?, meu_status = ?
          WHERE meu_id = ?`,
        [access_id, company_id, warehouse_id, encryptedUsername, encryptedPassword, newStatus, id],
      );
    });

    // Credentials are never logged, only whether they changed
    const usernameChanged = !!username && username !== decryptedOldUsername;
    const passwordChanged = !!password;

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: AUDIT_ENTITY,
      entityId: id,
      referenceNo: String(employeeid),
      before: userBefore,
      after: {
        ...userBefore,
        access_id,
        company_id,
        warehouse_id,
        status: newStatus,
        username_changed: usernameChanged,
        password_changed: passwordChanged,
      },
      remarks: passwordChanged
        ? `Account updated, password changed (employee #${employeeid})`
        : `Account updated (employee #${employeeid})`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: auditId,
      referenceNo: userBefore?.employee_id != null ? String(userBefore.employee_id) : null,
      before: userBefore,
      error,
      remarks: `Account not updated (user #${auditId ?? "?"})`,
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

/* =======================
   EXCEL IMPORT
======================= */

// Finds the employee by id, or creates them under the company chosen for the import
const findOrCreateEmployeeFromExcelRow = async (row, companyId) => {
  const employeeId = row["EMPLOYEE ID"]?.toString().trim();
  const firstname = row["FIRST NAME"]?.toString().trim();
  const lastname = row["LAST NAME"]?.toString().trim();
  const email = row["EMAIL"]?.toString().trim();

  if (!employeeId || !firstname || !lastname || !email) {
    throw new Error("Missing required columns (EMPLOYEE ID, FIRST NAME, LAST NAME, or EMAIL).");
  }

  const existing = await Check(
    SelectStatement(
      `SELECT me_id, me_last_name, CONCAT(me_first_name, ' ', me_last_name) AS db_fullname
         FROM master_employee
        WHERE me_id = ?`,
      [employeeId],
    ),
  );

  if (existing.length > 0) {
    return {
      employeeId: existing[0].me_id,
      fullName: existing[0].db_fullname,
      lastName: existing[0].me_last_name,
      isNew: false,
    };
  }

  const emailUsed = await Check(SelectStatement(`SELECT me_id FROM master_employee WHERE me_email = ?`, [email]));
  if (emailUsed.length > 0) {
    throw new Error(`EMAIL "${email}" is already linked to a different Employee ID (${emailUsed[0].me_id}).`);
  }

  const insertMasterEmployee = InsertStatementTransCommit(
    Master.master_employee.tablename,
    Master.master_employee.prefix,
    Master.master_employee.insertColumns,
  );

  await TransactionWithReturn([
    {
      sql: insertMasterEmployee,
      values: [employeeId, companyId, firstname, lastname, email],
    },
  ]);

  return {
    employeeId,
    fullName: `${firstname} ${lastname}`,
    lastName: lastname,
    isNew: true,
  };
};

const importEmployeeUsersExcel = async (req, res) => {
  try {
    const requiredFields = {
      access_id: "Access ID is required.",
      company_id: "Company ID is required.",
      warehouse_id: "Warehouse ID is required.",
    };

    if (!validateOrLink(req, res, requiredFields)) return;

    const excelFile = req.file || (req.files && req.files.file);
    if (!excelFile) {
      return res.status(400).json(JsonWarningResponse("Please upload an Excel file."));
    }

    const fileBuffer = excelFile.buffer || excelFile.data;
    if (!fileBuffer) {
      return res.status(400).json(JsonWarningResponse("Failed to read file contents. Data buffer is empty."));
    }

    const { access_id, company_id, warehouse_id } = req.body;

    const access = await getAccess(access_id);
    if (!access) {
      return res.status(404).json(JsonWarningResponse("Access role not found"));
    }
    if (isSystemAccess(access)) {
      return res.status(403).json(JsonWarningResponse("System roles can't be assigned here."));
    }

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    if (sheetData.length === 0) {
      return res.status(400).json(JsonWarningResponse("The uploaded Excel sheet is empty."));
    }

    const create_date = GetCurrentDatetime();
    const status = STATUS_LOG.ACTIVE;
    const create_by = req.session.user.fullname;
    const insertSql = InsertStatementTransCommit(MEU.tablename, MEU.prefix, MEU.insertColumns);

    const summary = { successCount: 0, errors: [] };
    const importedAccounts = [];
    const newEmployees = [];

    for (let index = 0; index < sheetData.length; index++) {
      const row = sheetData[index];
      const rowNum = index + 2;

      let employeeInfo;
      try {
        employeeInfo = await findOrCreateEmployeeFromExcelRow(row, company_id);
      } catch (empError) {
        summary.errors.push(`Row ${rowNum}: ${empError.message}`);
        continue;
      }

      const { employeeId: me_id, fullName, lastName } = employeeInfo;
      if (employeeInfo.isNew) newEmployees.push({ id: me_id, fullname: fullName });

      const email = row["EMAIL"]?.toString().trim();
      const username = email; // the username is the email
      const plainPassword = `${lastName.trim().replace(/\s+/g, "")}${access_id}`;

      const conflict = await findAccountConflict({ employeeid: me_id });
      if (conflict) {
        summary.errors.push(`Row ${rowNum} (${username}): ${conflict}`);
        continue;
      }

      if (await isUsernameTaken(username)) {
        summary.errors.push(`Row ${rowNum} (${username}): Username is already taken.`);
        continue;
      }

      try {
        await TransactionWithReturn([
          {
            sql: insertSql,
            values: [
              fullName,
              access_id,
              me_id,
              company_id,
              warehouse_id,
              EncrypterString(username),
              EncrypterString(plainPassword),
              create_date,
              create_by,
              status,
            ],
          },
        ]);
      } catch (dbError) {
        console.error(`Row ${rowNum} insert failed:`, dbError);
        summary.errors.push(`Row ${rowNum} (${username}): DB insertion error.`);
        continue;
      }

      summary.successCount++;
      importedAccounts.push({ employee_id: me_id, fullname: fullName, username });

      try {
        SendEmail(
          email,
          "Your New Account Credentials",
          credentialsEmail(
            fullName,
            username,
            plainPassword,
            "An account has been created for you. Below are your login credentials:",
          ),
        );
      } catch (emailError) {
        console.error(`Failed to send credentials email for row ${rowNum}:`, emailError.message);
        summary.errors.push(`Row ${rowNum} (${username}): Account created, but the credentials email failed to send.`);
      }
    }

    // One audit entry for the whole import (passwords are never logged)
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "IMPORT",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: `IMPORT (${summary.successCount} accounts)`,
      before: null,
      after: {
        access_id,
        company_id,
        warehouse_id,
        rows_processed: sheetData.length,
        accounts_created: summary.successCount,
        error_count: summary.errors.length,
        accounts: importedAccounts,
        employees_created: newEmployees,
        errors: summary.errors,
      },
      remarks: `Accounts imported from Excel (${summary.successCount} of ${sheetData.length} rows, ${summary.errors.length} errors)`,
    });

    return res.json({
      status: "success",
      message: `Processed ${sheetData.length} records. Successfully imported: ${summary.successCount}. Errors: ${summary.errors.length}`,
      errors: summary.errors,
    });
  } catch (error) {
    console.error("Critical Import Crash:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "IMPORT",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: null,
      before: null,
      error,
      remarks: "Account import failed",
    });

    return res.status(500).json(JsonErrorResponse(error.message || error));
  }
};

/* =======================
   CREDENTIALS
======================= */

const sendEmployeeUserCredentials = async (req, res) => {
  const auditId = req.params?.id ?? null;
  let auditEmployeeId = null;

  try {
    const { id } = req.params;

    const rows = await Check(
      SelectStatement(
        `SELECT meu.meu_id, meu.meu_employee_id, meu.meu_fullname, meu.meu_username,
                me.me_email, ma.ma_is_system
           FROM master_employee_users meu
           LEFT JOIN master_employee me ON meu.meu_employee_id = me.me_id
           LEFT JOIN master_access ma ON ma.ma_id = meu.meu_access_id
          WHERE meu.meu_id = ?`,
        [id],
      ),
    );

    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("User not found"));
    }

    const user = rows[0];
    auditEmployeeId = user.meu_employee_id;

    if (Number(user.ma_is_system) === 1) {
      return res.status(403).json(JsonWarningResponse("System accounts can't be reset here."));
    }

    if (!user.me_email) {
      return res.status(400).json(JsonWarningResponse("Employee has no email on file — cannot send credentials"));
    }

    let decryptedUsername = user.me_email;
    try {
      if (user.meu_username) decryptedUsername = DecrypterString(user.meu_username);
    } catch (decryptionError) {
      console.error("Decryption failed for user:", id, decryptionError.message);
    }

    const newPlainPassword = generateRandomPassword(10);

    // Force a password change on next login
    await TransactionWithConnection(async (connection) => {
      await connection.execute(
        `UPDATE master_employee_users SET meu_password = ?, meu_is_update_password = 1 WHERE meu_id = ?`,
        [EncrypterString(newPlainPassword), id],
      );
    });

    // Logged once the password has actually changed, even if the email fails
    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD",
      entity: AUDIT_ENTITY,
      entityId: id,
      referenceNo: String(user.meu_employee_id),
      before: null,
      after: {
        employee_id: user.meu_employee_id,
        fullname: user.meu_fullname,
        force_password_change: true,
      },
      remarks: `Password reset and credentials sent (employee #${user.meu_employee_id})`,
    });

    try {
      SendEmail(
        user.me_email,
        "Your Account Credentials",
        credentialsEmail(
          user.meu_fullname,
          decryptedUsername,
          newPlainPassword,
          "Your account credentials have been reset. Below are your new login details:",
        ),
      );
    } catch (emailError) {
      console.error("Failed to send credentials email:", emailError.message);
      return res
        .status(500)
        .json(JsonErrorResponse("Password was updated, but the credentials email failed to send."));
    }

    return res.json(JsonDataResponse({ message: `Credentials sent to ${user.me_email}` }));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: auditId,
      referenceNo: auditEmployeeId != null ? String(auditEmployeeId) : null,
      before: null,
      error,
      remarks: `Password not reset (user #${auditId ?? "?"})`,
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

// Resets every ACTIVE non-system account
const resetAllEmployeeUserCredentials = async (req, res) => {
  try {
    const users = await Check(
      SelectStatement(
        `SELECT meu.meu_id, meu.meu_employee_id, meu.meu_fullname, meu.meu_username, me.me_email
           FROM master_employee_users meu
           LEFT JOIN master_employee me ON meu.meu_employee_id = me.me_id
           LEFT JOIN master_access ma ON ma.ma_id = meu.meu_access_id
          WHERE meu.meu_status = 'ACTIVE'
            AND COALESCE(ma.ma_is_system, 0) = 0`,
        [],
      ),
    );

    const results = { success: 0, skipped: 0, errors: [] };
    const resetUserIds = [];

    for (const user of users) {
      if (!user.me_email) {
        results.skipped++;
        results.errors.push(`${user.meu_fullname} (ID: ${user.meu_id}): no email on file — skipped.`);
        continue;
      }

      const newPlainPassword = generateRandomPassword(10);

      let decryptedUsername = user.me_email;
      try {
        if (user.meu_username) decryptedUsername = DecrypterString(user.meu_username);
      } catch {
        // fall back to the email
      }

      try {
        await Query(
          `UPDATE master_employee_users SET meu_password = ?, meu_is_update_password = 1 WHERE meu_id = ?`,
          [EncrypterString(newPlainPassword), user.meu_id],
        );
      } catch (dbError) {
        results.errors.push(`${user.meu_fullname} (ID: ${user.meu_id}): password update failed.`);
        continue;
      }

      resetUserIds.push(user.meu_id);

      try {
        SendEmail(
          user.me_email,
          "Your Account Credentials",
          credentialsEmail(
            user.meu_fullname,
            decryptedUsername,
            newPlainPassword,
            "Your account credentials have been reset. Below are your new login details:",
          ),
        );
        results.success++;
      } catch (emailError) {
        results.errors.push(`${user.meu_fullname} (ID: ${user.meu_id}): password reset, but email failed to send.`);
      }
    }

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD_ALL",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: `RESET ALL (${resetUserIds.length} accounts)`,
      before: null,
      after: {
        accounts_checked: users.length,
        passwords_reset: resetUserIds.length,
        emails_sent: results.success,
        skipped: results.skipped,
        error_count: results.errors.length,
        reset_user_ids: resetUserIds,
        errors: results.errors,
      },
      remarks: `Bulk password reset (${resetUserIds.length} of ${users.length} accounts, ${results.errors.length} errors)`,
    });

    return res.json(JsonDataResponse(results));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "RESET_PASSWORD_ALL",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: null,
      before: null,
      error,
      remarks: "Bulk password reset failed",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

module.exports = {
  loadEmployeeUsers,
  loadEmployeeUsersPaginated,
  getEmployeeUsers,
  addEmployeeUsers,
  editEmployeeUsers,
  importEmployeeUsersExcel,
  findOrCreateEmployeeFromExcelRow,
  sendEmployeeUserCredentials,
  resetAllEmployeeUserCredentials,
};