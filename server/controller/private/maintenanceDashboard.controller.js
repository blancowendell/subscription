const {
  JsonErrorResponse,
  JsonDataResponse,
  MessageStatus,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const {
  GetCurrentDatetime,
} = require("../../services/repository/customhelper");
const { STATUS_LOG } = require("../../services/repository/enum/enums");
const { Maintenance } = require("../../database/model/Maintenance");
const {
  DataModeling,
  RawData,
  Select,
  SelectAll,
  SelectParameter,
  Insert,
  InsertTable,
  Update,
  Check,
  CheckWithParams,
  InsertCheck,
  Query,
  Transaction,
  TransactionWithReturn,
  TransactionWithConnection,
  SelectStatement,
  SelectAllStatement,
  SelectWhereStatement,
  SelectWithJoinStatement,
  SelectWhereStatementWithFormatDate,
  SelectStatementWithArray,
  InsertStatement,
  InsertStatementTransCommit,
  UpdateStatement,
  UpdateStatementWithArrayDates,
  UpdateNoPrefixStatement
} = require("../../services/connections/sqlhelper");
const { logAudit } = require("../../services/utility/auditLogger"); // ADJUST PATH

const AUDIT_MODULE = "Dashboard Owner";

const loadDashboardOwner = async (req, res) => {
  try {
    let sql = `SELECT
        md_id,
        md_user_id,
        ma_name AS md_access_name,
        md_user_type,
        md_title,
        md_description,
        md_owner,
        md_created_at
    FROM maintenance_dashboards
    INNER JOIN master_users ON md_user_id = mu_id
    INNER JOIN master_access ON mu_access_id = ma_id`;

    Select(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        const data = DataModeling(result, "md_");
        return res.json(JsonDataResponse(data));
      }

      return res.json(JsonDataResponse([]));
    });
  } catch (error) {
    console.log(error);
    res.json(JsonErrorResponse(error));
  }
};

const loadDashboardOwnerByUser = async (req, res) => {
  try {
    let sql = `
    SELECT
    mu_id AS md_user_id,
    ma_name AS md_access_name,
    md_title,
    md_owner,
    md_description
    FROM maintenance_dashboards
    INNER JOIN master_users ON md_user_id = mu_id
    INNER JOIN master_access ON mu_access_id = ma_id`;

    Select(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        const data = DataModeling(result, "md_");
        return res.json(JsonDataResponse(data));
      }

      return res.json(JsonDataResponse([]));
    });
  } catch (error) {
    console.log(error);
    res.json(JsonErrorResponse(error));
  }
};

const addDashboardOwner = async (req, res) => {
  const { userId, userType, title, description, owner } = req.body || {};

  try {
    if (!userId || !userType || !title || !description || !owner) {
      return res
        .status(400)
        .json(
          JsonWarningResponse(
            MessageStatus.REQUIRED +
              "Name, Dashboard ID, and Description are required."
          )
        );
    }

    let insert_data = [[userId, userType, title, description, owner]];

    let insert_sql = InsertStatement(
      Maintenance.maintenance_dashboards.tablename,
      Maintenance.maintenance_dashboards.prefix,
      Maintenance.maintenance_dashboards.insertColumns
    );

    let checkStatement = SelectStatement(
      "SELECT * FROM maintenance_dashboards WHERE md_user_id = ? AND md_user_type = ?",
      [userId, userType]
    );

    const exists = await Check(checkStatement);

    if (exists != 0) {
      return res.json(JsonWarningResponse(MessageStatus.EXIST));
    }

    const after = {
      user_id: userId,
      user_type: userType,
      title,
      description,
      owner,
    };

    Insert(insert_sql, insert_data, (err, result) => {
      if (err) {
        logAudit(req, {
          module: AUDIT_MODULE,
          action: "CREATE",
          status: "FAILED",
          entity: Maintenance.maintenance_dashboards.tablename,
          referenceNo: title,
          after,
          error: err,
          remarks: "Dashboard not created",
        });
        return res.status(500).json(JsonErrorResponse(err));
      }

      logAudit(req, {
        module: AUDIT_MODULE,
        action: "CREATE",
        entity: Maintenance.maintenance_dashboards.tablename,
        entityId: result?.insertId ?? null,
        referenceNo: title,
        after,
        remarks: `Dashboard "${title}" created for user #${userId} (${userType})`,
      });

      return res.status(200).json(JsonSuccess());
    });
  } catch (error) {
    console.error(error);

    logAudit(req, {
      module: AUDIT_MODULE,
      action: "CREATE",
      status: "FAILED",
      entity: Maintenance.maintenance_dashboards.tablename,
      referenceNo: title ?? null,
      error,
      remarks: "Dashboard not created",
    });

    res.json(JsonErrorResponse(error));
  }
};

module.exports = {
  loadDashboardOwner,
  loadDashboardOwnerByUser,
  addDashboardOwner,
};