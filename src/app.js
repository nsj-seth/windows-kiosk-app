const express = require("express");
const path = require("path");

const serverRoutes = require("./routes/server.routes");
const coursesRoutes = require("./routes/courses.routes");
const videosRoutes = require("./routes/videos.routes");
const devicesRoutes = require("./routes/devices.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.use(express.json());

app.use(express.static(
  path.join(__dirname, "../public")
));

app.get("/", (req, res) => {
  res.json({
    message: "Lab Content Server API"
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/admin.html")
  );
});

app.get("/client", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/client.html")
  );
});

app.use("/api/server", serverRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/admin", adminRoutes);

module.exports = app;