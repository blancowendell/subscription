const express = require("express");
const router = express.Router();

const {
  loadSystemSettings,
  getSystemSettings,
  addSystemSettings,
  editSystemSettings,
} = require("../../controller/private/systemSettings.controller");

router.get("/load-system_settings", loadSystemSettings);
router.get("/get-system_settings/:id", getSystemSettings);
router.post("/add-system_settings", addSystemSettings);
router.put("/edit-system_settings/:id", editSystemSettings);

module.exports = router;