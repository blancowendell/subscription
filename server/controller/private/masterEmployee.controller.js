const {
  JsonErrorResponse,
  JsonDataResponse,
  MessageStatus,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { Master } = require("../../database/model/Master");
const { validateOrLink } = require("../../services/utility/validator");
const { nextSequence, reserveSequence } = require("../../services/repository/sequence");
const ExcelJS = require("exceljs");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH
const {
  DataModeling,
  SelectParameter,
  Check,
  CheckParam,
  Transaction,
  TransactionWithReturn,
  SelectStatement,
  InsertStatementTransCommit,
  UpdateStatement,
} = require("../../services/connections/sqlhelper");
const {
  getPaginationParams,
  buildSearchQuery,
  buildPaginatedResponse,
} = require("../../services/utility/pagination_helper");

/* =======================
   AUDIT
======================= */

const AUDIT_MODULE = "Employee";
const AUDIT_ENTITY = Master.master_employee.tablename;

// Row without the table prefix
const stripPrefix = (row, prefix) =>
  row
    ? Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k.startsWith(prefix) ? k.slice(prefix.length) : k,
          v,
        ]),
      )
    : null;

// insertColumns order: id, company_id, first_name, last_name, email
const employeeInsertValues = (id, companyId, firstname, lastname, email) => [
  id,
  companyId ?? null,
  firstname,
  lastname,
  email,
];

// Employees must belong to an active company
const companyError = async (companyId) => {
  if (!companyId) return "Company is required.";
  const rows = await Check(
    SelectStatement(`SELECT mc_status FROM master_company WHERE mc_id = ?`, [companyId]),
  );
  if (rows.length === 0) return "Company not found.";
  if (rows[0].mc_status !== "ACTIVE") return "This company is inactive.";
  return null;
};

/* =======================
   LOADERS
======================= */

const loadEmployees = async (req, res) => {
  try {
    const sql = `SELECT
        me_id,
        me_company_id,
        me_first_name,
        me_last_name,
        me_email,
        CONCAT(me_first_name, ' ', me_last_name) AS me_fullname
      FROM master_employee
      ORDER BY me_last_name, me_first_name`;

    SelectParameter(sql, [], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        return res.json(JsonDataResponse(DataModeling(result, "me_")));
      }

      return res.json(JsonDataResponse([]));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

const loadEmployeesPaginated = async (req, res) => {
  try {
    const { page, limit, offset, search } = getPaginationParams(req);

    const columnsToSearch = ["me_first_name", "me_last_name", "me_id"];
    const { searchClause, searchParams } = buildSearchQuery(search, columnsToSearch);

    const me_table = Master.master_employee.tablename;
    const me_id = Master.master_employee.selectOptionColumns.id;
    const me_cols = Master.master_employee.selectColumns.join(", ");

    const whereClause = search ? `WHERE 1=1 ${searchClause}` : "WHERE 1=1";
    const countParams = search ? searchParams : [];

    const countSql = `SELECT COUNT(${me_id}) as totalCount FROM ${me_table} ${whereClause}`;

    SelectParameter(countSql, countParams, (countErr, countResult) => {
      if (countErr) {
        console.error("Count DB Error:", countErr);
        return res.json(JsonErrorResponse(countErr));
      }

      const totalItems = countResult[0].totalCount;

      const mainSql = `
        SELECT ${me_cols}
        FROM (
          SELECT ${me_id} as paginated_id
          FROM ${me_table} ${whereClause}
          ORDER BY ${me_id} DESC
          LIMIT ? OFFSET ?
        ) AS paginated
        INNER JOIN ${me_table} ON paginated.paginated_id = ${me_id}
      `;

      SelectParameter(mainSql, [...countParams, limit, offset], (err, result) => {
        if (err) {
          console.error("Main DB Error:", err);
          return res.json(JsonErrorResponse(err));
        }

        if (result && result.length !== 0) {
          const modeledData = DataModeling(result, Master.master_employee.prefix_);
          return res.json(buildPaginatedResponse(modeledData, totalItems, page, limit));
        }

        return res.json(buildPaginatedResponse([], 0, page, limit));
      });
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

/* =======================
   ADD
======================= */

const addEmployee = async (req, res) => {
  // Captured outside the try so the catch block can use them for the audit log
  const auditBody = req.body || {};
  let auditEmployeeId = null;

  try {
    const required = {
      firstname: "First Name is required.",
      lastname: "Last Name is required.",
      email: "Email is required.",
      sequenceId: "Sequence ID is required.",
      companyId: "Company is required.",
    };

    if (!validateOrLink(req, res, required)) return;
    const { firstname, lastname, email, sequenceId, companyId } = req.body;

    const companyProblem = await companyError(companyId);
    if (companyProblem) {
      return res.status(400).json(JsonWarningResponse(companyProblem));
    }

    const emailResult = await Check(
      SelectStatement("SELECT me_id FROM master_employee WHERE me_email = ?", [email]),
    );
    if (emailResult.length > 0) {
      return res.status(400).json(JsonWarningResponse("Email already exists."));
    }

    // Issued by the sequence service; the row is locked, so concurrent adds never collide
    const employeeId = await nextSequence({ id: sequenceId });
    auditEmployeeId = employeeId;

    const insertMasterEmployee = InsertStatementTransCommit(
      Master.master_employee.tablename,
      Master.master_employee.prefix,
      Master.master_employee.insertColumns,
    );

    await TransactionWithReturn([
      {
        sql: insertMasterEmployee,
        values: employeeInsertValues(employeeId, companyId, firstname, lastname, email),
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: AUDIT_ENTITY,
      entityId: employeeId,
      referenceNo: String(employeeId),
      before: null,
      after: {
        id: employeeId,
        company_id: companyId,
        first_name: firstname,
        last_name: lastname,
        email,
      },
      remarks: `Employee created (${employeeId})`,
    });

    return res.status(200).json(
      JsonDataResponse({
        message: "Employee added successfully.",
        employeeId,
      }),
    );
  } catch (error) {
    console.error("Error in addEmployee controller:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: auditEmployeeId,
      referenceNo: auditEmployeeId != null ? String(auditEmployeeId) : null,
      before: null,
      error,
      remarks: `Employee not created (${auditBody.email ?? "?"})`,
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message || error));
  }
};

/* =======================
   GET
======================= */

const getEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const sql = `SELECT
        me_id,
        me_company_id,
        me_first_name,
        me_last_name,
        me_email
      FROM master_employee
      WHERE me_id = ?`;

    SelectParameter(sql, [employeeId], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        return res.json(JsonDataResponse(DataModeling(result, Master.master_employee.prefix_)));
      }

      return res.json(JsonDataResponse([]));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

/* =======================
   UPDATE
======================= */

const updateEmployee = async (req, res) => {
  // Captured outside the try so the catch block can use them for the audit log
  const auditEmployeeId = req.params?.employeeId ?? null;
  let employeeBefore = null;

  try {
    const { employeeId } = req.params;
    const { firstname, lastname, email, status } = req.body;

    if (!firstname || !lastname) {
      return res
        .status(400)
        .json(JsonWarningResponse(MessageStatus.REQUIRED + "First Name and Last Name are required."));
    }

    if (email) {
      const emailTaken = await CheckParam(
        `SELECT me_id FROM master_employee WHERE me_email = ? AND me_id != ?`,
        [email, employeeId],
      );
      if (emailTaken.length > 0) {
        return res
          .status(400)
          .json(JsonWarningResponse(`Email is already used by employee ${emailTaken[0].me_id}.`));
      }
    }

    const fullName = `${firstname} ${lastname}`.trim();

    const hasStatus = status !== undefined && status !== null && status !== "";
    const accStatus = hasStatus
      ? status === true || String(status).toUpperCase() === "ACTIVE"
        ? "ACTIVE"
        : "INACTIVE"
      : null;

    const beforeRows = await Check(
      SelectStatement("SELECT * FROM master_employee WHERE me_id = ?", [employeeId]),
    );
    employeeBefore = beforeRows && beforeRows.length > 0 ? stripPrefix(beforeRows[0], "me_") : null;

    if (!employeeBefore) {
      return res.status(404).json(JsonWarningResponse("Employee not found."));
    }

    const queries = [
      {
        sql: UpdateStatement(
          Master.master_employee.tablename,
          Master.master_employee.prefix,
          [
            Master.master_employee.updateOptionColumns.first_name,
            Master.master_employee.updateOptionColumns.last_name,
            Master.master_employee.updateOptionColumns.email,
          ],
          [Master.master_employee.updateOptionColumns.id],
        ),
        values: [firstname, lastname, email, employeeId],
      },
      {
        sql: `UPDATE master_employee_users SET meu_fullname = ? WHERE meu_employee_id = ?`,
        values: [fullName, employeeId],
      },
    ];

    if (accStatus) {
      // Accounts on system roles are never deactivated from here
      queries.push({
        sql: `UPDATE master_employee_users meu
                LEFT JOIN master_access ma ON ma.ma_id = meu.meu_access_id
                 SET meu.meu_status = ?
               WHERE meu.meu_employee_id = ?
                 AND COALESCE(ma.ma_is_system, 0) = 0`,
        values: [accStatus, employeeId],
      });
    }

    await Transaction(queries);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: AUDIT_ENTITY,
      entityId: employeeId,
      referenceNo: String(employeeId),
      before: employeeBefore,
      after: {
        ...employeeBefore,
        first_name: firstname,
        last_name: lastname,
        email,
        ...(accStatus ? { account_status: accStatus } : {}),
      },
      remarks: accStatus
        ? `Employee updated, linked accounts set to ${accStatus} (${employeeId})`
        : `Employee updated (${employeeId})`,
    });

    return res.status(200).json(JsonSuccess("Employee updated successfully"));
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: auditEmployeeId,
      referenceNo: auditEmployeeId != null ? String(auditEmployeeId) : null,
      before: employeeBefore,
      error,
      remarks: `Employee not updated (${auditEmployeeId ?? "?"})`,
    });

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        status: "error",
        msg: "exist",
        message: "Email already exists. Please use another one.",
      });
    }

    return res.status(500).json(JsonErrorResponse("Something went wrong while updating employee."));
  }
};

/* =======================
   EXCEL IMPORT
======================= */

const cellText = (cell) =>
  (typeof cell === "object" && cell !== null ? cell.text || cell.result : cell)?.toString().trim();

const importEmployeeExcel = async (req, res) => {
  try {
    const { sequenceId, companyId } = req.body;

    if (!sequenceId) {
      return res.status(400).json(JsonWarningResponse("Sequence ID is required for generation."));
    }

    const companyProblem = await companyError(companyId);
    if (companyProblem) {
      return res.status(400).json(JsonWarningResponse(companyProblem));
    }

    if (!req.file) {
      return res.status(400).json(JsonWarningResponse("No Excel file uploaded."));
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const warnings = [];
    const validRowsData = [];
    const uniqueEmailsInFile = new Set();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const firstname = cellText(row.getCell(1).value);
      const lastname = cellText(row.getCell(2).value);
      const email = cellText(row.getCell(3).value);

      if (!firstname || !lastname || !email) {
        warnings.push({
          row: rowNumber,
          level: "warning",
          message: "Incomplete row data. First Name, Last Name, and Email are all required.",
        });
        return;
      }
      if (uniqueEmailsInFile.has(email.toLowerCase())) {
        warnings.push({
          row: rowNumber,
          level: "warning",
          message: `Duplicate Email found inside this spreadsheet: "${email}".`,
        });
        return;
      }
      uniqueEmailsInFile.add(email.toLowerCase());

      validRowsData.push({ rowNumber, firstname, lastname, email });
    });

    if (warnings.length > 0) {
      return res.status(409).json(warnings);
    }

    if (validRowsData.length === 0) {
      return res
        .status(400)
        .json(JsonWarningResponse("The uploaded Excel sheet contains no valid data rows."));
    }

    for (const record of validRowsData) {
      const emailResult = await Check(
        SelectStatement("SELECT me_id FROM master_employee WHERE me_email = ?", [record.email]),
      );
      if (emailResult.length > 0) {
        warnings.push({
          row: record.rowNumber,
          level: "warning",
          message: `Email already exists: "${record.email}"`,
        });
      }
    }

    if (warnings.length > 0) {
      return res.status(409).json(warnings);
    }

    // One locked call reserves an id for every row, only after all validation passed
    const ids = await reserveSequence({ id: sequenceId, count: validRowsData.length });

    const insertMasterEmployee = InsertStatementTransCommit(
      Master.master_employee.tablename,
      Master.master_employee.prefix,
      Master.master_employee.insertColumns,
    );

    const imported = validRowsData.map((record, i) => ({ ...record, id: ids[i] }));

    await TransactionWithReturn(
      imported.map((r) => ({
        sql: insertMasterEmployee,
        values: employeeInsertValues(r.id, companyId, r.firstname, r.lastname, r.email),
      })),
    );

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "IMPORT",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: `IMPORT (${imported.length} employees)`,
      before: null,
      after: {
        imported_count: imported.length,
        company_id: companyId,
        employees: imported.map((r) => ({
          id: r.id,
          first_name: r.firstname,
          last_name: r.lastname,
          email: r.email,
        })),
      },
      remarks: `Employees imported from Excel (${imported.length})`,
    });

    return res.status(200).json(
      JsonDataResponse({
        message: `Successfully imported ${imported.length} employees.`,
        importedCount: imported.length,
      }),
    );
  } catch (error) {
    console.error("Error in importEmployeeExcel controller:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "IMPORT",
      status: "FAILED",
      entity: AUDIT_ENTITY,
      entityId: null,
      referenceNo: null,
      before: null,
      error,
      remarks: "Employee import failed",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message || error));
  }
};

module.exports = {
  loadEmployees,
  loadEmployeesPaginated,
  addEmployee,
  getEmployee,
  updateEmployee,
  importEmployeeExcel,
};