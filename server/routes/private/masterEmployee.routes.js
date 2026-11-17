const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  loadEmployees,
  loadEmployeesPaginated,
  addEmployee,
  getEmployee,
  updateEmployee,
  importEmployeeExcel,
} = require("../../controller/private/masterEmployee.controller");

// Excel uploads are read from memory, never written to disk
const upload = multer({ storage: multer.memoryStorage() });

// GET
router.get("/load-employees", loadEmployees);
router.get("/load-employees-paginated", loadEmployeesPaginated);
router.get("/get-employee/:employeeId", getEmployee);

// POST / PUT
router.post("/add-employee", addEmployee);
router.put("/update-employee/:employeeId", updateEmployee);
router.post("/import-employees-excel", upload.single("file"), importEmployeeExcel);

module.exports = router;