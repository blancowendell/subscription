const express = require("express");
const router = express.Router();

const {
  loadAuditLogs,
  getAuditLogs,
  addAuditLogs,
  editAuditLogs
} = require("../../controller/private/auditLogs.controller");

// GET
router.get("/load-audit_logs", loadAuditLogs);
router.get("/get-audit_logs/:id", getAuditLogs);
router.post("/add-audit_logs", addAuditLogs);
router.put("/edit-audit_logs/:id", editAuditLogs);

module.exports = router;
