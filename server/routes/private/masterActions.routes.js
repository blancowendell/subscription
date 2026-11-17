const express = require("express");
const router = express.Router();

const {
  loadMasterActions,
  getMasterActions,
  addMasterActions,
  editMasterActions
} = require("../../controller/private/masterActions.controller");

// GET
router.get("/load-master_actions", loadMasterActions);
router.get("/get-master_actions/:id", getMasterActions);
router.post("/add-master_actions", addMasterActions);
router.put("/edit-master_actions/:id", editMasterActions);

module.exports = router;
