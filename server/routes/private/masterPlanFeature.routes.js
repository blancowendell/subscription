const express = require("express");
const router = express.Router();

const {
  getPlanFeatures,
  savePlanFeatures,
} = require("../../controller/private/masterPlanFeature.controller");

router.get("/load-plan-feature/:planId", getPlanFeatures);
router.put("/save-plan-feature/:planId", savePlanFeatures);

module.exports = router;