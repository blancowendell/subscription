const express = require("express");
const router = express.Router();

const {
  loadMasterBranch,
  getMasterBranch,
  addMasterBranch,
  editMasterBranch
} = require("../../controller/private/masterBranch.controller");

// GET
router.get("/load-master_branch", loadMasterBranch);
router.get("/get-master_branch/:id", getMasterBranch);
router.post("/add-master_branch", addMasterBranch);
router.put("/edit-master_branch/:id", editMasterBranch);

module.exports = router;
