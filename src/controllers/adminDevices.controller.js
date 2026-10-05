const fs = require("fs");
const path = require("path");
const db = require("../config/database");


/* =========================================================
   DEVICES
========================================================= */

function getDevices(req, res) {
  try {
    const devices = db.prepare(`
      SELECT
        id,
        device_uuid,
        device_name,
        status,
        approved,
        registered_at,
        last_seen_at
      FROM devices
      ORDER BY registered_at DESC
    `).all();

    res.status(200).json(
      devices.map((device) => ({
        id: device.id,
        deviceId: device.device_uuid,
        deviceName: device.device_name,
        status: device.status,
        approved: Boolean(device.approved),
        registeredAt: device.registered_at,
        lastSeenAt: device.last_seen_at
      }))
    );

  } catch (error) {
    console.error(
      "Unable to retrieve devices:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve devices."
    });
  }
}


function approveDevice(req, res) {
  try {
    const deviceId =
      Number(req.params.id);

    const device = db.prepare(`
      SELECT
        id,
        device_name
      FROM devices
      WHERE id = ?
    `).get(deviceId);

    if (!device) {
      return res.status(404).json({
        error: "Device not found."
      });
    }

    db.prepare(`
      UPDATE devices
      SET
        approved = 1,
        status = 'active'
      WHERE id = ?
    `).run(deviceId);

    res.status(200).json({
      message: "Device approved.",
      id: device.id,
      deviceName: device.device_name
    });

  } catch (error) {
    console.error(
      "Unable to approve device:",
      error
    );

    res.status(500).json({
      error: "Unable to approve device."
    });
  }
}


function disableDevice(req, res) {
  try {
    const deviceId =
      Number(req.params.id);

    const result = db.prepare(`
      UPDATE devices
      SET status = 'disabled'
      WHERE id = ?
    `).run(deviceId);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Device not found."
      });
    }

    res.status(200).json({
      message: "Device disabled."
    });

  } catch (error) {
    console.error(
      "Unable to disable device:",
      error
    );

    res.status(500).json({
      error: "Unable to disable device."
    });
  }
}


/* =========================================================
   LESSONS
========================================================= */

function getLessons(req, res) {
  try {
    const lessons = db.prepare(`
      SELECT
        l.id AS lesson_id,
        l.title AS lesson_title,
        l.lesson_order,

        c.id AS course_id,
        c.title AS course_title,

        v.id AS video_id,
        v.title AS video_title,
        v.filename

      FROM lessons l

      JOIN courses c
        ON c.id = l.course_id

      LEFT JOIN videos v
        ON v.lesson_id = l.id

      ORDER BY
        c.id ASC,
        l.lesson_order ASC
    `).all();

    res.status(200).json(
      lessons.map((lesson) => ({
        id: lesson.lesson_id,
        title: lesson.lesson_title,
        lessonOrder:
          lesson.lesson_order,

        course: {
          id: lesson.course_id,
          title: lesson.course_title
        },

        video: lesson.video_id
          ? {
              id: lesson.video_id,
              title:
                lesson.video_title,
              filename:
                lesson.filename
            }
          : null
      }))
    );

  } catch (error) {
    console.error(
      "Unable to retrieve lessons:",
      error
    );

    res.status(500).json({
      error:
        "Unable to retrieve lessons."
    });
  }
}


/* =========================================================
   VIDEO UPLOAD
========================================================= */

function uploadLessonVideo(req, res) {
  try {
    const lessonId =
      Number(req.params.id);

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0
    ) {
      deleteUploadedFile(req.file);

      return res.status(400).json({
        error: "Invalid lesson ID."
      });
    }


    const lesson = db.prepare(`
      SELECT
        id,
        title
      FROM lessons
      WHERE id = ?
    `).get(lessonId);


    if (!lesson) {
      deleteUploadedFile(req.file);

      return res.status(404).json({
        error: "Lesson not found."
      });
    }


    if (!req.file) {
      return res.status(400).json({
        error:
          "An MP4 video file is required."
      });
    }


    /*
     * Check if this lesson already
     * has a video.
     */

    const oldVideos = db.prepare(`
      SELECT
        id,
        storage_path
      FROM videos
      WHERE lesson_id = ?
    `).all(lessonId);


    /*
     * Remove existing DB records.
     */

    db.prepare(`
      DELETE FROM videos
      WHERE lesson_id = ?
    `).run(lessonId);


    /*
     * Save new DB record.
     */

    const relativeStoragePath =
      `storage/videos/${req.file.filename}`;


    const result = db.prepare(`
      INSERT INTO videos (
        lesson_id,
        title,
        filename,
        storage_path,
        allow_offline
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      lessonId,
      lesson.title,
      req.file.filename,
      relativeStoragePath,
      1
    );


    /*
     * Delete old physical files
     * after the new record exists.
     */

    for (
      const oldVideo
      of oldVideos
    ) {
      deleteStoredVideo(
        oldVideo.storage_path,
        req.file.path
      );
    }


    res.status(201).json({
      message:
        oldVideos.length > 0
          ? "Video replaced successfully."
          : "Video uploaded successfully.",

      video: {
        id: Number(
          result.lastInsertRowid
        ),

        lessonId,

        title: lesson.title,

        filename:
          req.file.filename
      }
    });

  } catch (error) {
    console.error(
      "Unable to upload video:",
      error
    );

    deleteUploadedFile(
      req.file
    );

    res.status(500).json({
      error:
        "Unable to upload video."
    });
  }
}


/* =========================================================
   DELETE VIDEO
========================================================= */

function deleteLessonVideo(req, res) {
  try {
    const lessonId =
      Number(req.params.id);

    const videos = db.prepare(`
      SELECT
        id,
        storage_path
      FROM videos
      WHERE lesson_id = ?
    `).all(lessonId);


    if (videos.length === 0) {
      return res.status(404).json({
        error:
          "No video is attached to this lesson."
      });
    }


    db.prepare(`
      DELETE FROM videos
      WHERE lesson_id = ?
    `).run(lessonId);


    for (
      const video
      of videos
    ) {
      deleteStoredVideo(
        video.storage_path
      );
    }


    res.status(200).json({
      message:
        "Lesson video removed."
    });

  } catch (error) {
    console.error(
      "Unable to delete lesson video:",
      error
    );

    res.status(500).json({
      error:
        "Unable to delete lesson video."
    });
  }
}


/* =========================================================
   FILE HELPERS
========================================================= */

function deleteUploadedFile(file) {
  if (
    !file ||
    !file.path
  ) {
    return;
  }

  try {
    if (
      fs.existsSync(file.path)
    ) {
      fs.unlinkSync(file.path);
    }
  } catch (error) {
    console.error(
      "Unable to clean uploaded file:",
      error
    );
  }
}


function deleteStoredVideo(
  storagePath,
  newFilePath = null
) {
  if (!storagePath) {
    return;
  }

  try {
    const absolutePath =
      path.resolve(
        __dirname,
        "../../",
        storagePath
      );


    /*
     * Prevent accidentally deleting
     * the newly uploaded file.
     */

    if (
      newFilePath &&
      path.resolve(newFilePath) ===
        absolutePath
    ) {
      return;
    }


    if (
      fs.existsSync(
        absolutePath
      )
    ) {
      fs.unlinkSync(
        absolutePath
      );
    }

  } catch (error) {
    console.error(
      "Unable to delete old video:",
      error
    );
  }
}


module.exports = {
  getDevices,
  approveDevice,
  disableDevice,

  getLessons,
  uploadLessonVideo,
  deleteLessonVideo
};