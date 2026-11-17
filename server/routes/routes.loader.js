const verifyJWT = require("../middleware/authenticator");

module.exports = (app) => {
//#region ROUTES MOBILE
    var mobileLoginRouter = require("./mobile/mobileLogin.routes");
//#endregion

//#region ROUTES USE MOBILE
    app.use("/mobile_login", mobileLoginRouter);
//#endregion

/* =======================
    MOBILE MIDDLEWARE
======================= */

//#region ROUTES PUBLIC
    var loginRouter = require("./public/login.routes");
    var userLoginRouter = require("./public/userLogin.routes");
//#endregion

//#region ROUTES USE PUBLIC
    app.use("/", loginRouter);
    app.use("/user_login", userLoginRouter);
//#endregion

/* =======================
    JWT MIDDLEWARE
======================= */
    app.use(verifyJWT);

//#region ROUTES PRIVATE
    var accessRouter = require("./private/access.routes");
    var accessTypeRouter = require("./private/accessType.routes");
    var masterEmployeeRouter = require("./private/masterEmployee.routes");
    var maintenanceSequenceRouter = require("./private/maintenanceSequence.routes");
    var maintenanceUsersRouter = require("./private/maintenanceUsers.routes");
    var dashboardApiRouter = require("./private/dashboardApi.routes");
    var maintenanceApiRouter = require("./private/maintenanceApi.routes");
    var dashboardRouter = require("./private/dashboard.routes"); 
    var maintenanceDashboardRouter = require("./private/maintenanceDashboard.routes");
    var securityRouter = require("./private/security.routes");
    var masterCompanyRouter = require("./private/masterCompany.routes");
    var masterEmployeeUsersRouter = require("./private/masterEmployeeUsers.routes");
    var masterWarehouseRouter = require("./private/masterWarehouse.routes");
    var masterBranchRouter = require("./private/masterBranch.routes");
    var masterPagesRouter = require("./private/masterPages.routes");
    var masterActionsRouter = require("./private/masterActions.routes");
    var masterPageActionsRouter = require("./private/masterPageActions.routes");
    var masterAccessRightsRouter = require("./private/masterAccessRights.routes");
    var auditLogsRouter = require("./private/auditLogs.routes");
    var maintenanceApiAccessRouter = require("./private/maintenanceApiAccess.routes");
    var systemSettingsRouter = require("./private/systemSettings.routes");
//#endregion

//#region ROUTES USE PRIVATE
    app.use("/access_type", accessTypeRouter);
    app.use("/access", accessRouter);
    app.use("/master_employee", masterEmployeeRouter);
    app.use("/maintenance_sequence", maintenanceSequenceRouter);
    app.use("/maintenance_users", maintenanceUsersRouter);
    app.use("/dashboard_api", dashboardApiRouter);
    app.use("/maintenance_api", maintenanceApiRouter);
    app.use("/dashboard", dashboardRouter);
    app.use("/maintenance_dashboard", maintenanceDashboardRouter);
    app.use("/security", securityRouter);
    app.use("/master_company", masterCompanyRouter);
    app.use("/master_employee_users", masterEmployeeUsersRouter);
    app.use("/master_warehouse", masterWarehouseRouter);
    app.use("/master_branch", masterBranchRouter);
    app.use("/master_pages", masterPagesRouter);
    app.use("/master_actions", masterActionsRouter);
    app.use("/master_page_actions", masterPageActionsRouter);
    app.use("/master_access_rights", masterAccessRightsRouter);
    app.use("/audit_logs", auditLogsRouter);
    app.use("/maintenance_api_access", maintenanceApiAccessRouter);
    app.use("/system_settings", systemSettingsRouter);
//#endregion
};
