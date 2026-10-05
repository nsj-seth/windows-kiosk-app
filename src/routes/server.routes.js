const express = require("express");
const { getServerStatus } = require("../controllers/server.controller");

const router = express.Router();

router.get("/status", getServerStatus);

module.exports = router;