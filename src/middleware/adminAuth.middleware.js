function authenticateAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"];

  if (!adminKey) {
    return res.status(401).json({
      error: "Admin authentication required."
    });
  }

  if (!process.env.ADMIN_KEY) {
    console.error("ADMIN_KEY is not configured.");

    return res.status(500).json({
      error: "Server administrator authentication is not configured."
    });
  }

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      error: "Invalid administrator key."
    });
  }

  next();
}

module.exports = authenticateAdmin;