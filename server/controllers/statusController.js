import fs from "fs";
import path from "path";

export const getStatus = (req, res) => {
  const { session_id } = req.params;
  const statusPath = path.join("server", "uploads", session_id, "status.json");

  if (!fs.existsSync(statusPath)) {
    return res.status(200).json({ stage: "not_started", percent: 0 });
  }

  try {
    const raw = fs.readFileSync(statusPath, "utf-8");
    const status = JSON.parse(raw);
    return res.status(200).json(status);
  } catch (err) {
    return res.status(500).json({ message: "Failed to read status" });
  }
};