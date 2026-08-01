import fs from "fs";
import path from "path";

export const requireOwnership = (req, res, next) => {
  const sessionId = req.params.session_id || req.body.session_id;
  const ownerPath = path.join("server", "uploads", sessionId, "owner.json");

  if (!fs.existsSync(ownerPath)) {
    return res.status(404).json({ message: "Session not found" });
  }

  try {
    const { owner } = JSON.parse(fs.readFileSync(ownerPath, "utf-8"));
    if (owner !== req.user.username) {
      return res.status(403).json({ message: "Not your session" });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: "Failed to verify ownership" });
  }
};