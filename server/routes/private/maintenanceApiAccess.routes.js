const express = require("express");
const router = express.Router();

const { requireSystemRole } = require("../../services/dashboard/requireSystemRole");

const {
  loadMaintenanceApiAccess,
  getMaintenanceApiAccess,
  addMaintenanceApiAccess,
  editMaintenanceApiAccess,
} = require("../../controller/private/maintenanceApiAccess.controller");

// System roles only
router.use(requireSystemRole);

router.get("/load-maintenance_api_access", loadMaintenanceApiAccess);
router.get("/get-maintenance_api_access/:id", getMaintenanceApiAccess);
router.post("/add-maintenance_api_access", addMaintenanceApiAccess);
router.put("/edit-maintenance_api_access/:id", editMaintenanceApiAccess);

module.exports = router;