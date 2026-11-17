const express = require("express");
const router = express.Router();

const {
  loadSequence,
  loadListSequence,
  getSequence,
  addSequence,
  editSequence,
} = require("../../controller/private/maintenanceSequence.controller");

router.get("/load-sequence", loadSequence);
router.get("/load-list-sequence", loadListSequence);
router.get("/get-sequence/:id", getSequence);
router.post("/add-sequence", addSequence);
router.put("/edit-sequence/:id", editSequence);

module.exports = router;