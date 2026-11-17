const express = require("express");
const router = express.Router();

const { requireClient } = require("../../controller/public/clientAuth.controller");
const {
  requireOwner,
  getPublicPlans,
  getMyAccount,
  updateMyAccount,
  getMySubscription,
  getMySubscriptionHistory,
  subscribe,
  changeTrialPlan,
  cancelPending,
  getMyUsers,
  inviteUser,
  updateMyUser,
} = require("../../controller/public/clientPortal.controller");

// Public (pricing page)
router.get("/plans", getPublicPlans);

// Any logged-in client user
router.get("/my-account", requireClient, getMyAccount);
router.get("/my-subscription", requireClient, getMySubscription);
router.get("/my-subscription-history", requireClient, getMySubscriptionHistory);

// Owner only
router.put("/update-account", requireClient, requireOwner, updateMyAccount);
router.post("/subscribe", requireClient, requireOwner, subscribe);
router.put("/change-trial-plan", requireClient, requireOwner, changeTrialPlan);
router.put("/cancel-pending", requireClient, requireOwner, cancelPending);
router.get("/users", requireClient, requireOwner, getMyUsers);
router.post("/invite-user", requireClient, requireOwner, inviteUser);
router.put("/update-user/:id", requireClient, requireOwner, updateMyUser);

module.exports = router;