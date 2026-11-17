const { JsonErrorResponse } = require("../repository/response");
const { getRequestAccessId, canUseDataSource } = require("./apiAccess");

// Guards every /dashboard_api/<apiName> route: the caller's role must be allowed
// to use <apiName> in maintenance_api_access. Runs after verifyJWT.
const requireDataSourceAccess = async (req, res, next) => {
  try {
    const apiName = String(req.path || "").replace(/^\/+/, "").split("/")[0];
    if (!apiName) return next();

    const accessId = getRequestAccessId(req);
    if (!accessId) {
      return res.status(401).json(JsonErrorResponse("Your session has ended. Please log in again."));
    }

    if (!(await canUseDataSource(accessId, apiName))) {
      return res.status(403).json(JsonErrorResponse("You don't have access to this information."));
    }

    return next();
  } catch (error) {
    console.error("Data source access check failed:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = { requireDataSourceAccess };