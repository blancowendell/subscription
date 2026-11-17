const express = require("express");
const router = express.Router();

const {
  getPlans,
  getPlanById,
  addPlan,
  updatePlan,
} = require("../../controller/private/masterPlan.controller");

router.get("/load-plan", getPlans);
router.get("/get-plan/:id", getPlanById);
router.post("/add-plan", addPlan);
router.put("/update-plan/:id", updatePlan);

module.exports = router;