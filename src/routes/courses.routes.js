const express = require("express");

const {
  getAllCourses,
  getCourseById
} = require("../controllers/courses.controller");

const authenticateDevice = require(
  "../middleware/deviceAuth.middleware"
);

const router = express.Router();

router.use(authenticateDevice);

router.get("/", getAllCourses);
router.get("/:id", getCourseById);

module.exports = router;