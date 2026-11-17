const { JsonErrorResponse } = require("../repository/response");
const { getRequestAccessId, isSystemAccess } = require("./apiAccess");

// Only system roles (Administrator) may manage data source access, whether they're
// logged in here or managing this system from SPARK_BOOKS. Runs after verifyJWT.
const requireSystemRole = async (req, res, next) => {
  try {
    const accessId = getRequestAccessId(req);
    if (!accessId) {
      return res.status(401).json(JsonErrorResponse("Your session has ended. Please log in again."));
    }
    if (!(await isSystemAccess(accessId))) {
      return res.status(403).json(JsonErrorResponse("Only administrators can manage data source access."));
    }
    return next();
  } catch (error) {
    console.error("System role check failed:", error);
    return res.status(500).json(JsonErrorResponse(error.message));
  }
};

module.exports = { requireSystemRole };