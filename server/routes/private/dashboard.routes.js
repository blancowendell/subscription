const express = require("express");
const router = express.Router();

// import controller functions
const {
  listDashboards,
  createDashboard,
  deleteDashboard,
  loadLayout,
  saveLayout,
  loadDataSources,
} = require("../../controller/private/dashboard.controller");


router.get("/list", listDashboards);
router.post("/create", createDashboard);
router.get("/load-layout", loadLayout);
router.post("/save-layout", saveLayout);
router.get("/data-sources", loadDataSources);
router.delete("/:id", deleteDashboard);

module.exports = router;