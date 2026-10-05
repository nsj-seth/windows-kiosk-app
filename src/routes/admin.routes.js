const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const authenticateAdmin = require(
  "../middleware/adminAuth.middleware"
);

const {
  getDevices,
  approveDevice,
  disableDevice,
  getLessons,
  uploadLessonVideo,
  deleteLessonVideo
} = require(
  "../controllers/adminDevices.controller"
);


const router = express.Router();


/* =========================================================
   VIDEO STORAGE
========================================================= */

const videoDirectory =
  path.resolve(
    __dirname,
    "../../storage/videos"
  );


if (
  !fs.existsSync(
    videoDirectory
  )
) {
  fs.mkdirSync(
    videoDirectory,
    {
      recursive: true
    }
  );
}


/* =========================================================
   MULTER CONFIGURATION
========================================================= */

const storage =
  multer.diskStorage({

    destination: function (
      req,
      file,
      callback
    ) {
      callback(
        null,
        videoDirectory
      );
    },


    filename: function (
      req,
      file,
      callback
    ) {
      const randomName =
        crypto.randomUUID();

      callback(
        null,
        `${randomName}.mp4`
      );
    }

  });


const upload =
  multer({

    storage,

    limits: {
      /*
       * Maximum video size:
       * 2 GB
       */
      fileSize:
        2 * 1024 * 1024 * 1024
    },

    fileFilter: function (
      req,
      file,
      callback
    ) {

      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();


      const isMp4 =
        extension === ".mp4" &&
        file.mimetype ===
          "video/mp4";


      if (!isMp4) {
        return callback(
          new Error(
            "Only MP4 video files are allowed."
          )
        );
      }


      callback(
        null,
        true
      );
    }

  });


/* =========================================================
   ADMIN AUTH
========================================================= */

router.use(
  authenticateAdmin
);


/* =========================================================
   DEVICE ROUTES
========================================================= */

router.get(
  "/devices",
  getDevices
);


router.post(
  "/devices/:id/approve",
  approveDevice
);


router.post(
  "/devices/:id/disable",
  disableDevice
);


/* =========================================================
   LESSON / VIDEO ROUTES
========================================================= */

router.get(
  "/lessons",
  getLessons
);


router.post(
  "/lessons/:id/video",
  upload.single("video"),
  uploadLessonVideo
);


router.delete(
  "/lessons/:id/video",
  deleteLessonVideo
);


/* =========================================================
   UPLOAD ERROR HANDLER
========================================================= */

router.use(
  function (
    error,
    req,
    res,
    next
  ) {

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(413)
          .json({
            error:
              "Video is too large."
          });
      }


      return res
        .status(400)
        .json({
          error:
            error.message
        });
    }


    if (error) {
      return res
        .status(400)
        .json({
          error:
            error.message ||
            "Upload failed."
        });
    }


    next();
  }
);


module.exports =
  router;