const express = require("express");
const router = express.Router();

const {
  getFeatures,
  getFeatureById,
  addFeature,
  updateFeature,
} = require("../../controller/private/masterFeature.controller");

router.get("/load-feature", getFeatures);
router.get("/get-feature/:id", getFeatureById);
router.post("/add-feature", addFeature);
router.put("/update-feature/:id", updateFeature);

module.exports = router;