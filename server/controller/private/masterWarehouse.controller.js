const {
  JsonErrorResponse,
  JsonDataResponse,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { validateOrLink } = require("../../services/utility/validator");
const { GetCurrentDatetime } = require("../../services/repository/customhelper");
const { DataModeling, CheckParam, Query } = require("../../services/connections/sqlhelper");
const { Master } = require("../../database/model/Master");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const MW = Master.master_warehouse;

const AUDIT_MODULE = "Warehouse";
const AUDIT_ENTITY = MW.tablename;

const SELECT_SQL = `
  SELECT mw.mw_id, mw.mw_name, mw.mw_location, mw.mw_company_id, mw.mw_create_by,
         mw.mw_created_at, mw.mw_status, mc.mc_name AS mw_company_name
    FROM master_warehouse mw
    LEFT JOIN master_company mc ON mc.mc_id = mw.mw_company_id`;

const companyError = async (companyId) => {
  if (!companyId) return "Company is required.";
  const rows = await CheckParam(`SELECT mc_status FROM master_company WHERE mc_id = ?`, [companyId]);
  if (rows.length === 0) return "Company not found.";
  if (rows[0].mc_status !== "ACTIVE") return "This company is inactive.";
  return null;
};

// A name only has to be unique within its company
const nameTaken = async (name, companyId, excludeId = null) => {
  const rows = await CheckParam(
    `SELECT mw_id FROM master_warehouse
      WHERE LOWER(mw_name) = LOWER(?) AND mw_company_id = ? ${excludeId ? "AND mw_id <> ?" : ""}`,
    excludeId ? [name, companyId, excludeId] : [name, companyId],
  );
  return rows.length > 0;
};

// GET /load-master_warehouse
const loadMasterWarehouse = async (req, res) => {
  try {
    const rows = await CheckParam(`${SELECT_SQL} ORDER BY mc.mc_name, mw.mw_name`, []);
    return res.json(JsonDataResponse(rows.length ? DataModeling(rows, MW.prefix_) : []));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message || error));
  }
};

// GET /get-master_warehouse/:id
const getMasterWarehouse = async (req, res) => {
  try {
    const required = { id: "Warehouse ID is required." };
    if (!validateOrLink(req, res, required)) return;

    const rows = await CheckParam(`${SELECT_SQL} WHERE mw.mw_id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Warehouse not found."));
    }

    return res.json(JsonDataResponse(DataModeling(rows, MW.prefix_)));
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.message || error));
  }
};

// POST /add-master_warehouse — { warehouseName, warehouseAddress, companyId }
const addMasterWarehouse = async (req, res) => {
  try {
    const required = {
      warehouseName: "Warehouse name is required.",
      companyId: "Company is required.",
    };
    if (!validateOrLink(req, res, required)) return;

    const name = String(req.body.warehouseName).trim();
    const location = String(req.body.warehouseAddress || "").trim() || null;
    const { companyId } = req.body;

    const companyProblem = await companyError(companyId);
    if (companyProblem) {
      return res.status(400).json(JsonWarningResponse(companyProblem));
    }

    if (await nameTaken(name, companyId)) {
      return res.status(409).json(JsonWarningResponse("This company already has a warehouse with this name."));
    }

    const createBy = req.session?.user?.fullname || "system";

    const result = await Query(
      `INSERT INTO master_warehouse (mw_name, mw_location, mw_company_id, mw_create_by, mw_created_at, mw_status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [name, location, companyId, createBy, GetCurrentDatetime()],
    );

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      entity: AUDIT_ENTITY,
      entityId: result?.insertId ?? null,
      referenceNo: name,
      after: { name, location, company_id: companyId, status: "ACTIVE" },
      remarks: `Warehouse created: ${name}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message || error));
  }
};

// PUT /edit-master_warehouse/:id — { warehouseName, warehouseAddress, companyId, status }
const editMasterWarehouse = async (req, res) => {
  try {
    const required = {
      id: "Warehouse ID is required.",
      warehouseName: "Warehouse name is required.",
      companyId: "Company is required.",
    };
    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;
    const name = String(req.body.warehouseName).trim();
    const location = String(req.body.warehouseAddress || "").trim() || null;
    const { companyId } = req.body;
    const status = req.body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const rows = await CheckParam(`SELECT * FROM master_warehouse WHERE mw_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json(JsonWarningResponse("Warehouse not found."));
    }
    const before = rows[0];

    if (String(before.mw_company_id) !== String(companyId)) {
      const companyProblem = await companyError(companyId);
      if (companyProblem) {
        return res.status(400).json(JsonWarningResponse(companyProblem));
      }
    }

    if (await nameTaken(name, companyId, id)) {
      return res.status(409).json(JsonWarningResponse("This company already has a warehouse with this name."));
    }

    await Query(
      `UPDATE master_warehouse SET mw_name = ?, mw_location = ?, mw_company_id = ?, mw_status = ? WHERE mw_id = ?`,
      [name, location, companyId, status, id],
    );

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      entity: AUDIT_ENTITY,
      entityId: id,
      referenceNo: name,
      before: {
        name: before.mw_name,
        location: before.mw_location,
        company_id: before.mw_company_id,
        status: before.mw_status,
      },
      after: { name, location, company_id: companyId, status },
      remarks:
        before.mw_status !== status ? `Warehouse ${status.toLowerCase()}: ${name}` : `Warehouse updated: ${name}`,
    });

    return res.json(JsonSuccess());
  } catch (error) {
    console.error(error);
    return res.status(500).json(JsonErrorResponse(error.sqlMessage || error.message || error));
  }
};

module.exports = {
  loadMasterWarehouse,
  getMasterWarehouse,
  addMasterWarehouse,
  editMasterWarehouse,
};