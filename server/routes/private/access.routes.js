const express = require("express");
const router = express.Router();

const {
  getAccess,
  getAccessById,
  addAccess,
  updateAccess,
} = require("../../controller/private/access.controller");

router.get("/load-access", getAccess);
router.get("/get-access/:id", getAccessById);
router.post("/add-access", addAccess);
router.put("/update-access/:id", updateAccess);

module.exports = router;