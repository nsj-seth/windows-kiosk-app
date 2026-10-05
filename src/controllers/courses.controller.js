const db = require("../config/database");

function getAllCourses(req, res) {
  try {
    const courses = db.prepare(`
      SELECT
        id,
        title,
        description,
        is_active,
        created_at
      FROM courses
      WHERE is_active = 1
      ORDER BY id ASC
    `).all();

    res.status(200).json(courses);
  } catch (error) {
    console.error("Unable to get courses:", error);

    res.status(500).json({
      error: "Unable to retrieve courses."
    });
  }
}

function getCourseById(req, res) {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        error: "Invalid course ID."
      });
    }

    const course = db.prepare(`
      SELECT
        id,
        title,
        description,
        is_active,
        created_at
      FROM courses
      WHERE id = ?
    `).get(courseId);

    if (!course) {
      return res.status(404).json({
        error: "Course not found."
      });
    }

    const lessons = db.prepare(`
      SELECT
        l.id AS lesson_id,
        l.title AS lesson_title,
        l.description AS lesson_description,
        l.lesson_order,

        v.id AS video_id,
        v.title AS video_title,
        v.filename,
        v.duration_seconds,
        v.allow_offline

      FROM lessons l

      LEFT JOIN videos v
        ON v.lesson_id = l.id

      WHERE l.course_id = ?

      ORDER BY l.lesson_order ASC
    `).all(courseId);

    const formattedLessons = lessons.map((lesson) => ({
      id: lesson.lesson_id,
      title: lesson.lesson_title,
      description: lesson.lesson_description,
      lessonOrder: lesson.lesson_order,

      video: lesson.video_id
        ? {
            id: lesson.video_id,
            title: lesson.video_title,
            filename: lesson.filename,
            durationSeconds: lesson.duration_seconds,
            allowOffline: Boolean(lesson.allow_offline),
            streamUrl: `/api/videos/${lesson.video_id}/stream`
          }
        : null
    }));

    res.status(200).json({
      id: course.id,
      title: course.title,
      description: course.description,
      isActive: Boolean(course.is_active),
      createdAt: course.created_at,
      lessons: formattedLessons
    });

  } catch (error) {
    console.error("Unable to get course:", error);

    res.status(500).json({
      error: "Unable to retrieve course."
    });
  }
}

module.exports = {
  getAllCourses,
  getCourseById
};