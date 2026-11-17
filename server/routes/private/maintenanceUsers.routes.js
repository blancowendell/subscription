const express = require("express");
const router = express.Router();

const {
  loadUsers,
  loadAccessOptions,
  getUsers,
  addUsers,
  editUsers,
} = require("../../controller/private/maintenanceUsers.controller"); // ADJUST to your controller file name

// GET
router.get("/load-maintenance-users", loadUsers);
router.get("/load-maintenance-users-access", loadAccessOptions);
router.get("/get-maintenance-users/:id", getUsers);

// POST / PUT
router.post("/add-maintenance-users", addUsers);
router.put("/edit-maintenance-users/:id", editUsers);

module.exports = router;