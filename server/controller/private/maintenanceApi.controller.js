const {
  JsonErrorResponse,
  JsonDataResponse,
  MessageStatus,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { Maintenance } = require("../../database/model/Maintenance");
const {
  DataModeling,
  Select,
  SelectParameter,
  Insert,
  Update,
  Check,
  SelectStatement,
  SelectAllStatement,
  InsertStatement,
  UpdateStatement,
} = require("../../services/connections/sqlhelper");
const dashboardApiRouter = require("../../routes/private/dashboardApi.routes");
const { syncDataSources } = require("../../services/dashboard/syncDataSources");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Dashboard Data Sources";

const MA = Maintenance.maintenance_api;

// Current data source for audit before/after
const loadApiSnapshot = async (id) => {
  const rows = await Check(
    SelectStatement(
      `SELECT ma_id, ma_name, ma_api_name, ma_api_description, ma_status
         FROM maintenance_api
        WHERE ma_id = ?`,
      [id],
    ),
  );
  const r = rows?.[0];
  return r
    ? {
        id: r.ma_id,
        name: r.ma_name,
        api_url: r.ma_api_name,
        description: r.ma_api_description,
        status: r.ma_status,
      }
    : null;
};

const loadApiList = async (req, res) => {
  try {
    let sql = SelectAllStatement(MA.tablename, MA.selectColumns);

    Select(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result != 0) {
        let data = DataModeling(result, MA.prefix_);
        return res.json(JsonDataResponse(data));
      }
      return res.json(JsonDataResponse(result));
    });
  } catch (error) {
    console.log(error);
    return res.json(JsonErrorResponse(error));
  }
};

const addApi = async (req, res) => {
  const { name, apiUrl, description } = req.body || {};

  try {
    if (!name || !apiUrl || !description) {
      return res
        .status(400)
        .json(
          JsonWarningResponse(
            MessageStatus.REQUIRED + "Name, API URL, and Description are required."
          )
        );
    }

    let insert_data = [[name, apiUrl, description]];

    let insert_sql = InsertStatement(MA.tablename, MA.prefix, MA.insertColumns);

    let checkStatement = SelectStatement(
      "SELECT * FROM maintenance_api WHERE ma_api_name = ?",
      [apiUrl]
    );

    const exists = await Check(checkStatement);

    if (exists != 0) {
      return res.json(JsonWarningResponse(MessageStatus.EXIST));
    }

    Insert(insert_sql, insert_data, (err, result) => {
      if (err) {
        logAudit(req, {
          module: AUDIT_MODULE,
          action: "CREATE",
          status: "FAILED",
          entity: MA.tablename,
          referenceNo: name,
          after: { name, api_url: apiUrl, description },
          error: err,
          remarks: "Data source not created",
        });
        return res.status(500).json(JsonErrorResponse(err));
      }

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "CREATE",
        entity: MA.tablename,
        entityId: result?.insertId ?? null,
        referenceNo: name,
        after: { name, api_url: apiUrl, description },
        remarks: `Data source created: ${name}`,
      });

      return res.status(200).json(JsonSuccess());
    });
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: MA.tablename,
      referenceNo: name ?? null,
      error,
      remarks: "Data source not created",
    });

    return res.json(JsonErrorResponse(error));
  }
};

const getApi = async (req, res) => {
  try {
    const { id } = req.params;

    let sql =
      SelectAllStatement(MA.tablename, MA.selectColumns) + " WHERE ma_id = ?";

    SelectParameter(sql, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result != 0) {
        let data = DataModeling(result, MA.prefix_);
        return res.json(JsonDataResponse(data));
      }
      return res.json(JsonDataResponse(result));
    });
  } catch (error) {
    console.log(error);
    return res.json(JsonErrorResponse(error));
  }
};

const editApi = async (req, res) => {
  const { id, name, apiUrl, description, status } = req.body || {};
  let before = null;

  try {
    let update_data = [name, apiUrl, description, status, id];
    let update_sql = UpdateStatement(
      MA.tablename,
      MA.prefix,
      [
        MA.updateOptionColumns.name,
        MA.updateOptionColumns.api_name,
        MA.updateOptionColumns.api_description,
        MA.updateOptionColumns.status,
      ],
      [MA.updateOptionColumns.id]
    );

    let checkStatement = SelectStatement(
      "SELECT * FROM maintenance_api WHERE ma_id = ? AND ma_name = ? AND ma_api_description = ? AND ma_api_name = ? AND ma_status = ?",
      [id, name, description, apiUrl, status]
    );

    const unchanged = await Check(checkStatement);

    if (unchanged != 0) {
      return res.json(JsonWarningResponse(MessageStatus.EXIST));
    }

    before = await loadApiSnapshot(id);

    const after = {
      ...(before || { id }),
      name,
      api_url: apiUrl,
      description,
      status,
    };

    Update(update_sql, update_data, (err) => {
      if (err) {
        logAudit(req, {
          module: AUDIT_MODULE,
          action: "UPDATE",
          status: "FAILED",
          entity: MA.tablename,
          entityId: id,
          referenceNo: before?.name ?? name,
          before,
          after,
          error: err,
          remarks: "Data source not updated",
        });
        return res.status(500).json(JsonErrorResponse(err));
      }

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "UPDATE",
        entity: MA.tablename,
        entityId: id,
        referenceNo: name,
        before,
        after,
        remarks:
          before && before.status !== status
            ? `Data source ${String(status).toLowerCase()}: ${name}`
            : `Data source updated: ${name}`,
      });

      return res.status(200).json(JsonSuccess());
    });
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "UPDATE",
      status: "FAILED",
      entity: MA.tablename,
      entityId: id ?? null,
      referenceNo: before?.name ?? name ?? null,
      before,
      error,
      remarks: "Data source not updated",
    });

    return res.json(JsonErrorResponse(error));
  }
};

// POST — reads this system's dashboard_api routes and syncs them into maintenance_api
const syncApiList = async (req, res) => {
  try {
    const summary = await syncDataSources(dashboardApiRouter);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SYNC",
      entity: MA.tablename,
      after: summary,
      remarks: "Data sources synced",
    });

    return res.json(JsonDataResponse(summary));
  } catch (error) {
    console.error("Data source sync failed:", error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "SYNC",
      status: "FAILED",
      entity: MA.tablename,
      error,
      remarks: "Data source sync failed",
    });

    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = {
  loadApiList,
  addApi,
  getApi,
  editApi,
  syncApiList,
};