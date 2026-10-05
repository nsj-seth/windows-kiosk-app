const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const databasePath = path.join(
  __dirname,
  "../../database/lab-content.db"
);

const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS server_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    server_name TEXT NOT NULL,
    school_name TEXT,
    location TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_uuid TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    token_hash TEXT,
    approved INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'disabled')),
    registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    lesson_order INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id)
      REFERENCES courses(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    duration_seconds INTEGER,
    allow_offline INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lesson_id)
      REFERENCES lessons(id)
      ON DELETE CASCADE
  );
`);

// Handle databases created before token_hash / approved existed.
const deviceColumns = db
  .prepare("PRAGMA table_info(devices)")
  .all();

const hasTokenHash = deviceColumns.some(
  (column) => column.name === "token_hash"
);

if (!hasTokenHash) {
  db.exec(`
    ALTER TABLE devices
    ADD COLUMN token_hash TEXT;
  `);

  console.log("Added token_hash column to devices table.");
}

const updatedDeviceColumns = db
  .prepare("PRAGMA table_info(devices)")
  .all();

const hasApproved = updatedDeviceColumns.some(
  (column) => column.name === "approved"
);

if (!hasApproved) {
  db.exec(`
    ALTER TABLE devices
    ADD COLUMN approved INTEGER NOT NULL DEFAULT 1;
  `);

  console.log("Added approved column to devices table.");
}

// Create server information if none exists.
const serverCount = db
  .prepare("SELECT COUNT(*) AS count FROM server_info")
  .get();

if (serverCount.count === 0) {
  db.prepare(`
    INSERT INTO server_info (
      id,
      server_name,
      school_name,
      location
    )
    VALUES (?, ?, ?, ?)
  `).run(
    1,
    "Arduino Lab Server",
    "Demo School",
    "Arduino Laboratory"
  );
}

// Create sample course if database is empty.
const courseCount = db
  .prepare("SELECT COUNT(*) AS count FROM courses")
  .get();

if (courseCount.count === 0) {
  const result = db.prepare(`
    INSERT INTO courses (
      title,
      description
    )
    VALUES (?, ?)
  `).run(
    "Arduino Fundamentals",
    "Introduction to Arduino programming and electronics."
  );

  const courseId = result.lastInsertRowid;

  const insertLesson = db.prepare(`
    INSERT INTO lessons (
      course_id,
      title,
      description,
      lesson_order
    )
    VALUES (?, ?, ?, ?)
  `);

  insertLesson.run(
    courseId,
    "Introduction to Arduino",
    "Learn what Arduino is and what it can be used for.",
    1
  );

  insertLesson.run(
    courseId,
    "Using the Arduino IDE",
    "Learn how to write, compile and upload Arduino programs.",
    2
  );

  insertLesson.run(
    courseId,
    "Variables and Data Types",
    "Introduction to variables and common Arduino data types.",
    3
  );

  console.log("Sample Arduino course created.");
}

// Create test video record if there are no videos yet.
const videoCount = db
  .prepare("SELECT COUNT(*) AS count FROM videos")
  .get();

if (videoCount.count === 0) {
  const firstLesson = db
    .prepare(`
      SELECT id
      FROM lessons
      ORDER BY lesson_order ASC
      LIMIT 1
    `)
    .get();

  if (firstLesson) {
    db.prepare(`
      INSERT INTO videos (
        lesson_id,
        title,
        filename,
        storage_path,
        allow_offline
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      firstLesson.id,
      "Introduction to Arduino",
      "test-video.mp4",
      "storage/videos/test-video.mp4",
      1
    );

    console.log("Test video record created.");
  }
}

const lesson2 = db.prepare(`
  SELECT id
  FROM lessons
  WHERE lesson_order = 2
  LIMIT 1
`).get();

const lesson3 = db.prepare(`
  SELECT id
  FROM lessons
  WHERE lesson_order = 3
  LIMIT 1
`).get();

if (lesson2) {
  const existingVideo2 = db.prepare(`
    SELECT id
    FROM videos
    WHERE lesson_id = ?
  `).get(lesson2.id);

  if (!existingVideo2) {
    db.prepare(`
      INSERT INTO videos (
        lesson_id,
        title,
        filename,
        storage_path,
        allow_offline
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      lesson2.id,
      "Using the Arduino IDE",
      "lesson-2.mp4",
      "storage/videos/lesson-2.mp4",
      1
    );

    console.log("Lesson 2 video added.");
  }
}

if (lesson3) {
  const existingVideo3 = db.prepare(`
    SELECT id
    FROM videos
    WHERE lesson_id = ?
  `).get(lesson3.id);

  if (!existingVideo3) {
    db.prepare(`
      INSERT INTO videos (
        lesson_id,
        title,
        filename,
        storage_path,
        allow_offline
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      lesson3.id,
      "Variables and Data Types",
      "lesson-3.mp4",
      "storage/videos/lesson-3.mp4",
      1
    );

    console.log("Lesson 3 video added.");
  }
}

console.log("SQLite database initialized.");

module.exports = db;