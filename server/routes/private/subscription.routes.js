const express = require("express");
const router = express.Router();

const {
  getSubscriptions,
  getSubscriptionById,
  getAccountSubscriptions,
  getSubscriptionHistory,
  addSubscription,
  changePlan,
  renewSubscription,
  extendSubscription,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscription,
} = require("../../controller/private/subscription.controller");

router.get("/load-subscription", getSubscriptions);
router.get("/get-subscription/:id", getSubscriptionById);
router.get("/load-account-subscription/:accountId", getAccountSubscriptions);
router.get("/load-subscription-history/:id", getSubscriptionHistory);
router.post("/add-subscription", addSubscription);
router.put("/change-plan/:id", changePlan);
router.put("/renew-subscription/:id", renewSubscription);
router.put("/extend-subscription/:id", extendSubscription);
router.put("/suspend-subscription/:id", suspendSubscription);
router.put("/reactivate-subscription/:id", reactivateSubscription);
router.put("/cancel-subscription/:id", cancelSubscription);

module.exports = router;