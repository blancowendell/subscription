const express = require("express");
const router = express.Router();

const {
  loadMasterPageActions,
  getMasterPageActions,
  addMasterPageActions,
  editMasterPageActions
} = require("../../controller/private/masterPageActions.controller");

// GET
router.get("/load-master_page_actions", loadMasterPageActions);
router.get("/get-master_page_actions/:id", getMasterPageActions);
router.post("/add-master_page_actions", addMasterPageActions);
router.put("/edit-master_page_actions/:id", editMasterPageActions);

module.exports = router;
