const express = require("express");
const router = express.Router();

const {
  getClientUsers,
  getClientUserById,
  addClientUser,
  updateClientUser,
  resetClientUserPassword,
} = require("../../controller/private/clientUsers.controller");

router.get("/load-client-user/:accountId", getClientUsers);
router.get("/get-client-user/:id", getClientUserById);
router.post("/add-client-user", addClientUser);
router.put("/update-client-user/:id", updateClientUser);
router.put("/reset-client-user-password/:id", resetClientUserPassword);

module.exports = router;