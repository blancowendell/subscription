const express = require("express");
const router = express.Router();

const {
  getMyPermissions,
  loadMasterAccessRights,
  getMasterAccessRights,
  addMasterAccessRights,
  editMasterAccessRights,
} = require("../../controller/private/masterAccessRights.controller");
const { requireSystemRole } = require("../../services/permissions/permissionService");

// Any logged-in user
router.get("/my-permissions", getMyPermissions);

// Dev Tools only
router.get("/load-master_access_rights", requireSystemRole, loadMasterAccessRights);
router.get("/get-master_access_rights/:id", requireSystemRole, getMasterAccessRights);
router.post("/add-master_access_rights", requireSystemRole, addMasterAccessRights);
router.put("/edit-master_access_rights/:id", requireSystemRole, editMasterAccessRights);

module.exports = router;