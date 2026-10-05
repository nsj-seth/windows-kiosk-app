const crypto = require("crypto");
const db = require("../config/database");

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function registerDevice(req, res) {
  try {
    const { deviceName } = req.body;

    if (
      !deviceName ||
      typeof deviceName !== "string" ||
      deviceName.trim().length < 2
    ) {
      return res.status(400).json({
        error: "A valid deviceName is required."
      });
    }

    const deviceUuid = crypto.randomUUID();
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const result = db.prepare(`
      INSERT INTO devices (
        device_uuid,
        device_name,
        token_hash,
        approved
      )
      VALUES (?, ?, ?, ?)
    `).run(
      deviceUuid,
      deviceName.trim(),
      tokenHash,
      0
    );

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      deviceId: deviceUuid,
      deviceName: deviceName.trim(),
      token: rawToken,
      status: "pending_approval"
    });

  } catch (error) {
    console.error("Unable to register device:", error);

    res.status(500).json({
      error: "Unable to register device."
    });
  }
}

function getCurrentDevice(req, res) {
  res.status(200).json(req.device);
}

module.exports = {
  registerDevice,
  getCurrentDevice
};