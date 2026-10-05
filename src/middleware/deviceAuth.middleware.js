const crypto = require("crypto");
const db = require("../config/database");

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function authenticateDevice(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Device authentication required."
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: "Invalid authorization format."
      });
    }

    const tokenHash = hashToken(token);

    const device = db.prepare(`
      SELECT
        id,
        device_uuid,
        device_name,
        status,
        approved,
        registered_at
      FROM devices
      WHERE token_hash = ?
    `).get(tokenHash);

    if (!device) {
      return res.status(401).json({
        error: "Invalid device token."
      });
    }

    if (!device.approved) {
      return res.status(403).json({
        error: "Device is awaiting administrator approval."
      });
    }

    if (device.status !== "active") {
      return res.status(403).json({
        error: "Device is disabled."
      });
    }

    db.prepare(`
      UPDATE devices
      SET last_seen_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(device.id);

    req.device = {
      id: device.id,
      deviceId: device.device_uuid,
      deviceName: device.device_name,
      status: device.status,
      approved: Boolean(device.approved)
    };

    next();

  } catch (error) {
    console.error("Device authentication error:", error);

    res.status(500).json({
      error: "Unable to authenticate device."
    });
  }
}

module.exports = authenticateDevice;