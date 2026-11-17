const express = require("express");
const router = express.Router();

const {
  getProvisionJobs,
  getProvisionJobById,
  retryProvisionJob,
  cancelProvisionJob,
  queueProvisionJob,
  syncPlanSubscriptions,
  runDueJobs,
  runExpiryCheck,
} = require("../../controller/private/provisionJob.controller");

router.get("/load-provision-job", getProvisionJobs);
router.get("/get-provision-job/:id", getProvisionJobById);
router.put("/retry-provision-job/:id", retryProvisionJob);
router.put("/cancel-provision-job/:id", cancelProvisionJob);
router.post("/queue-provision-job", queueProvisionJob);
router.post("/sync-plan/:planId", syncPlanSubscriptions);
router.post("/run-due", runDueJobs);
router.post("/run-expiry", runExpiryCheck);

module.exports = router;