const express = require("express");
const router = express.Router();

const {
  loadMasterWarehouse,
  getMasterWarehouse,
  addMasterWarehouse,
  editMasterWarehouse,
} = require("../../controller/private/masterWarehouse.controller");

router.get("/load-master_warehouse", loadMasterWarehouse);
router.get("/get-master_warehouse/:id", getMasterWarehouse);
router.post("/add-master_warehouse", addMasterWarehouse);
router.put("/edit-master_warehouse/:id", editMasterWarehouse);

module.exports = router;