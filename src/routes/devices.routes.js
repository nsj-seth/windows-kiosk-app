const express = require("express");

const {
  registerDevice,
  getCurrentDevice
} = require("../controllers/devices.controller");

const authenticateDevice = require(
  "../middleware/deviceAuth.middleware"
);

const router = express.Router();

router.post("/register", registerDevice);

router.get(
  "/me",
  authenticateDevice,
  getCurrentDevice
);

module.exports = router;