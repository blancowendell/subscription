const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  loadEmployeeUsers,
  loadEmployeeUsersPaginated,
  getEmployeeUsers,
  addEmployeeUsers,
  editEmployeeUsers,
  importEmployeeUsersExcel,
  sendEmployeeUserCredentials,
  resetAllEmployeeUserCredentials,
} = require("../../controller/private/masterEmployeeUsers.controller");

// Excel uploads are read from memory, never written to disk
const upload = multer({ storage: multer.memoryStorage() });

// GET
router.get("/load-master_employee_users", loadEmployeeUsers);
router.get("/load-master_employee_users_paginated", loadEmployeeUsersPaginated);
router.get("/get-master_employee_users/:id", getEmployeeUsers);

// POST / PUT
router.post("/add-master_employee_users", addEmployeeUsers);
router.put("/edit-master_employee_users/:id", editEmployeeUsers);
router.post("/import-master_employee_users_excel", upload.single("file"), importEmployeeUsersExcel);

// Credentials
router.post("/send-credentials/:id", sendEmployeeUserCredentials);
router.post("/reset-all-credentials", resetAllEmployeeUserCredentials);

module.exports = router;