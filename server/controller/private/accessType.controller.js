const {
  JsonErrorResponse,
  JsonDataResponse,
  MessageStatus,
  JsonWarningResponse,
  JsonSuccess,
} = require("../../services/repository/response");
const { Master } = require("../../database/model/Master");
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

const getAccessType = async (req, res) => {
  try {
    const { accessId } = req.params;

    const sql = SelectWithJoinStatement(
      Master.master_access_types.tablename,
      Master.master_access_types.selectColumns,
      {},
      [Master.master_access.selectOptionColumns.name],
      [
        {
          type: "LEFT",
          table: Master.master_access.tablename,
          on:
            Master.master_access_types.selectOptionColumns.access_id +
            " = " +
            Master.master_access.selectOptionColumns.id,
        },
      ],
      `ma_id = ?`
    );

    SelectParameter(sql, [accessId], (err, result) => {
      if (err) {
        console.error(err);
        return res.json(JsonErrorResponse(err));
      }

      if (result && result.length > 0) {
        const data = DataModeling(
          result,
          Master.master_access_types.prefix_
        ).map((item) => ({
          ...item,
          status:
            item.status === 1 || item.status === "1" ? "ACTIVE" : "INACTIVE",
        }));

        return res.json(JsonDataResponse(data));
      } else {
        return res.json(JsonDataResponse([]));
      }
    });
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

const updateAccessType = async (req, res) => {
  try {
    const { accessTypeId } = req.params;
    let createBy = req.session.user.fullname;
    let typeStatus = req.body.typeStatus;

    let booleanStatus = typeStatus === "ACTIVE" ? true : false;

    if (!typeStatus || !accessTypeId) {
      return res
        .status(400)
        .json(
          JsonWarningResponse(
            MessageStatus.REQUIRED + "Access Type, Status are required."
          )
        );
    }

    let updateSql = UpdateStatement(
      Master.master_access_types.tablename,
      Master.master_access_types.prefix,
      [
        Master.master_access_types.updateOptionColumns.status,
        Master.master_access_types.updateOptionColumns.create_by,
      ],
      [Master.master_access_types.updateOptionColumns.id]
    );

    let updateSqlData = [booleanStatus, createBy, accessTypeId];

    Update(updateSql, updateSqlData, (err, result) => {
      if (err) {
        res.status(500).json(JsonErrorResponse(err));
      }
      res.status(200).json(JsonSuccess());
    });
  } catch (error) {
    console.log(error);
    res.json(JsonErrorResponse(error));
  }
};

module.exports = {
  getAccessType,
  updateAccessType,
};