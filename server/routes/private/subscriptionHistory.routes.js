const express = require("express");
const router = express.Router();

const {
  loadSubscriptionHistory,
  getSubscriptionHistory,
  addSubscriptionHistory,
  editSubscriptionHistory
} = require("../../controller/private/subscriptionHistory.controller");

// GET
router.get("/load-subscription_history", loadSubscriptionHistory);
router.get("/get-subscription_history/:id", getSubscriptionHistory);
router.post("/add-subscription_history", addSubscriptionHistory);
router.put("/edit-subscription_history/:id", editSubscriptionHistory);

module.exports = router;
