const express = require("express");
const router = express.Router();

const {
  getClientAccounts,
  getClientAccountById,
  checkTenantCode,
  addClientAccount,
  updateClientAccount,
} = require("../../controller/private/clientAccount.controller");

router.get("/load-client-account", getClientAccounts);
router.get("/get-client-account/:id", getClientAccountById);
router.get("/check-tenant-code/:code", checkTenantCode);
router.post("/add-client-account", addClientAccount);
router.put("/update-client-account/:id", updateClientAccount);

module.exports = router;