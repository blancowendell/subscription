const express = require("express");
const router = express.Router();

const {
  loadMasterPages,
  getMasterPages,
  addMasterPages,
  editMasterPages,
  syncMasterPages,
} = require("../../controller/private/masterPages.controller");

// GET
router.get("/load-master_pages", loadMasterPages);
router.get("/get-master_pages/:id", getMasterPages);

// POST / PUT
router.post("/add-master_pages", addMasterPages);
router.put("/edit-master_pages/:id", editMasterPages);

// Page registry sync (from frontend menus + pageMeta)
router.post("/sync-master_pages", syncMasterPages);

module.exports = router;