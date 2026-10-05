const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../config/database");


// Temporary playback tickets.
// These only live in server memory.
const playbackTickets = new Map();


// Ticket lasts for 5 minutes.
const PLAYBACK_TICKET_LIFETIME = 5 * 60 * 1000;


function getVideoById(req, res) {
  try {
    const videoId = Number(req.params.id);

    const video = db.prepare(`
      SELECT
        videos.id,
        videos.lesson_id,
        videos.title,
        videos.filename,
        videos.duration_seconds,
        videos.allow_offline,
        videos.created_at,
        lessons.title AS lesson_title
      FROM videos

      JOIN lessons
        ON lessons.id = videos.lesson_id

      WHERE videos.id = ?
    `).get(videoId);

    if (!video) {
      return res.status(404).json({
        error: "Video not found."
      });
    }

    res.status(200).json(video);

  } catch (error) {
    console.error(
      "Unable to retrieve video:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve video."
    });
  }
}


/*
 * Create a temporary ticket that the
 * browser video player can use.
 *
 * This endpoint is protected by the
 * normal device authentication middleware.
 */
function createPlaybackTicket(req, res) {
  try {
    const videoId = Number(req.params.id);

    const video = db.prepare(`
      SELECT id
      FROM videos
      WHERE id = ?
    `).get(videoId);

    if (!video) {
      return res.status(404).json({
        error: "Video not found."
      });
    }

    const ticket =
      crypto.randomBytes(32).toString("hex");

    const expiresAt =
      Date.now() +
      PLAYBACK_TICKET_LIFETIME;

    playbackTickets.set(
      ticket,
      {
        videoId,
        deviceId: req.device.id,
        expiresAt
      }
    );

    res.status(200).json({
      ticket,
      videoId,
      expiresInSeconds:
        PLAYBACK_TICKET_LIFETIME / 1000,

      streamUrl:
        `/api/videos/${videoId}/stream?ticket=${ticket}`
    });

  } catch (error) {
    console.error(
      "Unable to create playback ticket:",
      error
    );

    res.status(500).json({
      error:
        "Unable to create playback ticket."
    });
  }
}


function streamVideo(req, res) {
  try {
    const videoId =
      Number(req.params.id);

    const ticket =
      req.query.ticket;

    if (!ticket) {
      return res.status(401).json({
        error: "Playback ticket required."
      });
    }

    const ticketData =
      playbackTickets.get(ticket);

    if (!ticketData) {
      return res.status(401).json({
        error:
          "Invalid playback ticket."
      });
    }


    /*
     * Expired ticket.
     */
    if (
      Date.now() >
      ticketData.expiresAt
    ) {
      playbackTickets.delete(ticket);

      return res.status(401).json({
        error:
          "Playback ticket has expired."
      });
    }


    /*
     * Ticket belongs to another video.
     */
    if (
      ticketData.videoId !== videoId
    ) {
      return res.status(403).json({
        error:
          "Playback ticket is not valid for this video."
      });
    }


    const video = db.prepare(`
      SELECT *
      FROM videos
      WHERE id = ?
    `).get(videoId);

    if (!video) {
      return res.status(404).json({
        error: "Video not found."
      });
    }


    const videoPath =
      path.resolve(
        __dirname,
        "../../",
        video.storage_path
      );


    if (
      !fs.existsSync(videoPath)
    ) {
      return res.status(404).json({
        error:
          "Video file does not exist on the server."
      });
    }


    const fileSize =
      fs.statSync(videoPath).size;

    const range =
      req.headers.range;


    /*
     * Range request.
     *
     * This is what lets the video player
     * seek forwards and backwards.
     */
    if (range) {

      const match =
        range.match(
          /bytes=(\d*)-(\d*)/
        );

      if (!match) {
        return res
          .status(416)
          .send("Invalid Range");
      }

      const start =
        match[1]
          ? parseInt(
              match[1],
              10
            )
          : 0;

      const end =
        match[2]
          ? parseInt(
              match[2],
              10
            )
          : fileSize - 1;


      if (
        start >= fileSize ||
        end >= fileSize ||
        start > end
      ) {

        res.setHeader(
          "Content-Range",
          `bytes */${fileSize}`
        );

        return res
          .status(416)
          .end();
      }


      const chunkSize =
        end - start + 1;


      res.writeHead(
        206,
        {
          "Content-Range":
            `bytes ${start}-${end}/${fileSize}`,

          "Accept-Ranges":
            "bytes",

          "Content-Length":
            chunkSize,

          "Content-Type":
            "video/mp4",

          "Cache-Control":
            "no-store"
        }
      );


      const videoStream =
        fs.createReadStream(
          videoPath,
          {
            start,
            end
          }
        );


      videoStream.pipe(res);

      return;
    }


    /*
     * No Range header.
     */
    res.writeHead(
      200,
      {
        "Content-Length":
          fileSize,

        "Content-Type":
          "video/mp4",

        "Accept-Ranges":
          "bytes",

        "Cache-Control":
          "no-store"
      }
    );


    fs
      .createReadStream(videoPath)
      .pipe(res);


  } catch (error) {
    console.error(
      "Unable to stream video:",
      error
    );

    if (!res.headersSent) {

      res.status(500).json({
        error:
          "Unable to stream video."
      });
    }
  }
}


module.exports = {
  getVideoById,
  createPlaybackTicket,
  streamVideo
};