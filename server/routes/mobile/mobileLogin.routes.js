const express = require("express");
const router = express.Router();

const {
  loadMobileLogin,
  getMobileLogin,
  addMobileLogin,
  editMobileLogin,
  login,
  logout,
} = require("../../controller/mobile/mobileLogin.controller");
const verifyJWT = require("../../middleware/authenticator");


// GET
router.get("/load-mobile_login", verifyJWT, loadMobileLogin);
router.get("/get-mobile_login/:id", verifyJWT, getMobileLogin);
router.post("/add-mobile_login", verifyJWT, addMobileLogin);
router.put("/edit-mobile_login/:id", verifyJWT, editMobileLogin);

router.post("/login", login);
router.get("/logout", logout);

module.exports = router;
