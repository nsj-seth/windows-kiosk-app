const express = require("express");

const {
  getVideoById,
  createPlaybackTicket,
  streamVideo
} = require(
  "../controllers/videos.controller"
);

const authenticateDevice = require(
  "../middleware/deviceAuth.middleware"
);

const router = express.Router();


// Video information requires
// an approved device.
router.get(
  "/:id",
  authenticateDevice,
  getVideoById
);


// Generate temporary playback URL.
router.post(
  "/:id/playback-ticket",
  authenticateDevice,
  createPlaybackTicket
);


// The video element accesses this
// using the temporary ticket.
router.get(
  "/:id/stream",
  streamVideo
);


module.exports = router;