const { Master } = require("../../database/model/Master");
const { EncrypterString } = require("../../services/repository/cryptography");
const jwt = require("jsonwebtoken");
const {
  JsonErrorResponse,
  JsonSuccess,
  MessageStatus,
  JsonWarningResponse,
  JsonDataResponse,
} = require("../../services/repository/response");
const { validateOrLink } = require("../../services/utility/validator");
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

// GET
const loadMobileLogin = async (req, res) => {
  try {
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

// GET BY ID
const getMobileLogin = async (req, res) => {
  try {
    const required = {
      // id: "ID Number is required",
    };

    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;

    // Logic for getting a single record
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

// POST
const addMobileLogin = async (req, res) => {
  try {
    const required = {
      // name: "Name is required",
    };

    if (!validateOrLink(req, res, required)) return;

    // Proceed with creation...
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

// PUT
const editMobileLogin = async (req, res) => {
  try {
    const required = {
      // id: "ID Number is required",
    };

    if (!validateOrLink(req, res, required)) return;

    const { id } = req.params;

    // Proceed with update...
  } catch (error) {
    console.error(error);
    res.json(JsonErrorResponse(error));
  }
};

const login = async (req, res) => {
  try {
    const required = {
      username: "Username is required",
      password: "Password is required",
    };

    if (!validateOrLink(req, res, required)) return;

    const { username, password } = req.body;

    const encryptedUsername = EncrypterString(username);

    const select_sql = `
     SELECT
      mu_id,
      mu_employeeid,
      CONCAT(me_first_name,' ',me_last_name) as mu_fullname,
      mu_password,
      mu_access_id,
      ma_name as mu_role,
      mu_status
      FROM master_users
      INNER JOIN master_employee ON master_users.mu_employeeid = me_id
      INNER JOIN master_access ON master_users.mu_access_id = ma_id
      WHERE mu_username = ?
    `;

    SelectParameter(select_sql, [encryptedUsername], async (err, result) => {
      if (err) return res.status(500).json(JsonErrorResponse(err));

      if (result && result.length > 0) {
        const user = DataModeling(result, Master.master_users.prefix_)[0];

        const encryptedPassword = EncrypterString(password);

        if (user.password !== encryptedPassword) {
          return res
            .status(401)
            .json(JsonWarningResponse(MessageStatus.INCORRECT));
        }

        if (user.status !== "ACTIVE") {
          return res
            .status(403)
            .json(JsonWarningResponse(MessageStatus.INACTIVE));
        }

        const dashboardSql = SelectWhereStatement(
          "maintenance_dashboards",
          "md_id",
          ["md_user_id", "md_user_type"],
          [user.id, `'${user.role}'`],
        );

        Select(dashboardSql, (err, result) => {
          if (err) {
            console.error("Error fetching dashboard:", err);
            return res.status(500).json(JsonErrorResponse(err));
          }

          let dashboardId = result[0].md_id;

          const tokenPayload = {
            username: user.username,
            fullname: user.fullname,
          };

          const rawJwt = jwt.sign(
            JSON.stringify(tokenPayload),
            process.env._SECRET_KEY,
          );
          const encryptedJwt = EncrypterString(rawJwt, {});

          req.session.jwt = encryptedJwt;
          req.session.user = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            access_type: user.role,
            dashboard_id: dashboardId,
          };

          req.session.save((err) => {
            if (err)
              return res
                .status(500)
                .json(JsonErrorResponse("Failed to create session."));

            const { password, ...userWithoutPassword } = user;

            return res.status(200).json(
              JsonDataResponse({
                ...userWithoutPassword,
                id: user.id,
                fullname: user.fullname,
                username: user.username,
                access_type: user.role,
                dashboard_id: dashboardId,
                token: encryptedJwt,
              }),
            );
          });
        });
      } else {
        return res
          .status(401)
          .json(JsonWarningResponse(MessageStatus.INCORRECT));
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(JsonErrorResponse(error));
  }
};

const logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.status(500).json(JsonErrorResponse("Failed to logout."));
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({ msg: "Logged out successfully." });
  });
};

module.exports = {
  loadMobileLogin,
  getMobileLogin,
  addMobileLogin,
  editMobileLogin,

  login,
  logout,
};
