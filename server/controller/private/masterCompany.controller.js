const { Master } = require("../../database/model/Master");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { STATUS_LOG } = require("../../services/repository/enum/enums");
const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonSuccess,
  JsonWarningResponse,
} = require("../../services/repository/response");
const {
  DataModeling,
  Select,
  SelectParameter,
  Check,
  TransactionWithReturn,
  SelectStatement,
  SelectAllStatement,
  InsertStatementTransCommit,
} = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const MC = Master.master_company;
const AUDIT_MODULE = "Master Company";
const STATUSES = [STATUS_LOG.ACTIVE, STATUS_LOG.INACTIVE];

// Current company for audit before/after
const loadCompanySnapshot = async (id) => {
  const rows = await Check(
    SelectStatement(`SELECT mc_id, mc_name, mc_address, mc_status FROM master_company WHERE mc_id = ?`, [id]),
  );
  const r = rows?.[0];
  return r ? { id: r.mc_id, name: r.mc_name, address: r.mc_address, status: r.mc_status } : null;
};

// Same name + address on another company
const isDuplicate = async (name, address, excludeId = null) => {
  const rows = await Check(
    SelectStatement(
      `SELECT 1 FROM master_company
        WHERE mc_name = ? AND mc_address = ? ${excludeId ? "AND mc_id <> ?" : ""}
        LIMIT 1`,
      excludeId ? [name, address, excludeId] : [name, address],
    ),
  );
  return rows.length > 0;
};

// GET
const loadMasterCompany = async (req, res) => {
  try {
    const sql = SelectAllStatement(MC.tablename, MC.selectColumns);

    Select(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }
      const rows = result || [];
      return res.json(JsonDataResponse(rows.length ? DataModeling(rows, MC.prefix_) : []));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

// GET BY ID
const getMasterCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `${SelectAllStatement(MC.tablename, MC.selectColumns)} WHERE mc_id = ?`;

    SelectParameter(sql, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }
      const rows = result || [];
      return res.json(JsonDataResponse(rows.length ? DataModeling(rows, MC.prefix_) : []));
    });
  } catch (error) {
    console.error(error);
    return res.json(JsonErrorResponse(error));
  }
};

// POST — { companyName, companyAddress }
const addMasterCompany = async (req, res) => {
  const companyName = String(req.body?.companyName || "").trim();
  const companyAddress = String(req.body?.companyAddress || "").trim();

  try {
    if (!companyName || !companyAddress) {
      return res.status(400).json(JsonWarningResponse("Company name and address are required."));
    }

    if (await isDuplicate(companyName, companyAddress)) {
      return res.status(409).json(JsonWarningResponse("A company with this name and address already exists."));
    }

    const create_date = GetCurrentDatetime();
    const create_by = req.session.user.fullname;
    const status = STATUS_LOG.ACTIVE;

    const sql = InsertStatementTransCommit(MC.tablename, MC.prefix, MC.insertColumns);
    const result = await TransactionWithReturn([
      { sql, values: [companyName, companyAddress, create_date, create_by, status] },
    ]);

    const newId = result?.insertId ?? result?.[0]?.insertId ?? null;

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: MC.tablename,
      entityId: newId,
      referenceNo: companyName,
      after: { name: companyName, address: companyAddress, status },
      remarks: `Company created: ${companyName}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: MC.tablename,
      referenceNo: companyName || null,
      after: { name: companyName || null, address: companyAddress || null },
      error,
      remarks: "Company not created",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

// PUT — { companyName, companyAddress, status }
const editMasterCompany = async (req, res) => {
  const { id } = req.params;
  const companyName = String(req.body?.companyName || "").trim();
  const companyAddress = String(req.body?.companyAddress || "").trim();
  const status = req.body?.status;
  let before = null;

  try {
    if (!companyName || !companyAddress || !status) {
      return res.status(400).json(JsonWarningResponse("Company name, address and status are required."));
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json(JsonWarningResponse("Unknown status."));
    }

    before = await loadCompanySnapshot(id);
    if (!before) {
      return res.status(404).json(JsonWarningResponse("Company not found."));
    }

    if (await isDuplicate(companyName, companyAddress, id)) {
      return res.status(409).json(JsonWarningResponse("A company with this name and address already exists."));
    }

    // Creation date and creator are kept as they are
    await TransactionWithReturn([
      {
        sql: `UPDATE master_company SET mc_name = ?, mc_address = ?, mc_status = ? WHERE mc_id = ?`,
        values: [companyName, companyAddress, status, id],
      },
    ]);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: MC.tablename,
      entityId: id,
      referenceNo: companyName,
      before,
      after: { ...before, name: companyName, address: companyAddress, status },
      remarks:
        before.status !== status
          ? `Company ${status === STATUS_LOG.ACTIVE ? "activated" : "deactivated"}: ${companyName}`
          : `Company updated: ${companyName}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: MC.tablename,
      entityId: id ?? null,
      referenceNo: before?.name ?? (companyName || null),
      before,
      error,
      remarks: "Company not updated",
    });

    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message));
  }
};

module.exports = {
  loadMasterCompany,
  getMasterCompany,
  addMasterCompany,
  editMasterCompany,
};