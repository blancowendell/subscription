const express = require("express");
const router = express.Router();

const {
  loadMasterCompany,
  getMasterCompany,
  addMasterCompany,
  editMasterCompany
} = require("../../controller/private/masterCompany.controller");

// GET
router.get("/load-master_company", loadMasterCompany);
router.get("/get-master_company/:id", getMasterCompany);
router.post("/add-master_company", addMasterCompany);
router.put("/edit-master_company/:id", editMasterCompany);

module.exports = router;
